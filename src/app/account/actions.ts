"use server";

import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { AnalyticsSnapshotModel } from "@/models/AnalyticsSnapshot";
import { ActivityCheckInModel } from "@/models/ActivityCheckIn";
import { WeeklyScheduleModel } from "@/models/WeeklySchedule";
import { UserModel } from "@/models/User";
import { deleteStudentAccount } from "@/lib/deleteStudentAccount";
import type { AnalyticsExtractedRow, Student } from "@/lib/types";
import type { SnapshotApprovalMetadata } from "@/lib/analyticsSnapshots";
import { ADMIN_READ_ONLY_MESSAGE, isAdminUser } from "@/lib/accessControl";

export async function updateStudentProfile(
  input: Student & { analyticsRows: AnalyticsExtractedRow[]; analyticsApproval: SnapshotApprovalMetadata | null }
) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  await connectDB();
  // Analytics fields aren't part of the Student schema — Mongoose's
  // default strict mode silently drops it, so it's fine to pass through.
  const { analyticsRows, analyticsApproval, ...studentFields } = input;
  void analyticsRows;
  void analyticsApproval;
  const updated = await StudentModel.findOneAndUpdate({ userId: session.user.id }, studentFields);

  if (!updated) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}

export async function deleteAccount(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  if (isAdminUser(session.user)) {
    throw new Error(ADMIN_READ_ONLY_MESSAGE);
  }
  if (formData.get("confirmation") !== "DELETE") {
    throw new Error("Type DELETE to confirm account deletion.");
  }

  await connectDB();
  const student = await StudentModel.findOne({ userId: session.user.id });
  if (student) {
    const studentId = String(student._id);
    await deleteStudentAccount({ studentId, userId: session.user.id }, {
      deleteAnalytics: async (id) => { await AnalyticsSnapshotModel.deleteMany({ studentId: id }); },
      listScheduleIds: async (id) => {
        const schedules = await WeeklyScheduleModel.find({ studentId: id }).select("_id").lean();
        return schedules.map((schedule) => String(schedule._id));
      },
      deleteCheckIns: async (scheduleIds) => { await ActivityCheckInModel.deleteMany({ scheduleId: { $in: scheduleIds } }); },
      deleteSchedules: async (id) => { await WeeklyScheduleModel.deleteMany({ studentId: id }); },
      deleteStudent: async (id) => { await StudentModel.deleteOne({ _id: id }); },
      deleteUser: async (id) => { await UserModel.deleteOne({ _id: id }); },
    });
  } else {
    await UserModel.deleteOne({ _id: session.user.id });
  }
  await signOut({ redirectTo: "/" });
}
