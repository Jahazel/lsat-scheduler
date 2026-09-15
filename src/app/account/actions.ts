"use server";

import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { AnalyticsSnapshotModel } from "@/models/AnalyticsSnapshot";
import { UserModel } from "@/models/User";
import type { AnalyticsExtractedRow, Student } from "@/lib/types";
import type { SnapshotApprovalMetadata } from "@/lib/analyticsSnapshots";

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
  if (formData.get("confirmation") !== "DELETE") {
    throw new Error("Type DELETE to confirm account deletion.");
  }

  await connectDB();
  const student = await StudentModel.findOne({ userId: session.user.id });
  if (student) {
    await AnalyticsSnapshotModel.deleteMany({ studentId: student._id });
    await StudentModel.deleteOne({ _id: student._id });
  }
  await UserModel.deleteOne({ _id: session.user.id });
  await signOut({ redirectTo: "/" });
}
