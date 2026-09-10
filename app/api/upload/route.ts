import { NextRequest, NextResponse } from "next/server";
import { processUpload, executeJob, hasConverter } from "@/lib/processing";
import { checkRateLimit, applyRateLimitHeaders, getToolUploadPolicy } from "@/lib/rate-limit";
import { logger, generateRequestId, createChildLogger } from "@/lib/logger";

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

  try {
    const contentType = request.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const toolId = formData.get("toolId") as string | null;

    if (!toolId) {
      return NextResponse.json(
        { error: "Missing toolId field" },
        { status: 400 }
      );
    }

    const policy = getToolUploadPolicy(toolId);
    const rateLimit = checkRateLimit(`upload:${ip}`, policy);

    if (!rateLimit.allowed) {
      reqLog.warn("rate_limited", { event: "upload", ip, toolId, limit: rateLimit.limit });
      const rateLimitHeaders: Record<string, string> = {};
      applyRateLimitHeaders({ setHeader: (k: string, v: string) => (rateLimitHeaders[k] = v) }, rateLimit);
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { ...rateLimitHeaders, "X-Request-ID": requestId } }
      );
    }

    if (!hasConverter(toolId)) {
      return NextResponse.json(
        { error: `Tool "${toolId}" is not yet supported.` },
        { status: 400 }
      );
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
    return NextResponse.json({
      jobId: job.id,
      files: fileInfos,
    }, { status: 201, headers: successHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";

    if (message.includes("No files provided") || message.includes("Too many files")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (
      message.includes("exceeds maximum") ||
      message.includes("File is empty") ||
      message.includes("does not match declared type") ||
      message.includes("not in the allowed list") ||
      message.includes("declares MIME type") ||
      message.includes("has no extension")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    reqLog.error("upload_error", { ip, error: message });
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: { "X-Request-ID": requestId } });
  }
}
