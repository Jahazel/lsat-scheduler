import { NextRequest, NextResponse } from "next/server";
import { extractAnalyticsRows } from "@/lib/screenshotExtractor";
import { mockRules } from "@/lib/mockData";
import { readScreenshot, type ScreenshotRejection } from "@/lib/screenshotUpload";

function rejected({ reason, message }: ScreenshotRejection) {
  return NextResponse.json({ error: message, reason }, { status: reason === "too-large" ? 413 : 415 });
}

// The uploaded image is only ever used here, in memory, for extraction —
// it's never written to disk or a database. Not scoped to a student:
// extraction doesn't touch any student data, so this also works during
// intake, before a student record exists yet.
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const screenshot = await readScreenshot(file);
  if ("reason" in screenshot) return rejected(screenshot);

  try {
    const rows = await extractAnalyticsRows(screenshot.bytes, screenshot.mediaType, mockRules);
    return NextResponse.json({ rows });
  } catch {
    return NextResponse.json({ error: "Couldn't read that screenshot" }, { status: 502 });
  }
}
