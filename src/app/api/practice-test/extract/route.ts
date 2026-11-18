import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminUser } from "@/lib/accessControl";
import { refuseLabRead, scanWithLimits } from "@/lib/scanGuard";
import { extractPracticeTestSection } from "@/lib/screenshotExtractor";
import { readScreenshotForm } from "@/lib/screenshotRequest";
import { answerRequest } from "@/lib/securityLog";
import { loadAccountPlan } from "@/lib/billingRepository";
import { mayStartWeeklyUpload, PLAN_REFUSAL } from "@/lib/planStatus";

export async function POST(request: NextRequest) {
  return answerRequest("/api/practice-test/extract", async () => {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    const lab = request.nextUrl.searchParams.get("for") === "lab";
    if (lab && !isAdminUser(session.user)) return refuseLabRead(session.user.id, "practice-test-section");
    if (!lab && !mayStartWeeklyUpload((await loadAccountPlan(session.user.id)).status)) {
      return NextResponse.json({ error: PLAN_REFUSAL }, { status: 402 });
    }

    const read = await readScreenshotForm(request);
    if ("refusal" in read) return read.refusal;

    return scanWithLimits(session.user.id, "practice-test-section", async (recordCost) => ({
      reading: await extractPracticeTestSection(read.screenshot.bytes, read.screenshot.mediaType, recordCost),
    }), lab ? "lab" : "student");
  });
}
