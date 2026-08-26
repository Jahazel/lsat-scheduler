import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { AnalyticsSnapshotModel } from "@/models/AnalyticsSnapshot";

// Always writes the logged-in student's own snapshot — no id in the URL.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const student = await StudentModel.findOne({ userId: session.user.id });
  if (!student) {
    return NextResponse.json({ error: "Complete onboarding first" }, { status: 404 });
  }

  const body = await request.json();

  await AnalyticsSnapshotModel.findOneAndUpdate(
    { studentId: student._id },
    {
      studentId: student._id,
      weekOf: new Date().toISOString().slice(0, 10),
      lrAccuracyByType: body.lrAccuracyByType,
      lrTopPriorityLogicTypes: body.lrTopPriorityLogicTypes,
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true });
}
