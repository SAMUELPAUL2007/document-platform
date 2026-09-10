import { NextRequest, NextResponse } from "next/server";
import { getJobStatus } from "@/lib/processing";
import { getResultBuffer } from "@/lib/processing/file-store";
import { checkRateLimit, applyRateLimitHeaders, getDownloadPolicy } from "@/lib/rate-limit";
import { logger, generateRequestId, createChildLogger } from "@/lib/logger";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const requestId = generateRequestId();
  const reqLog = createChildLogger(requestId);

  try {
    const { jobId } = await params;
    const ip = getClientIp(request);

    if (!jobId || !/^[0-9a-f-]{36}$/i.test(jobId)) {
      return NextResponse.json(
        { error: "Invalid job ID format" },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    const policy = getDownloadPolicy();
    const rateLimit = checkRateLimit(`download:${ip}`, policy);
    if (!rateLimit.allowed) {
      reqLog.warn("rate_limited", { event: "download", ip, jobId });
      const rateLimitHeaders: Record<string, string> = {};
      applyRateLimitHeaders({ setHeader: (k: string, v: string) => (rateLimitHeaders[k] = v) }, rateLimit);
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { ...rateLimitHeaders, "X-Request-ID": requestId } }
      );
    }

    const job = await getJobStatus(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404, headers: { "X-Request-ID": requestId } }
      );
    }

    if (job.state !== "COMPLETED") {
      return NextResponse.json(
        { error: "Job is not completed yet" },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    if (!job.resultFileId || !job.resultFileName || !job.resultMimeType) {
      return NextResponse.json(
        { error: "No result file available" },
        { status: 404, headers: { "X-Request-ID": requestId } }
      );
    }

    const buffer = await getResultBuffer(jobId, job.resultFileId, job.resultFileName);

    if (!buffer) {
      return NextResponse.json(
        { error: "Result file not found on disk" },
        { status: 404, headers: { "X-Request-ID": requestId } }
      );
    }

    reqLog.info("download", { jobId, toolId: job.toolId, size: buffer.length });

    const rawName = job.resultFileName || "result";
    const asciiName = rawName
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/["\\]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/^_+|_+$/g, "")
      || "result";
    const encodedName = encodeURIComponent(rawName).replace(/['()]/g, escape);

    const successHeaders: Record<string, string> = { "X-Request-ID": requestId };
    applyRateLimitHeaders({ setHeader: (k: string, v: string) => (successHeaders[k] = v) }, rateLimit);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": job.resultMimeType,
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
        ...successHeaders,
      },
    });
  } catch (error) {
    reqLog.error("download_error", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json(
      { error: "Download failed" },
      { status: 500, headers: { "X-Request-ID": requestId } }
    );
  }
}
