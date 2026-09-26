"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { AnalyticsSnapshotModel } from "@/models/AnalyticsSnapshot";
import { summarizeAnalyticsRows } from "@/lib/analytics";
import { prepareApprovedSnapshot, type SnapshotApprovalMetadata } from "@/lib/analyticsSnapshots";
import { studentProfileSchema } from "@/lib/studentProfile";
import type { AnalyticsExtractedRow, Student } from "@/lib/types";

export async function createStudentProfile(
  input: Student & { analyticsRows: AnalyticsExtractedRow[]; analyticsApproval: SnapshotApprovalMetadata | null }
) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const { analyticsRows, analyticsApproval, ...profile } = input;
  const studentFields = studentProfileSchema.parse(profile);

  await connectDB();

  const existing = await StudentModel.findOne({ userId: session.user.id });
  if (existing) {
    redirect("/dashboard");
  }

  const approvedSnapshot =
    analyticsRows.length > 0 && analyticsApproval
      ? prepareApprovedSnapshot({ ...summarizeAnalyticsRows(analyticsRows), ...analyticsApproval })
      : null;
  const student = await StudentModel.create({ userId: session.user.id, ...studentFields });

  if (approvedSnapshot) {
    await AnalyticsSnapshotModel.create({
      studentId: student._id,
      ...approvedSnapshot,
    });
  }

  redirect("/dashboard");
}
