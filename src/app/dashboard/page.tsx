import { isAdminUser } from "@/lib/accessControl";
import { studentSideNow } from "@/lib/studentClock";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { currentWeekInTimezone, loadOrGenerateCurrentWeek } from "@/lib/currentWeeklySchedule";
import { mockRules } from "@/lib/mockData";
import { mongooseCurrentWeekRepositories } from "@/lib/weeklyScheduleRepository";
import { mongooseActivityCheckIns } from "@/lib/activityCheckInRepository";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import type { Student } from "@/lib/types";
import ScheduleCheckInView from "@/components/ScheduleCheckInView";
import AnalyticsUploader from "./AnalyticsUploader";
import { SampleReviewSlot } from "@/components/AdminTestContext";

type DashboardSearchParams = { historyWeek?: string | string[] };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const { historyWeek } = await searchParams;
  // Past weeks moved to Progress; keep old deep links working.
  const pastWeek = Array.isArray(historyWeek) ? historyWeek[0] : historyWeek;
  if (pastWeek) redirect(`/progress?week=${encodeURIComponent(pastWeek)}`);
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
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
    dailyCapacityMinutes: doc.dailyCapacityMinutes,
    preferredPracticeTestDay: doc.preferredPracticeTestDay,
    accommodationMultiplier: doc.accommodationMultiplier,
    goalTestDate: doc.goalTestDate,
  };

  const realNow = new Date();
  const now = await studentSideNow(session.user, realNow);
  const currentWeek = await loadOrGenerateCurrentWeek({
    ...mongooseCurrentWeekRepositories,
    activityCheckIns: {
      ...mongooseActivityCheckIns,
      ensureForSchedule: (schedule) => mongooseActivityCheckIns.ensureForSchedule(
        schedule, now !== realNow ? new Date(schedule.generatedAt) : undefined,
      ),
    },
    studentId: String(doc._id),
    student,
    studentName: session.user.name ?? "Your",
    rules: mockRules,
    timezone: SCHEDULE_TIMEZONE,
    now: () => now,
  });
  const currentSchedule = currentWeek.kind === "schedule" ? currentWeek.schedule : null;
  const checkIns = currentSchedule ? await mongooseActivityCheckIns.listForSchedule(currentSchedule.id) : [];

  const dashboardContent = currentSchedule ? (
    <ScheduleCheckInView
      scheduleId={currentSchedule.id}
      schedule={currentSchedule.schedule}
      student={currentSchedule.generationInputs.student}
      checkIns={checkIns}
      statusFirst
    />
  ) : student.platform === "7Sage" ? (
    <AnalyticsUploader />
  ) : (
    <div className="rounded-lg border border-ink-100 bg-white p-6">
      <h1 className="text-xl font-semibold tracking-tight text-ink-900">Upload approved analytics to begin</h1>
      <p className="mt-2 text-sm text-ink-500">Confirm a fresh 7Sage analytics extraction to create this week&apos;s schedule.</p>
    </div>
  );

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl">
        {isAdminUser(session.user) ? (
          <SampleReviewSlot
            week={currentWeekInTimezone(now, SCHEDULE_TIMEZONE)}
            hasSchedule={!!currentSchedule}
          >
            {dashboardContent}
          </SampleReviewSlot>
        ) : dashboardContent}
      </div>
    </div>
  );
}
