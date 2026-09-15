import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { listApprovedAnalyticsSnapshots } from "@/lib/analyticsSnapshotRepository";
import { generateWeek } from "@/lib/engine";
import { mockAnalytics, mockRules } from "@/lib/mockData";
import type { AnalyticsSnapshot, Student } from "@/lib/types";
import WeeklyScheduleView from "@/components/WeeklyScheduleView";
import AnalyticsUploader from "./AnalyticsUploader";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  await connectDB();
  const doc = await StudentModel.findOne({ userId: session.user.id }).lean();
  if (!doc) {
    redirect(session.user.role === "admin" ? "/admin" : "/onboarding");
  }

  const student: Student = {
    platform: doc.platform,
    currentScore: doc.currentScore,
    goalScore: doc.goalScore,
    weekdayHours: doc.weekdayHours,
    weekendHours: doc.weekendHours,
    accommodationMultiplier: doc.accommodationMultiplier,
    goalTestDate: doc.goalTestDate,
  };

  const [snapshotDoc] = await listApprovedAnalyticsSnapshots(doc._id);
  const analytics: AnalyticsSnapshot = snapshotDoc
    ? {
        weekOf: snapshotDoc.weekOf,
        lrAccuracyByType: snapshotDoc.lrAccuracyByType,
        lrTopPriorityLogicTypes: snapshotDoc.lrTopPriorityLogicTypes,
      }
    : mockAnalytics;
  const isRealAnalytics = Boolean(snapshotDoc);

  const schedule = generateWeek(student, analytics, mockRules, session.user.name ?? "Your");

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <WeeklyScheduleView schedule={schedule} student={student} isRealAnalytics={isRealAnalytics} />
        {student.platform === "7Sage" && <AnalyticsUploader />}
      </div>
    </div>
  );
}
