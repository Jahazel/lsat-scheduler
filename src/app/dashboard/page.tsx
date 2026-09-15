import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { loadOrGenerateCurrentWeek } from "@/lib/currentWeeklySchedule";
import { mockRules } from "@/lib/mockData";
import { mongooseCurrentWeekRepositories } from "@/lib/weeklyScheduleRepository";
import { mongooseActivityCheckIns } from "@/lib/activityCheckInRepository";
import type { Student } from "@/lib/types";
import ScheduleCheckInView from "@/components/ScheduleCheckInView";
import AnalyticsUploader from "./AnalyticsUploader";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role === "admin") {
    redirect("/admin");
  }

  await connectDB();
  const doc = await StudentModel.findOne({ userId: session.user.id }).lean();
  if (!doc) {
    redirect("/onboarding");
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
  const checkIns = currentWeek.kind === "schedule"
    ? await mongooseActivityCheckIns.listForSchedule(currentWeek.schedule.id)
    : [];

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl">
        {currentWeek.kind === "schedule" ? (() => {
          const schedule = currentWeek.schedule;
          return <ScheduleCheckInView
            scheduleId={schedule.id}
            schedule={schedule.schedule}
            student={schedule.generationInputs.student}
            checkIns={checkIns}
          />;
        })() : (
          <div className="rounded-lg border border-ink-100 bg-white p-6">
            <h1 className="text-xl font-semibold tracking-tight text-ink-900">Upload approved analytics to begin</h1>
            <p className="mt-2 text-sm text-ink-500">
              Confirm a fresh 7Sage analytics extraction to create this week&apos;s schedule.
            </p>
            {student.platform === "7Sage" && <AnalyticsUploader />}
          </div>
        )}
      </div>
    </div>
  );
}
