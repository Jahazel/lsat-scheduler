import { notFound } from "next/navigation";
import { requireAdmin } from "../../requireAdmin";
import { PageArrival } from "@/components/PagePlaceholder";
import { PageCue } from "@/components/SiteMotion";
import { PAGE_COLUMN, cx } from "@/components/ui/classes";
import { postgresActivityCheckIns } from "@/lib/activityCheckInRepository";
import { listApprovedAnalyticsSnapshots } from "@/lib/analyticsSnapshotRepository";
import { loadAccountPlan } from "@/lib/billingRepository";
import { currentWeekInTimezone, localDateInTimezone } from "@/lib/currentWeeklySchedule";
import { isHeldWeek } from "@/lib/planStatus";
import { loadReadOnlyCurrentWeek } from "@/lib/readOnlyCurrentWeekSchedule";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { studentFacts } from "@/lib/studentFacts";
import { displayName } from "@/lib/studentList";
import { initialsFor } from "@/lib/studentNav";
import { findStudentWithJoinDate } from "@/lib/studentRepository";
import { postgresCurrentWeekRepositories } from "@/lib/weeklyScheduleRepository";
import { StudentDetail } from "./StudentDetail";
import { ThisWeekPanel } from "./ThisWeekPanel";

export default async function AdminStudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();

  const { id } = await params;
  const record = await findStudentWithJoinDate(id);
  if (!record) notFound();

  const now = new Date();
  const thisWeekStart = currentWeekInTimezone(now, SCHEDULE_TIMEZONE);
  const [plan, snapshots, pastWeeks] = await Promise.all([
    loadAccountPlan(record.userId),
    listApprovedAnalyticsSnapshots(record.id),
    postgresCurrentWeekRepositories.weeklySchedules.listBeforeWeek(record.id, thisWeekStart),
  ]);
  const week = await loadReadOnlyCurrentWeek({
    ...postgresCurrentWeekRepositories,
    activityCheckIns: postgresActivityCheckIns,
    studentId: record.id,
    timezone: SCHEDULE_TIMEZONE,
    now: () => now,
    isHeldWeek: (weekStartDate) => isHeldWeek(plan.record, weekStartDate),
  });
  const needsAnalytics = snapshots.length === 0;
  const name = displayName(record);

  return (
    <div data-page-fade className={cx(PAGE_COLUMN, "pt-6 pb-12 md:pt-10")}>
      <PageCue page="admin" />
      <PageArrival page={name ?? record.email} />
      <StudentDetail
        student={{ id: record.id, initials: initialsFor(name, record.email), name, email: record.email, plan: plan.status.kind, needsAnalytics }}
        facts={studentFacts({
          currentScore: record.currentScore,
          goalScore: record.goalScore,
          goalTestDate: record.goalTestDate,
          weeklyMinutes: Object.values(record.dailyCapacityMinutes).reduce((sum, minutes) => sum + minutes, 0),
          joinedAt: record.joinedAt,
          pastWeeks: pastWeeks.length,
          needsAnalytics,
        }, now)}
        thisWeek={<ThisWeekPanel week={week} today={localDateInTimezone(now, SCHEDULE_TIMEZONE)} />}
      />
    </div>
  );
}
