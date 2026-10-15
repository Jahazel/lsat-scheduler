import { studentSideNow } from "@/lib/studentClock";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findStudentByAccountId } from "@/lib/studentRepository";
import { currentWeekInTimezone } from "@/lib/currentWeeklySchedule";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { listWeeklySchedulesForStudent } from "@/lib/weeklyScheduleRepository";
import { postgresActivityCheckIns } from "@/lib/activityCheckInRepository";
import { formatScheduleWeekOf } from "@/lib/scheduleCheckInSummary";
import { groupCheckInsByScheduleId, summarizeScheduleHistoryWeek } from "@/lib/scheduleHistorySummary";
import ScheduleCheckInView from "@/components/ScheduleCheckInView";
import ProgressOverview from "./ProgressOverview";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string | string[] }>;
}) {
  const { week } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await findStudentByAccountId(session.user.id);
  if (!student) redirect("/onboarding");

  const currentWeekStartDate = currentWeekInTimezone(await studentSideNow(session.user), SCHEDULE_TIMEZONE);
  const requestedWeek = Array.isArray(week) ? week[0] : week;
  if (requestedWeek === currentWeekStartDate) redirect("/dashboard");

  const history = await listWeeklySchedulesForStudent(student.id);
  const allCheckIns = await postgresActivityCheckIns.listForSchedules(history.map((schedule) => schedule.id));
  const checkInsByScheduleId = groupCheckInsByScheduleId(allCheckIns);
  const checkInsFor = (scheduleId: string) => checkInsByScheduleId.get(scheduleId) ?? [];

  const selected = requestedWeek ? history.find((schedule) => schedule.weekStartDate === requestedWeek) : undefined;
  if (selected) {
    const summary = summarizeScheduleHistoryWeek({
      weekStartDate: selected.weekStartDate,
      schedule: selected.schedule,
      checkIns: checkInsFor(selected.id),
      isCurrent: false,
    });
    return (
      <div className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <Link href="/progress" className="mb-5 inline-block text-sm font-medium text-accent-700 underline-offset-4 hover:underline">
            ← All weeks
          </Link>
          <div className="mb-6 rounded-lg border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-700">
            <span className="font-semibold text-ink-900">Viewing a past week</span> · {formatScheduleWeekOf(selected.weekStartDate)} · {summary.done} of {summary.total} done
          </div>
          <ScheduleCheckInView
            key={selected.id}
            scheduleId={selected.id}
            schedule={selected.schedule}
            student={selected.generationInputs.student}
            checkIns={checkInsFor(selected.id)}
            heading="Your past plan"
            statusFirst
          />
        </div>
      </div>
    );
  }

  const weeks = history.map((schedule) =>
    summarizeScheduleHistoryWeek({
      weekStartDate: schedule.weekStartDate,
      schedule: schedule.schedule,
      checkIns: checkInsFor(schedule.id),
      isCurrent: schedule.weekStartDate === currentWeekStartDate,
    }),
  );

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <ProgressOverview weeks={weeks} />
      </div>
    </div>
  );
}
