import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { loadOrGenerateCurrentWeek } from "@/lib/currentWeeklySchedule";
import { mockRules } from "@/lib/mockData";
import { mongooseCurrentWeekRepositories } from "@/lib/weeklyScheduleRepository";
import type { Student } from "@/lib/types";
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

  const currentWeek = await loadOrGenerateCurrentWeek({
    ...mongooseCurrentWeekRepositories,
    studentId: String(doc._id),
    student,
    studentName: session.user.name ?? "Your",
    rules: mockRules,
    policyVersion: "adaptive-weekly-schedule-v1",
    timezone: "America/Chicago",
    now: () => new Date(),
  });

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl">
        {currentWeek.kind === "schedule" ? (
          <WeeklyScheduleView
            schedule={currentWeek.schedule.schedule}
            student={currentWeek.schedule.generationInputs.student}
            isRealAnalytics
          />
        ) : (
          <div className="rounded-lg border border-ink-100 bg-white p-6">
            <h1 className="text-xl font-semibold tracking-tight text-ink-900">Upload approved analytics to begin</h1>
            <p className="mt-2 text-sm text-ink-500">
              Confirm a fresh 7Sage analytics extraction to create this week&apos;s schedule.
            </p>
          </div>
        )}
        {student.platform === "7Sage" && <AnalyticsUploader />}
      </div>
    </div>
  );
}
