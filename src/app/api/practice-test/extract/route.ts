import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { extractPracticeTestSection } from "@/lib/screenshotExtractor";
import { readScreenshotForm } from "@/lib/screenshotRequest";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const read = await readScreenshotForm(request);
  if ("refusal" in read) return read.refusal;

  try {
    return NextResponse.json({ reading: await extractPracticeTestSection(read.screenshot.bytes, read.screenshot.mediaType) });
  } catch {
    return NextResponse.json({ error: "Couldn't read that screenshot" }, { status: 502 });
  }
}
