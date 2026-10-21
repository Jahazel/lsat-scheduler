import { isAdminUser } from "@/lib/accessControl";
import { studentSideClock } from "@/lib/studentClock";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findStudentByAccountId } from "@/lib/studentRepository";
import {
  currentWeekInTimezone, loadOrGenerateCurrentWeek, localDateInTimezone, showsUploadReminder, weekWithoutPlan,
} from "@/lib/currentWeeklySchedule";
import { isoDateInWeek } from "@/lib/scheduleReasonText";
import { formatScheduleWeekOf } from "@/lib/scheduleCheckInSummary";
import { PageHeader } from "@/components/ui/PageHeader";
import { listApprovedAnalyticsSnapshots } from "@/lib/analyticsSnapshotRepository";
import { mockRules } from "@/lib/mockData";
import { postgresCurrentWeekRepositories } from "@/lib/weeklyScheduleRepository";
import { postgresActivityCheckIns } from "@/lib/activityCheckInRepository";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import type { Student } from "@/lib/types";
import ScheduleCheckInView from "@/components/ScheduleCheckInView";
import AnalyticsUploader from "./AnalyticsUploader";
import { SampleReviewSlot, UploaderFrame } from "@/components/AdminTestContext";

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

  const doc = await findStudentByAccountId(session.user.id);
  if (!doc) {
    redirect("/onboarding");
  }

  const student: Student = {
    currentScore: doc.currentScore,
    goalScore: doc.goalScore,
    dailyCapacityMinutes: doc.dailyCapacityMinutes,
    preferredPracticeTestDay: doc.preferredPracticeTestDay,
    accommodationMultiplier: doc.accommodationMultiplier,
    goalTestDate: doc.goalTestDate,
  };

  const clock = await studentSideClock(session.user);
  const now = clock.now;
  const currentWeek = await loadOrGenerateCurrentWeek({
    ...postgresCurrentWeekRepositories,
    activityCheckIns: {
      ...postgresActivityCheckIns,
      ensureForSchedule: (schedule) => postgresActivityCheckIns.ensureForSchedule(
        schedule, clock.simulated ? new Date(schedule.generatedAt) : undefined,
      ),
    },
    studentId: doc.id,
    student,
    studentName: session.user.name ?? "Your",
    rules: mockRules,
    timezone: SCHEDULE_TIMEZONE,
    now: () => now,
  });
  const currentSchedule = currentWeek.kind === "schedule" ? currentWeek.schedule : null;
  const [checkIns, snapshots] = await Promise.all([
    currentSchedule ? postgresActivityCheckIns.listForSchedule(currentSchedule.id) : [],
    listApprovedAnalyticsSnapshots(doc.id),
  ]);
  const withoutPlan = currentSchedule ? null : weekWithoutPlan(snapshots, now, SCHEDULE_TIMEZONE);
  if (withoutPlan === "upload_for_next_week") redirect("/dashboard/upload");

  const dashboardContent = withoutPlan === "plan_starts_monday" ? (
    <PageHeader
      eyebrow={`Week of ${formatScheduleWeekOf(isoDateInWeek(currentWeekInTimezone(now, SCHEDULE_TIMEZONE), 7))}`}
      title="Your plan starts Monday"
      lead="Your upload is saved. Your weekly schedule opens on Monday."
    />
  ) : currentSchedule ? (
    <ScheduleCheckInView
      scheduleId={currentSchedule.id}
      schedule={currentSchedule.schedule}
      student={currentSchedule.generationInputs.student}
      checkIns={checkIns}
      today={localDateInTimezone(now, SCHEDULE_TIMEZONE)}
      uploadReminder={showsUploadReminder(snapshots, now, SCHEDULE_TIMEZONE)}
    />
  ) : (
    <UploaderFrame><AnalyticsUploader /></UploaderFrame>
  );

  return (
    <div className="min-h-screen">
      {isAdminUser(session.user) ? (
        <SampleReviewSlot
          week={currentWeekInTimezone(now, SCHEDULE_TIMEZONE)}
          hasSchedule={!!currentSchedule}
        >
          {dashboardContent}
        </SampleReviewSlot>
      ) : dashboardContent}
    </div>
  );
}
