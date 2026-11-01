import { isAdminUser } from "@/lib/accessControl";
import { studentSideClock } from "@/lib/studentClock";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findStudentByAccountId } from "@/lib/studentRepository";
import {
  currentWeekInTimezone, loadOrGenerateCurrentWeek, localDateInTimezone, showsUploadReminder,
} from "@/lib/currentWeeklySchedule";
import { PageHeader } from "@/components/ui/PageHeader";
import { weekNotes } from "@/lib/scheduleCheckInSummary";
import { listApprovedAnalyticsSnapshots } from "@/lib/analyticsSnapshotRepository";
import { mockRules } from "@/lib/mockData";
import { postgresCurrentWeekRepositories } from "@/lib/weeklyScheduleRepository";
import { postgresActivityCheckIns } from "@/lib/activityCheckInRepository";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import type { Student } from "@/lib/types";
import ScheduleCheckInView from "@/components/ScheduleCheckInView";
import { CurrentWeekReport } from "@/components/AdminTestContext";

const previewStartDate = new Intl.DateTimeFormat("en-US", {
  weekday: "long", month: "short", day: "numeric", timeZone: "UTC",
});

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
  if (currentWeek.kind === "analytics_required") redirect("/dashboard/upload");
  const { schedule } = currentWeek;
  const preview = currentWeek.kind === "next_week_preview";
  const [checkIns, snapshots] = await Promise.all([
    preview ? [] : postgresActivityCheckIns.listForSchedule(schedule.id),
    listApprovedAnalyticsSnapshots(doc.id),
  ]);

  return (
    <div className="min-h-screen">
      {isAdminUser(session.user) && (
        <CurrentWeekReport week={currentWeekInTimezone(now, SCHEDULE_TIMEZONE)} hasSchedule={!preview} />
      )}
      <ScheduleCheckInView
        scheduleId={schedule.id}
        schedule={schedule.schedule}
        student={schedule.generationInputs.student}
        checkIns={checkIns}
        readOnly={preview}
        header={preview ? (
          <PageHeader
            eyebrow={`Next week · starts ${previewStartDate.format(new Date(`${schedule.weekStartDate}T00:00:00.000Z`))}`}
            title="Your plan for next week"
            lead="Your upload is saved. Check-ins open on Monday."
            notes={weekNotes(schedule.schedule)}
          />
        ) : undefined}
        today={localDateInTimezone(now, SCHEDULE_TIMEZONE)}
        uploadReminder={!preview && showsUploadReminder(snapshots, now, SCHEDULE_TIMEZONE)}
      />
    </div>
  );
}
