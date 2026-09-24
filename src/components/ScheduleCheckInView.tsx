"use client";

import { useState, useTransition } from "react";
import { DAY_ORDER } from "@/lib/engine";
import { activityLabel } from "@/lib/activityLabel";
import { formatDuration, roundMinutesToTotal } from "@/lib/formatDuration";
import { plannedActivityMinutes, scheduleActivityId } from "@/lib/currentWeeklySchedule";
import { formatScheduleWeekOf, remainingActivityCount, scheduledActivityCount } from "@/lib/scheduleCheckInSummary";
import type { ActivityCheckIn, DayOfWeek, Student, WeeklySchedule } from "@/lib/types";
import { saveActivityCheckIn } from "@/app/dashboard/actions";

const CONTROL_CLASS =
  "rounded-md border border-ink-200 bg-white font-medium text-ink-700 transition-colors duration-150 ease-out hover:border-accent-600 hover:text-accent-700 focus-visible:border-accent-600 focus-visible:outline-none";
const FIELD_CLASS =
  "rounded-md border border-ink-200 bg-white transition-colors duration-150 ease-out focus:border-accent-600 focus:outline-none";
const VIEW_CONTROL_CLASS =
  "flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-1";
const STATUS_CONTROL_CLASS =
  "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 disabled:cursor-not-allowed disabled:opacity-50";

interface ScheduleCheckInViewProps {
  scheduleId: string;
  schedule: WeeklySchedule;
  student: Student;
  checkIns: ActivityCheckIn[];
  readOnly?: boolean;
  statusFirst?: boolean;
  heading?: string;
}

