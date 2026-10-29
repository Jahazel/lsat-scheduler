import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { extractAnalyticsRows } from "@/lib/screenshotExtractor";
import { mockRules } from "@/lib/mockData";
import { scanWithLimits } from "@/lib/scanGuard";
import { readScreenshotForm } from "@/lib/screenshotRequest";
import { answerRequest } from "@/lib/securityLog";

export async function POST(request: NextRequest) {
  return answerRequest("/api/analytics/extract", async () => {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const read = await readScreenshotForm(request);
    if ("refusal" in read) return read.refusal;
    const section = read.form.get("section");
    if (section !== "LR" && section !== "RC") {
      return NextResponse.json({ error: "Say which section the screenshot shows: LR or RC" }, { status: 400 });
    }

    return scanWithLimits(session.user.id, "analytics", (recordCost) =>
      extractAnalyticsRows(read.screenshot.bytes, read.screenshot.mediaType, mockRules, section, recordCost));
  });
}
