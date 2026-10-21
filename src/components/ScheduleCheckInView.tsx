"use client";

import { useState, useTransition } from "react";
import { DAY_ORDER } from "@/lib/engine";
import { activityLabel } from "@/lib/activityLabel";
import { formatDuration } from "@/lib/formatDuration";
import { plannedActivityMinutes, scheduleActivityId } from "@/lib/currentWeeklySchedule";
import { doneActivityIds, formatScheduleWeekOf, remainingActivityCount, scheduledActivityCount } from "@/lib/scheduleCheckInSummary";
import { dayName, isoDateInWeek } from "@/lib/scheduleReasonText";
import type { ActivityCheckIn, DayPlan, Student, WeeklySchedule } from "@/lib/types";
import { saveActivityCheckIn } from "@/app/dashboard/actions";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReminderStrip } from "@/components/ui/ReminderStrip";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusIcon } from "@/components/ui/StatusIcon";
import { MOTION, cx } from "@/components/ui/classes";

interface ScheduleCheckInViewProps {
  scheduleId: string;
  schedule: WeeklySchedule;
  student: Student;
  checkIns: ActivityCheckIn[];
  readOnly?: boolean;
  heading?: string;
  /** The student's local date (YYYY-MM-DD). Adds the pace status and the Today label. */
  today?: string;
  uploadReminder?: boolean;
}

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function dayKind(plan: DayPlan, practiceTestDays: DayPlan["day"][]) {
  switch (plan.type) {
    case "unscheduled": return "Not scheduled";
    case "rest": return "Rest day";
    case "practice_test":
      return practiceTestDays.length > 1 ? `Practice test ${practiceTestDays.indexOf(plan.day) + 1} of ${practiceTestDays.length}` : "Practice test";
    case "review": return "Practice-test review";
    case "drill": return "Drilling";
  }
}

function ActivityRow({ label, done, onToggle }: { label: string; done: boolean; onToggle?: () => void }) {
  const row = "flex min-h-9 w-full items-center gap-0.5 rounded-xs pr-2 text-left";
  const content = <>
    <span className="flex size-8 shrink-0 items-center justify-center">
      <span className="flex rounded-pill outline-offset-2 group-focus-visible:outline-2 group-focus-visible:outline-accent">
        <StatusIcon name={done ? "check-disc" : "open-circle"} className={done ? undefined : "group-hover:text-ink group-focus-visible:text-ink"} />
      </span>
    </span>
    <span className={cx("min-w-0 flex-1 text-small", done ? "text-smoke line-through decoration-fog" : "text-ink")}>{label}</span>
  </>;
  if (!onToggle) return <li className={row}>{content}<span className="sr-only">{done ? ", done" : ", not done"}</span></li>;
  return (
    <li>
      <button type="button" role="checkbox" aria-checked={done} onClick={onToggle}
        className={cx("group cursor-pointer hover:bg-vellum focus-visible:outline-none", row, MOTION)}>
        {content}
      </button>
    </li>
  );
}

export default function ScheduleCheckInView({
  scheduleId,
  schedule,
  student,
  checkIns,
  readOnly = false,
  heading = "Your plan for this week",
  today,
  uploadReminder = false,
}: ScheduleCheckInViewProps) {
  const [savedCheckIns, setSavedCheckIns] = useState(checkIns);
  const [, startTransition] = useTransition();
  const doneIds = doneActivityIds(savedCheckIns);
  const totalActivities = scheduledActivityCount(schedule);
  const doneActivities = totalActivities - remainingActivityCount(schedule, savedCheckIns);
  const isPastPlan = heading === "Your past plan";
  const dates = DAY_ORDER.map((_, index) => isoDateInWeek(schedule.weekOf, index));
  const dueSoFar = today === undefined ? undefined : DAY_ORDER.reduce(
    (due, day, index) => dates[index]! <= today ? due + schedule.days[day].activities.length : due, 0);
  const weekNotes = schedule.reasons?.filter((reason) => reason.placement.scope === "week").map((reason) => reason.sentence) ?? [];
  const practiceTestDays = DAY_ORDER.filter((day) => schedule.days[day].type === "practice_test");

  function toggle(activityId: string) {
    const status = doneIds.has(activityId) ? "not_started" : "completed";
    setSavedCheckIns((previous) => [...previous.filter((checkIn) => checkIn.activityId !== activityId), { scheduleId, activityId, status }]);
    startTransition(async () => {
      await saveActivityCheckIn({ scheduleId, activityId, status });
    });
  }

  return (
    <>
      {uploadReminder && (
        <ReminderStrip
          message="Next week starts Monday. Add your screenshots to build your weekly schedule."
          href="/dashboard/upload"
          action="Plan next week"
        />
      )}
      <PageHeader
        eyebrow={isPastPlan ? undefined : `Week of ${formatScheduleWeekOf(schedule.weekOf)}`}
        title={heading}
        lead={isPastPlan || readOnly ? undefined : "Your plan is set. Check off as you go."}
        notes={weekNotes}
        aside={<div aria-live="polite"><ProgressBar done={doneActivities} total={totalActivities} dueSoFar={dueSoFar} /></div>}
      />
      <div className="flex flex-col gap-4 px-5 pt-8 pb-16 md:px-18 md:pt-16 md:pb-24">
        {DAY_ORDER.map((day, dayIndex) => {
          const plan = schedule.days[day];
          const plannedMinutes = Math.round(plan.activities.reduce((total, activity) => total + plannedActivityMinutes(activity), 0));
          const dayReasons = schedule.reasons?.filter((reason) =>
            reason.placement.scope === "day" && reason.placement.day === day && reason.code !== "capacity_overage") ?? [];
          const activityIds = plan.activities.map((_, index) => scheduleActivityId(day, index));
          const allDone = activityIds.length > 0 && activityIds.every((id) => doneIds.has(id));
          const isToday = dates[dayIndex] === today;
          const date = shortDate.format(new Date(`${dates[dayIndex]}T00:00:00.000Z`));
          return (
            <section key={day}>
              <Card className={plan.activities.length === 0 ? "gap-2" : undefined}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2">
                  <h2 className="flex items-baseline gap-2 text-h6 font-medium text-ink">
                    {dayName(day)} <span className={cx("text-small font-regular", isToday ? "text-ink" : "text-smoke")}>{isToday ? `Today, ${date}` : date}</span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-small text-smoke">
                      {dayKind(plan, practiceTestDays)} · {formatDuration(plannedMinutes)} of {formatDuration(student.dailyCapacityMinutes[day])}
                    </span>
                    {allDone && <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-small text-ink"><StatusIcon name="check-circle" />All done</span>}
                  </div>
                </div>
                {dayReasons.map((reason, index) => <p className="px-2 text-small text-smoke" key={`${reason.code}-${index}`}>{reason.sentence}</p>)}
                {plan.activities.length === 0 ? (
                  plan.type === "unscheduled" && dayReasons.length > 0 ? null : <p className="px-2 text-small text-smoke">
                    {plan.type === "rest" ? "Rest day. Nothing planned." : plan.type === "unscheduled" ? "Not scheduled." : "Nothing scheduled."}
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {plan.activities.map((activity, index) => {
                      const activityId = activityIds[index]!;
                      return <ActivityRow key={activityId} label={activityLabel(activity)} done={doneIds.has(activityId)}
                        onToggle={readOnly ? undefined : () => toggle(activityId)} />;
                    })}
                  </ul>
                )}
              </Card>
            </section>
          );
        })}
      </div>
    </>
  );
}
