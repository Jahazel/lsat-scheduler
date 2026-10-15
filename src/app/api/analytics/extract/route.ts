import { NextRequest, NextResponse } from "next/server";
import { extractAnalyticsRows } from "@/lib/screenshotExtractor";
import { mockRules } from "@/lib/mockData";

// The uploaded image is only ever used here, in memory, to send to Claude —
// it's never written to disk or a database. Not scoped to a student:
// extraction doesn't touch any student data, so this also works during
// intake, before a student record exists yet.
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const rows = await extractAnalyticsRows(buffer, file.type, mockRules);
    return NextResponse.json({ rows });
  } catch {
    return NextResponse.json({ error: "Couldn't read that screenshot" }, { status: 502 });
  }
}
