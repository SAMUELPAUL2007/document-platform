import { NextRequest, NextResponse } from "next/server";
import { getJobStatus, cancelJob } from "@/lib/processing";
import type { JobStatusResponse } from "@/lib/processing";
import { checkRateLimit, applyRateLimitHeaders, getJobStatusPolicy } from "@/lib/rate-limit";
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

    const jobStatusPolicy = getJobStatusPolicy();
    const rateLimit = checkRateLimit(`job-status:${ip}`, jobStatusPolicy);
    if (!rateLimit.allowed) {
      reqLog.warn("rate_limited", { event: "job_status", ip, jobId });
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

    const response: JobStatusResponse = {
      jobId: job.id,
      state: job.state,
      error: job.error,
      resultFileId: job.resultFileId,
      resultFileName: job.resultFileName,
      duration: job.duration,
    };

    if (job.progress) {
      response.progress = job.progress;
    } else if (job.state === "COMPLETED") {
      response.progress = { percent: 100, stage: "complete" };
    } else if (job.state === "QUEUED") {
      response.progress = { percent: 0, stage: "queued" };
    } else if (job.state === "PROCESSING") {
      response.progress = { percent: 10, stage: "processing" };
    }

    const successHeaders: Record<string, string> = { "X-Request-ID": requestId };
    applyRateLimitHeaders({ setHeader: (k: string, v: string) => (successHeaders[k] = v) }, rateLimit);
    return NextResponse.json(response, { headers: successHeaders });
  } catch (error) {
    reqLog.error("job_status_error", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: { "X-Request-ID": requestId } }
    );
  }
}

export async function DELETE(
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

    const jobStatusPolicy = getJobStatusPolicy();
    const rateLimit = checkRateLimit(`job-cancel:${ip}`, jobStatusPolicy);
    if (!rateLimit.allowed) {
      reqLog.warn("rate_limited", { event: "job_cancel", ip, jobId });
      const rateLimitHeaders: Record<string, string> = {};
      applyRateLimitHeaders({ setHeader: (k: string, v: string) => (rateLimitHeaders[k] = v) }, rateLimit);
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { ...rateLimitHeaders, "X-Request-ID": requestId } }
      );
    }

    const result = cancelJob(jobId);

    if (result.success) {
      reqLog.info("job_cancelled", { jobId });
    }

    if (!result.success && result.message === "Job not found") {
      return NextResponse.json({ error: result.message }, { status: 404, headers: { "X-Request-ID": requestId } });
    }

    const successHeaders: Record<string, string> = { "X-Request-ID": requestId };
    applyRateLimitHeaders({ setHeader: (k: string, v: string) => (successHeaders[k] = v) }, rateLimit);
    return NextResponse.json({ message: result.message }, { headers: successHeaders });
  } catch (error) {
    reqLog.error("job_cancellation_error", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: { "X-Request-ID": requestId } }
    );
  }
}
