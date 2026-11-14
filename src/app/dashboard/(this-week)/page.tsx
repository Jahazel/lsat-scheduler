import { isAdminUser } from "@/lib/accessControl";
import { studentSideClock } from "@/lib/studentClock";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findStudentByAccountId } from "@/lib/studentRepository";
import {
  currentWeekInTimezone, loadOrGenerateCurrentWeek, localDateInTimezone, nextWeekHasUpload, showsUploadReminder,
} from "@/lib/currentWeeklySchedule";
import { roadToTestDay } from "@/lib/roadToTestDay";
import { listApprovedAnalyticsSnapshots } from "@/lib/analyticsSnapshotRepository";
import { mockRules } from "@/lib/mockData";
import { postgresCurrentWeekRepositories } from "@/lib/weeklyScheduleRepository";
import { postgresActivityCheckIns } from "@/lib/activityCheckInRepository";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import type { Student } from "@/lib/types";
import ScheduleCheckInView from "@/components/ScheduleCheckInView";
import { DRILL_LINK_PARAMETER } from "@/lib/drillSetupGuide";
import { PageCue } from "@/components/SiteMotion";
import { PageArrival } from "@/components/PagePlaceholder";
import { CurrentWeekReport } from "@/components/AdminTestContext";
import { loadChosenPlan } from "@/lib/billingRepository";
import { isHeldWeek } from "@/lib/planStatus";
import { freeWeekEndingNote, hidesUploadReminder, planProblemNote } from "@/lib/planNotes";
import { HeldWeek, PlanNotices } from "@/components/PlanNotes";

type DashboardSearchParams = { historyWeek?: string | string[]; [DRILL_LINK_PARAMETER]?: string | string[] };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const { historyWeek, [DRILL_LINK_PARAMETER]: drill } = await searchParams;
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

  const { status: plan, record } = await loadChosenPlan(session.user.id);
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
    plan,
  });
  if (currentWeek.kind === "analytics_required" || currentWeek.kind === "plan_required") redirect("/dashboard/upload");
  const { schedule } = currentWeek;
  const preview = currentWeek.kind === "next_week_preview";
  const realNow = new Date();
  const problem = planProblemNote(plan);
  if (isHeldWeek(record, schedule.weekStartDate)) return (
    <div data-page-fade className="min-h-screen">
      <PageCue page="this-week" />
      <PageArrival page="This week" look="fade" />
      <HeldWeek weekOf={schedule.weekStartDate} preview={preview} problem={problem} lapsed={plan.kind === "lapsed"}
        freeWeekEnding={preview ? freeWeekEndingNote(plan, record, realNow, true) : null} />
    </div>
  );
  const [checkIns, snapshots] = await Promise.all([
    preview ? [] : postgresActivityCheckIns.listForSchedule(schedule.id),
    listApprovedAnalyticsSnapshots(doc.id),
  ]);
  const note = problem ?? (preview ? null : freeWeekEndingNote(plan, record, realNow, nextWeekHasUpload(snapshots, realNow, SCHEDULE_TIMEZONE)));
  const uploadDue = !preview && !hidesUploadReminder(plan, record, realNow) && showsUploadReminder(snapshots, now, SCHEDULE_TIMEZONE);

  return (
    <div data-page-fade className="min-h-screen">
      <PageCue page="this-week" />
      <PageArrival page="This week" look="fade" />
      {isAdminUser(session.user) && (
        <CurrentWeekReport week={currentWeekInTimezone(now, SCHEDULE_TIMEZONE)} hasSchedule={!preview} hasPreview={preview} />
      )}
      <ScheduleCheckInView
        scheduleId={schedule.id}
        schedule={schedule.schedule}
        student={schedule.generationInputs.student}
        checkIns={checkIns}
        readOnly={preview}
        today={localDateInTimezone(now, SCHEDULE_TIMEZONE)}
        notice={(note || uploadDue) && <PlanNotices note={note} uploadDue={uploadDue} />}
        thisWeek={{ drillLink: (Array.isArray(drill) ? drill[0] : drill) ?? null, road: roadToTestDay(doc, now, SCHEDULE_TIMEZONE) }}
      />
    </div>
  );
}