export default function ScheduleCheckInView({
  scheduleId,
  schedule,
  student,
  checkIns,
  readOnly = false,
  statusFirst = false,
  heading = "Your plan for this week",
}: ScheduleCheckInViewProps) {
  const [view, setView] = useState<"week" | "day">("week");
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>("MONDAY");
  const [savedCheckIns, setSavedCheckIns] = useState(checkIns);
  const [pending, startTransition] = useTransition();
  const visibleDays = view === "week" ? DAY_ORDER : [selectedDay];
  const byActivityId = new Map(savedCheckIns.map((checkIn) => [checkIn.activityId, checkIn]));
  const totalActivities = scheduledActivityCount(schedule);
  const remainingActivities = remainingActivityCount(schedule, savedCheckIns);
  const checkedInActivities = totalActivities - remainingActivities;
  const checkedInPercent = totalActivities === 0 ? 0 : (checkedInActivities / totalActivities) * 100;
  const isPastPlan = heading === "Your past plan";

  function saveCheckIn(activityId: string, status: ActivityCheckIn["status"], actualMinutes?: number) {
    setSavedCheckIns((previous) => [
      ...previous.filter((checkIn) => checkIn.activityId !== activityId),
      { ...previous.find((checkIn) => checkIn.activityId === activityId), scheduleId, activityId, status, actualMinutes },
    ]);
    startTransition(async () => {
      const saved = await saveActivityCheckIn({ scheduleId, activityId, status, actualMinutes });
      setSavedCheckIns((previous) => [...previous.filter((checkIn) => checkIn.activityId !== activityId), saved]);
    });
  }

  return (
    <>
      {!isPastPlan && <p className="text-sm font-medium text-ink-700">Week of {formatScheduleWeekOf(schedule.weekOf)}</p>}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{heading}</h1>
          {!isPastPlan && <p className="mt-3 text-xl text-ink-500">Your plan is set. Check in as you go.</p>}
        </div>
        {statusFirst ? <div aria-live="polite" className="w-60 rounded-lg border border-ink-100 bg-white px-4 py-3">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm font-semibold text-ink-900">{remainingActivities} remaining</span>
            <span className="text-xs text-ink-500">{checkedInActivities} checked in</span>
          </div>
          <div aria-label={`${checkedInActivities} of ${totalActivities} activities checked in`} aria-valuemax={totalActivities} aria-valuemin={0} aria-valuenow={checkedInActivities} className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100" role="progressbar">
            <div className="h-full rounded-full bg-accent-600" style={{ width: `${checkedInPercent}%` }} />
          </div>
        </div> : <p aria-live="polite" className="rounded-full bg-ink-100 px-4 py-2 text-base font-medium text-ink-700">
          {remainingActivities} of {totalActivities} activities remaining
        </p>}
      </div>
      <div className={statusFirst ? "mt-8" : "mt-8 flex flex-wrap gap-2"} aria-label="Schedule view">
        <div className={statusFirst ? "flex items-center justify-between rounded-lg border border-ink-200 bg-white p-1" : "contents"}>
          <button aria-pressed={view === "week"} className={statusFirst ? `${VIEW_CONTROL_CLASS} ${view === "week" ? "bg-accent-600 text-white hover:bg-accent-700 focus-visible:bg-accent-700" : "text-ink-500 hover:bg-ink-50 hover:text-ink-900 focus-visible:bg-ink-50"}` : `${view === "week" ? "border-ink-900 bg-ink-900 text-white" : CONTROL_CLASS} px-4 py-2 text-sm`} onClick={() => setView("week")} type="button">Whole week</button>
          <button aria-pressed={view === "day"} className={statusFirst ? `${VIEW_CONTROL_CLASS} ${view === "day" ? "bg-accent-600 text-white hover:bg-accent-700 focus-visible:bg-accent-700" : "text-ink-500 hover:bg-ink-50 hover:text-ink-900 focus-visible:bg-ink-50"}` : `${view === "day" ? "border-ink-900 bg-ink-900 text-white" : CONTROL_CLASS} px-4 py-2 text-sm`} onClick={() => setView("day")} type="button">One day</button>
        </div>
        {view === "day" && (
          statusFirst ? <div aria-label="Day to view" className="mt-2 grid grid-cols-2 rounded-lg border border-ink-200 bg-white p-1 sm:grid-cols-7">
            {DAY_ORDER.map((day) => (
              <button
                aria-pressed={selectedDay === day}
                className={`${VIEW_CONTROL_CLASS} ${selectedDay === day ? "bg-accent-600 text-white hover:bg-accent-700 focus-visible:bg-accent-700" : "text-ink-500 hover:bg-ink-50 hover:text-ink-900 focus-visible:bg-ink-50"}`}
                key={day}
                onClick={() => setSelectedDay(day)}
                type="button"
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div> : <select aria-label="Day to view" className={`${FIELD_CLASS} px-2 text-sm`} value={selectedDay} onChange={(event) => setSelectedDay(event.target.value as DayOfWeek)}>
            {DAY_ORDER.map((day) => <option key={day}>{day}</option>)}
          </select>
        )}
      </div>
      <div className="mt-5 flex flex-col gap-4">
        {visibleDays.map((day) => {
          const plan = schedule.days[day];
          const activityMinutes = roundMinutesToTotal(plan.activities.map(plannedActivityMinutes));
          const plannedMinutes = activityMinutes.reduce((total, minutes) => total + minutes, 0);
          return (
            <section key={day} className={statusFirst ? "overflow-hidden rounded-lg border border-ink-100 bg-white" : "rounded-lg border border-ink-100 bg-white p-5"}>
              <div className={`flex items-baseline justify-between ${statusFirst ? "border-b border-ink-100 px-5 py-4" : ""}`}>
                <h2 className="font-mono text-sm font-semibold tracking-wide text-ink-900">{day}</h2>
                {/* `student` is the saved generationInputs snapshot, so a past week
                    keeps the daily capacity it was created with. */}
                <span className="text-xs text-ink-500">
                  {formatDuration(plannedMinutes)} planned of {formatDuration(student.dailyCapacityMinutes[day])}
                </span>
              </div>
              {plan.activities.length === 0 ? <p className={`${statusFirst ? "px-5 py-4" : "mt-2"} text-sm text-ink-500`}>{plan.type === "rest" ? "Rest day." : plan.type === "unscheduled" ? "Not scheduled." : "Nothing scheduled."}</p> : (
                <div className={statusFirst ? "" : "mt-3 flex flex-col gap-3"}>
                  {plan.activities.map((activity, index) => {
                    const activityId = scheduleActivityId(day, index);
                    const checkIn = byActivityId.get(activityId);
                    const status = checkIn?.status ?? "not_started";
                    return (
                      <article key={activityId} className={statusFirst ? "flex flex-wrap items-center gap-3 border-b border-ink-100 px-5 py-4 last:border-0" : "rounded-lg border border-ink-100 p-5"}>
                        {statusFirst && <span aria-label={status === "completed" ? `Activity ${index + 1}, completed` : status === "skipped" ? `Activity ${index + 1}, skipped` : `Activity ${index + 1}, not started`} className={`${status === "completed" ? "bg-accent-100 text-accent-700" : status === "skipped" ? "bg-ink-200 text-ink-700" : "bg-ink-100 text-ink-500"} grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold`}>
                          {status === "completed" ? "✓" : index + 1}
                        </span>}
                        <div className={statusFirst ? "min-w-40 flex-1" : ""}>
                          <p className="text-sm font-medium text-ink-900">{activityLabel(activity)}</p>
                          <p className="mt-1 text-xs text-ink-500">{formatDuration(activityMinutes[index])} planned</p>
                          {statusFirst && status === "skipped" && <p className="mt-1 text-xs font-medium text-ink-700">Skipped</p>}
                          {readOnly && <p className="mt-2 text-sm text-ink-700">{status.replace("_", " ")}{checkIn?.actualMinutes !== undefined ? ` · ${checkIn.actualMinutes} min actual` : ""}</p>}
                        </div>
                        {!readOnly && (statusFirst ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex rounded-md border border-ink-200 p-0.5" aria-label={`Status controls for ${activityLabel(activity)}`}>
                              <button aria-label={status === "completed" ? `Clear completed status for ${activityLabel(activity)}` : `Mark ${activityLabel(activity)} done`} aria-pressed={status === "completed"} disabled={pending} className={`${STATUS_CONTROL_CLASS} ${status === "completed" ? "bg-accent-600 text-white hover:bg-accent-700 focus-visible:bg-accent-700" : "text-ink-500 hover:text-ink-900"}`} onClick={() => saveCheckIn(activityId, status === "completed" ? "not_started" : "completed")} type="button">Done</button>
                              <button aria-label={status === "skipped" ? `Clear skipped status for ${activityLabel(activity)}` : `Skip ${activityLabel(activity)}`} aria-pressed={status === "skipped"} disabled={pending} className={`${STATUS_CONTROL_CLASS} ${status === "skipped" ? "bg-ink-200 text-ink-900" : "text-ink-500 hover:text-ink-900"}`} onClick={() => saveCheckIn(activityId, status === "skipped" ? "not_started" : "skipped")} type="button">Skip</button>
                            </div>
                            {status === "completed" && (
                              <label className="text-xs text-ink-600">Actual min <input aria-label={`Actual minutes for ${activityLabel(activity)}`} className={`${FIELD_CLASS} ml-1 w-16 px-1 py-0.5`} defaultValue={checkIn?.actualMinutes ?? ""} min="0" onBlur={(event) => saveCheckIn(activityId, "completed", event.currentTarget.value === "" ? undefined : Number(event.currentTarget.value))} type="number" /></label>
                            )}
                          </div>
                        ) : (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {(["not_started", "completed", "skipped"] as const).map((nextStatus) => (
                              <button disabled={pending} className={`${CONTROL_CLASS} px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50`} key={nextStatus} onClick={() => saveCheckIn(activityId, nextStatus)} type="button">
                                {nextStatus === "not_started" ? "Not started" : nextStatus === "completed" ? "Completed" : "Skipped"}
                              </button>
                            ))}
                            {status === "completed" && (
                              <label className="text-xs text-ink-600">Actual min <input className={`${FIELD_CLASS} ml-1 w-16 px-1 py-0.5`} defaultValue={checkIn?.actualMinutes ?? ""} min="0" onBlur={(event) => saveCheckIn(activityId, "completed", event.currentTarget.value === "" ? undefined : Number(event.currentTarget.value))} type="number" /></label>
                            )}
                          </div>
                        ))}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
      <section className="mt-8 border-t border-ink-200 pt-6">
        <p className="text-sm font-medium text-ink-700">Looking ahead</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-ink-900">Prepare next week&apos;s plan</h2>
            <p className="mt-1 text-sm text-ink-500">When you have updated 7Sage analytics, upload them to shape next week&apos;s plan.</p>
          </div>
          <details className="group">
            <summary className={`${CONTROL_CLASS} cursor-pointer list-none px-4 py-2 text-sm group-open:border-accent-600 group-open:text-accent-700`}>How this works</summary>
            <p className="mt-3 w-full max-w-xl rounded-lg border border-dashed border-ink-200 bg-ink-50 p-4 text-sm text-ink-700">Your current plan is saved and will not change. A future analytics upload is used only when a later week&apos;s plan is created.</p>
          </details>
        </div>
      </section>
    </>
  );
}
