import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { loadOrGenerateCurrentWeek } from "@/lib/currentWeeklySchedule";
import { mockRules } from "@/lib/mockData";
import { listWeeklySchedulesForStudent, mongooseCurrentWeekRepositories } from "@/lib/weeklyScheduleRepository";
import { mongooseActivityCheckIns } from "@/lib/activityCheckInRepository";
import { formatScheduleWeekOf } from "@/lib/scheduleCheckInSummary";
import { groupCheckInsByScheduleId, summarizeScheduleHistoryWeek } from "@/lib/scheduleHistorySummary";
import type { Student } from "@/lib/types";
import ScheduleCheckInView from "@/components/ScheduleCheckInView";
import AnalyticsUploader from "./AnalyticsUploader";
import ScheduleHistoryRail, { type ScheduleHistoryRailWeek } from "./ScheduleHistoryRail";
import ResetTestAccountButton from "./ResetTestAccountButton";

type DashboardSearchParams = { historyWeek?: string | string[] };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const { historyWeek } = await searchParams;
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
  const scheduleHistory = await listWeeklySchedulesForStudent(String(doc._id));
  const currentSchedule = currentWeek.kind === "schedule" ? currentWeek.schedule : null;
  const currentScheduleId = currentSchedule?.id ?? null;
  const scheduleIds = [...new Set([...scheduleHistory.map((schedule) => schedule.id), ...(currentScheduleId ? [currentScheduleId] : [])])];
  const allCheckIns = await mongooseActivityCheckIns.listForSchedules(scheduleIds);
  const checkInsByScheduleId = groupCheckInsByScheduleId(allCheckIns);
  const checkInsForSchedule = (scheduleId: string) => checkInsByScheduleId.get(scheduleId) ?? [];
  const checkIns = currentScheduleId ? checkInsForSchedule(currentScheduleId) : [];
  const currentWeekStartDate = currentSchedule?.weekStartDate ?? null;
  const selectedHistoryWeek = typeof historyWeek === "string" && historyWeek !== currentWeekStartDate ? historyWeek : undefined;
  const selectedHistory = selectedHistoryWeek
    ? scheduleHistory.find((schedule) => schedule.weekStartDate === selectedHistoryWeek) ?? null
    : null;
  const selectedHistoryCheckIns = selectedHistory ? checkInsForSchedule(selectedHistory.id) : [];
  const historyWeeks = scheduleHistory.map((schedule) => summarizeScheduleHistoryWeek({
    weekStartDate: schedule.weekStartDate,
    schedule: schedule.schedule,
    checkIns: checkInsForSchedule(schedule.id),
    isCurrent: schedule.weekStartDate === currentWeekStartDate,
  }));
  const hasPastWeeks = historyWeeks.some((week) => !week.isCurrent);
  const selectedWeekSummary = selectedHistory
    ? historyWeeks.find((week) => week.weekStartDate === selectedHistory.weekStartDate) ?? null
    : null;

  function weekHref(weekStartDate?: string) {
    const params = new URLSearchParams();
    if (weekStartDate && weekStartDate !== currentWeekStartDate) params.set("historyWeek", weekStartDate);
    const query = params.toString();
    return query ? `/dashboard?${query}` : "/dashboard";
  }

  const railWeeks: ScheduleHistoryRailWeek[] = historyWeeks.map((week) => ({
    ...week,
    href: weekHref(week.weekStartDate),
    isSelected: selectedHistory ? week.weekStartDate === selectedHistory.weekStartDate : week.isCurrent,
  }));

  const resetTestAccount = process.env.NODE_ENV === "development" && (
    <div className="mb-8">
      <ResetTestAccountButton />
    </div>
  );

  const pastWeekNotice = selectedHistory && (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-200 bg-ink-50 px-4 py-3">
      <p className="text-sm text-ink-700">
        <span className="font-semibold text-ink-900">Viewing a past week</span> · {formatScheduleWeekOf(selectedHistory.weekStartDate)} · {selectedWeekSummary?.done ?? 0} of {selectedWeekSummary?.total ?? 0} done
      </p>
      <a className="text-sm font-medium text-accent-700 underline-offset-4 hover:underline" href={weekHref()}>Back to this week →</a>
    </div>
  );

  const dashboardContent = selectedHistory ? (
    <ScheduleCheckInView
      key={selectedHistory.id}
      scheduleId={selectedHistory.id}
      schedule={selectedHistory.schedule}
      student={selectedHistory.generationInputs.student}
      checkIns={selectedHistoryCheckIns}
      heading="Your past plan"
      statusFirst
    />
  ) : currentSchedule ? (
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
      {hasPastWeeks ? (
        <ScheduleHistoryRail weeks={railWeeks}>
          {resetTestAccount}
          {pastWeekNotice}
          {dashboardContent}
        </ScheduleHistoryRail>
      ) : (
        <div className="mx-auto max-w-3xl">
          {resetTestAccount}
          {dashboardContent}
        </div>
      )}
    </div>
  );
}
