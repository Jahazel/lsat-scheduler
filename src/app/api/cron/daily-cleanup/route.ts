import { NextRequest, NextResponse } from "next/server";
import { isCronRequestAuthorized, runDailyCleanup } from "@/lib/dailyCleanup";

// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` on each daily run.
export async function GET(request: NextRequest) {
  if (!isCronRequestAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  return NextResponse.json(await runDailyCleanup());
}
