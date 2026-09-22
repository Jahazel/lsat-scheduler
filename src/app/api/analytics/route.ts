import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { AnalyticsSnapshotModel } from "@/models/AnalyticsSnapshot";
import { prepareApprovedSnapshot, SnapshotApprovalError } from "@/lib/analyticsSnapshots";
import { ADMIN_READ_ONLY_MESSAGE, isAdminUser } from "@/lib/accessControl";

// Always writes the logged-in student's own snapshot — no id in the URL.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isAdminUser(session.user)) {
    return NextResponse.json({ error: ADMIN_READ_ONLY_MESSAGE }, { status: 403 });
  }

  await connectDB();
  const student = await StudentModel.findOne({ userId: session.user.id });
  if (!student) {
    return NextResponse.json({ error: "Complete onboarding first" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid analytics upload." }, { status: 422 });
  }

  try {
    await AnalyticsSnapshotModel.create({
      studentId: student._id,
      ...prepareApprovedSnapshot(body, new Date()),
    });
  } catch (error) {
    if (error instanceof SnapshotApprovalError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
