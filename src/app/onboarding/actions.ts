"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { AnalyticsSnapshotModel } from "@/models/AnalyticsSnapshot";
import { summarizeAnalyticsRows } from "@/lib/analytics";
import type { AnalyticsExtractedRow, Student } from "@/lib/types";

export async function createStudentProfile(input: Student & { analyticsRows: AnalyticsExtractedRow[] }) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  await connectDB();

  const existing = await StudentModel.findOne({ userId: session.user.id });
  if (existing) {
    redirect("/dashboard");
  }

  const { analyticsRows, ...studentFields } = input;
  const student = await StudentModel.create({ userId: session.user.id, ...studentFields });

  if (analyticsRows.length > 0) {
    await AnalyticsSnapshotModel.create({
      studentId: student._id,
      weekOf: new Date().toISOString().slice(0, 10),
      ...summarizeAnalyticsRows(analyticsRows),
    });
  }

  redirect("/dashboard");
}
