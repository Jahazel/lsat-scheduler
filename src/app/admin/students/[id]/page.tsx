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
import { displayName, listQuery, listStateFrom } from "@/lib/studentList";
import { initialsFor } from "@/lib/studentNav";
import { findStudentWithJoinDate } from "@/lib/studentRepository";
import { listPastWeekMonths, resolveProgressRoute } from "@/lib/progressHistory";
import { uploadHistory } from "@/lib/uploadHistory";
import { postgresCurrentWeekRepositories } from "@/lib/weeklyScheduleRepository";
import { listPracticeTestsByWeek } from "@/lib/weeklyUploadRepository";
import PastWeekView from "@/app/progress/PastWeekView";
import { PastWeeksPanel } from "./HistoryPanels";
import { ProgressPanel } from "./ProgressPanel";
import { SettingsPanel } from "./SettingsPanel";
import { StudentDetail } from "./StudentDetail";
import { ThisWeekPanel } from "./ThisWeekPanel";

export default async function AdminStudentPage({ params, searchParams }: PageProps<"/admin/students/[id]">) {
  await requireAdmin();

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const record = await findStudentWithJoinDate(id);
  if (!record) notFound();

  const now = new Date();
  const thisWeekStart = currentWeekInTimezone(now, SCHEDULE_TIMEZONE);
  const [plan, snapshots, practiceTests, savedPastWeeks] = await Promise.all([
    loadAccountPlan(record.userId),
    listApprovedAnalyticsSnapshots(record.id),
    listPracticeTestsByWeek(record.id),
    postgresCurrentWeekRepositories.weeklySchedules.listBeforeWeek(record.id, thisWeekStart),
  ]);
  const pastWeeks = savedPastWeeks.filter((saved) => !isHeldWeek(plan.record, saved.weekStartDate));
  const pastWeekCheckIns = await postgresActivityCheckIns.listForSchedules(pastWeeks.map((saved) => saved.id));
  const pastWeekRoute = resolveProgressRoute({
    schedules: pastWeeks,
    checkIns: pastWeekCheckIns,
    currentWeekStartDate: thisWeekStart,
    requestedWeek: typeof query.pastWeek === "string" ? query.pastWeek : undefined,
  });
  const weeksLink = new URLSearchParams(listQuery(listStateFrom(query)));
  weeksLink.set("tab", "weeks");
  const weekLinks = { all: `/admin/students/${id}?${weeksLink}`, weekPrefix: `/admin/students/${id}?${weeksLink}&pastWeek=` };
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
  const today = localDateInTimezone(now, SCHEDULE_TIMEZONE);

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
        panels={{
          week: <ThisWeekPanel week={week} today={today} />,
          weeks: pastWeekRoute.kind === "week"
            ? <PastWeekView {...pastWeekRoute} links={weekLinks} place="panel" />
            : <PastWeeksPanel months={listPastWeekMonths({ schedules: pastWeeks, checkIns: pastWeekCheckIns, currentWeekStartDate: thisWeekStart })} weekPrefix={weekLinks.weekPrefix} />,
          progress: <ProgressPanel months={uploadHistory(snapshots, practiceTests)} score={record.currentScore} goal={record.goalScore} hasPastWeeks={pastWeeks.length > 0} />,
          settings: <SettingsPanel settings={record} officialAttempts={record.officialAttempts} today={today} />,
        }}
      />
    </div>
  );
}
