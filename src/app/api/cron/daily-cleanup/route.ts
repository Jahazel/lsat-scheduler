import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isCronRequestAuthorized, runDailyCleanup } from "@/lib/dailyCleanup";

// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` on each daily run.
export async function GET(request: NextRequest) {
  if (!isCronRequestAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runDailyCleanup());
  } catch (error) {
    const code = randomUUID().slice(0, 8);
    console.error(`Daily cleanup failed (${code}): ${error instanceof Error ? error.name : "unknown error"}`);
    return NextResponse.json({ error: "Something went wrong. Try again.", code }, { status: 500 });
  }
}
