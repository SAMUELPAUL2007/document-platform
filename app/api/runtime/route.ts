import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    nodeVersion: process.version,
    promiseWithResolvers: typeof Promise.withResolvers,
    platform: process.platform,
    arch: process.arch,
  });
}
