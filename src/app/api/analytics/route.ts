import { z } from "zod";
import { requireCurrentAdmin } from "@/lib/requireAdmin";
import { NextRequest, NextResponse } from "next/server";
import { studentSideClock } from "@/lib/studentClock";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { AnalyticsSnapshotModel } from "@/models/AnalyticsSnapshot";
import { snapshotWeekOptions, prepareApprovedSnapshot, SnapshotApprovalError } from "@/lib/analyticsSnapshots";

// Always writes the logged-in student's own snapshot — no id in the URL.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid analytics upload." }, { status: 422 });
  }

  const source = z.object({ extraction: z.object({ source: z.string() }) }).safeParse(body);
  const isSample = source.success && source.data.extraction.source === "admin_sample";
  if (isSample) {
    try { await requireCurrentAdmin(); }
    catch { return NextResponse.json({ error: "Admin access required for sample analytics." }, { status: 403 }); }
  }

  await connectDB();
  const student = await StudentModel.findOne({ userId: session.user.id });
  if (!student) {
    return NextResponse.json({ error: "Complete onboarding first" }, { status: 404 });
  }

  const clock = await studentSideClock(session.user);
  try {
    await AnalyticsSnapshotModel.create({
      studentId: student._id,
      ...prepareApprovedSnapshot(body, clock.now, clock.real, { allowAdminSample: isSample, ...snapshotWeekOptions(clock) }),
    });
  } catch (error) {
    if (error instanceof SnapshotApprovalError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
