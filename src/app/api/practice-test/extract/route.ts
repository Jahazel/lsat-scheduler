import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { extractPracticeTestSection } from "@/lib/screenshotExtractor";
import { readScreenshot, rejectionStatus } from "@/lib/screenshotUpload";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const file = (await request.formData()).get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const screenshot = await readScreenshot(file);
  if ("reason" in screenshot) {
    return NextResponse.json({ error: screenshot.message, reason: screenshot.reason }, { status: rejectionStatus(screenshot) });
  }

  try {
    return NextResponse.json({ reading: await extractPracticeTestSection(screenshot.bytes, screenshot.mediaType) });
  } catch {
    return NextResponse.json({ error: "Couldn't read that screenshot" }, { status: 502 });
  }
}
