"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import type { AnalyticsExtractedRow, Student } from "@/lib/types";

export async function updateStudentProfile(input: Student & { analyticsRows: AnalyticsExtractedRow[] }) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  await connectDB();
  // input.analyticsRows isn't part of the Student schema — Mongoose's
  // default strict mode silently drops it, so it's fine to pass through.
  const updated = await StudentModel.findOneAndUpdate({ userId: session.user.id }, input);

  if (!updated) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}
