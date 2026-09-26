import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { ADMIN_RESTRICTED_ACTION_MESSAGE, isAdminUser } from "@/lib/accessControl";
import { StudentModel } from "@/models/Student";
import { WeeklyScheduleModel } from "@/models/WeeklySchedule";
import { ActivityCheckInModel } from "@/models/ActivityCheckIn";
import { AnalyticsSnapshotModel } from "@/models/AnalyticsSnapshot";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isAdminUser(session.user)) return NextResponse.json({ error: ADMIN_RESTRICTED_ACTION_MESSAGE }, { status: 403 });

  await connectDB();
  const student = await StudentModel.findOne({ userId: session.user.id }).lean();
  if (!student) return NextResponse.json({ error: "Complete onboarding first" }, { status: 404 });

  const schedules = await WeeklyScheduleModel.find({ studentId: student._id }, { _id: 1 }).lean();
  const scheduleIds = schedules.map((schedule) => schedule._id);
  if (scheduleIds.length > 0) {
    await ActivityCheckInModel.deleteMany({ scheduleId: { $in: scheduleIds } });
  }
  await WeeklyScheduleModel.deleteMany({ studentId: student._id });
  await AnalyticsSnapshotModel.deleteMany({ studentId: student._id });

  return NextResponse.json({ ok: true });
}
