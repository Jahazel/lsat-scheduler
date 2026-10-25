import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { scanWithLimits } from "@/lib/scanGuard";
import { extractPracticeTestSection } from "@/lib/screenshotExtractor";
import { readScreenshotForm } from "@/lib/screenshotRequest";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const read = await readScreenshotForm(request);
  if ("refusal" in read) return read.refusal;

  return scanWithLimits(session.user.id, async () => ({
    reading: await extractPracticeTestSection(read.screenshot.bytes, read.screenshot.mediaType),
  }));
}
