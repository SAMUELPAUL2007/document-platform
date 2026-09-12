import { NextRequest, NextResponse } from "next/server";
import { processUpload, executeJob, hasConverter } from "@/lib/processing";
import { checkRateLimit, applyRateLimitHeaders, getToolUploadPolicy } from "@/lib/rate-limit";
import { logger, generateRequestId, createChildLogger } from "@/lib/logger";

function setSecurityHeaders(headers: Headers) {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const reqLog = createChildLogger(requestId);
  const ip = getClientIp(request);
  let toolId: string | null = null;

  try {
    const contentType = request.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      const res = NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 }
      );
      setSecurityHeaders(res.headers);
      return res;
    }

    const formData = await request.formData();
    toolId = formData.get("toolId") as string | null;

    if (!toolId) {
      const res = NextResponse.json(
        { error: "Missing toolId field" },
        { status: 400 }
      );
      setSecurityHeaders(res.headers);
      return res;
    }

    const policy = getToolUploadPolicy(toolId);
    const rateLimit = checkRateLimit(`upload:${ip}`, policy);

    if (!rateLimit.allowed) {
      reqLog.warn("rate_limited", { event: "upload", ip, toolId, limit: rateLimit.limit });
      const rateLimitHeaders: Record<string, string> = {};
      applyRateLimitHeaders({ setHeader: (k: string, v: string) => (rateLimitHeaders[k] = v) }, rateLimit);
      const res = NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { ...rateLimitHeaders, "X-Request-ID": requestId } }
      );
      setSecurityHeaders(res.headers);
      return res;
    }

    if (!hasConverter(toolId)) {
      const res = NextResponse.json(
        { error: `Tool "${toolId}" is not yet supported.` },
        { status: 400 }
      );
      setSecurityHeaders(res.headers);
      return res;
    }

    const options: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (key !== "files" && key !== "toolId" && typeof value === "string") {
        options[key] = value;
      }
    }

    const { job, fileInfos } = await processUpload(toolId, formData, options);

    reqLog.info("job_created", { jobId: job.id, toolId, ip, fileCount: fileInfos.length });

    executeJob(job.id).catch((err) => {
      reqLog.error("job_execution_failed", { jobId: job.id, toolId, error: err instanceof Error ? err.message : "unknown" });
    });

    const successHeaders: Record<string, string> = { "X-Request-ID": requestId };
    applyRateLimitHeaders({ setHeader: (k: string, v: string) => (successHeaders[k] = v) }, rateLimit);
    const res = NextResponse.json({
      jobId: job.id,
      files: fileInfos,
    }, { status: 201, headers: successHeaders });
    setSecurityHeaders(res.headers);
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    const stack = error instanceof Error ? error.stack : undefined;

    if (message.includes("No files provided") || message.includes("Too many files")) {
      const res = NextResponse.json({ error: message }, { status: 400 });
      setSecurityHeaders(res.headers);
      return res;
    }

    if (
      message.includes("exceeds maximum") ||
      message.includes("File is empty") ||
      message.includes("does not match declared type") ||
      message.includes("not in the allowed list") ||
      message.includes("declares MIME type") ||
      message.includes("has no extension")
    ) {
      const res = NextResponse.json({ error: message }, { status: 400 });
      setSecurityHeaders(res.headers);
      return res;
    }

    reqLog.error("upload_error_unhandled", { ip, toolId, error: message, stack: stack?.slice(0, 500) });
    const res = NextResponse.json({ error: "Internal server error" }, { status: 500, headers: { "X-Request-ID": requestId } });
    setSecurityHeaders(res.headers);
    return res;
  }
}
