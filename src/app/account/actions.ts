"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { AnalyticsSnapshotModel } from "@/models/AnalyticsSnapshot";
import { ActivityCheckInModel } from "@/models/ActivityCheckIn";
import { WeeklyScheduleModel } from "@/models/WeeklySchedule";
import { UserModel } from "@/models/User";
import { deleteStudentAccount } from "@/lib/deleteStudentAccount";
import { updateStudentByAccountId } from "@/lib/studentRepository";
import { studentProfileSchema } from "@/lib/studentProfile";
import type { Student } from "@/lib/types";
import { ADMIN_RESTRICTED_ACTION_MESSAGE, isAdminUser } from "@/lib/accessControl";

export async function updateStudentProfile(input: Student) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const studentFields = studentProfileSchema.parse(input);

  const updated = await updateStudentByAccountId(session.user.id, studentFields);

  if (!updated) {
    redirect("/onboarding");
  }

  if (isAdminUser(session.user)) revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function deleteAccount(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  if (isAdminUser(session.user)) {
    throw new Error(ADMIN_RESTRICTED_ACTION_MESSAGE);
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
