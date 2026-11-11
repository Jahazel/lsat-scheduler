import { isAdminUser } from "@/lib/accessControl";
import { studentSideClock } from "@/lib/studentClock";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findStudentByAccountId } from "@/lib/studentRepository";
import {
  currentWeekInTimezone, loadOrGenerateCurrentWeek, localDateInTimezone, showsUploadReminder,
} from "@/lib/currentWeeklySchedule";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatScheduleWeekOf, weekNotes } from "@/lib/scheduleCheckInSummary";
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
import { freeWeekEndingNote, hidesUploadReminder } from "@/lib/planNotes";
import { HeldWeek, PlanNotice } from "@/components/PlanNotes";
import { isoDateInWeek } from "@/lib/scheduleReasonText";

const previewStartDate = new Intl.DateTimeFormat("en-US", {
  weekday: "long", month: "short", day: "numeric", timeZone: "UTC",
});

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
  if (isHeldWeek(record, schedule.weekStartDate)) {
    return (
      <div data-page-fade className="min-h-screen">
        <PageCue page="this-week" />
        <PageArrival page="This week" />
        <div data-page-section>
          <PageHeader
            eyebrow={`Week of ${formatScheduleWeekOf(schedule.weekStartDate)}`}
            title={preview ? "Your plan for next week" : "Your plan for this week"}
          />
        </div>
        <div className="px-5 pt-8 pb-16 md:px-18 md:pt-16 md:pb-24">
          <div data-page-section><HeldWeek /></div>
        </div>
      </div>
    );
  }
  const realNow = new Date();
  const [checkIns, snapshots, nextWeekSchedule] = await Promise.all([
    preview ? [] : postgresActivityCheckIns.listForSchedule(schedule.id),
    listApprovedAnalyticsSnapshots(doc.id),
    plan.kind === "free_week" && !preview
      ? postgresCurrentWeekRepositories.weeklySchedules.findByStudentAndWeek(doc.id, isoDateInWeek(schedule.weekStartDate, 7))
      : null,
  ]);
  const note = preview ? null : freeWeekEndingNote(plan, record, realNow, nextWeekSchedule !== null);

  return (
    <div data-page-fade className="min-h-screen">
      <PageCue page="this-week" />
      <PageArrival page="This week" />
      {isAdminUser(session.user) && (
        <CurrentWeekReport week={currentWeekInTimezone(now, SCHEDULE_TIMEZONE)} hasSchedule={!preview} hasPreview={preview} />
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
        uploadReminder={!preview && !hidesUploadReminder(plan, record) && showsUploadReminder(snapshots, now, SCHEDULE_TIMEZONE)}
        notice={note && <PlanNotice note={note} />}
        thisWeek={{ drillLink: (Array.isArray(drill) ? drill[0] : drill) ?? null }}
      />
    </div>
  );
}
