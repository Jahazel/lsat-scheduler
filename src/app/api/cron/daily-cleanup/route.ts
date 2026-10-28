import { NextRequest, NextResponse } from "next/server";
import { isCronRequestAuthorized, runDailyCleanup } from "@/lib/dailyCleanup";
import { recordUnexpectedFailure } from "@/lib/securityLog";

// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` on each daily run.
export async function GET(request: NextRequest) {
  if (!isCronRequestAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runDailyCleanup());
  } catch (error) {
    return NextResponse.json(await recordUnexpectedFailure("/api/cron/daily-cleanup", error), { status: 500 });
  }
}
