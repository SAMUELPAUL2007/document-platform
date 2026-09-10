import { NextResponse } from "next/server";
import { checkDependencies } from "@/lib/startup-checks";
import { generateRequestId } from "@/lib/logger";

export async function GET() {
  const requestId = generateRequestId();

  try {
    const dependencies = await checkDependencies();
    const allHealthy = dependencies.every((d) => d.available);

    return NextResponse.json(
      {
        status: allHealthy ? "ok" : "degraded",
        timestamp: Date.now(),
        dependencies: dependencies.map((d) => ({
          name: d.name,
          available: d.available,
        })),
      },
      {
        status: allHealthy ? 200 : 503,
        headers: { "X-Request-ID": requestId },
      }
    );
  } catch {
    return NextResponse.json(
      { status: "error", timestamp: Date.now() },
      { status: 503, headers: { "X-Request-ID": requestId } }
    );
  }
}
