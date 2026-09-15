"use client";

import { useState, useTransition } from "react";
import { DAY_ORDER } from "@/lib/engine";
import { activityLabel } from "@/lib/activityLabel";
import { plannedActivityMinutes, scheduleActivityId } from "@/lib/currentWeeklySchedule";
import { formatScheduleWeekOf, remainingActivityCount, scheduledActivityCount } from "@/lib/scheduleCheckInSummary";
import type { ActivityCheckIn, DayOfWeek, Student, WeeklySchedule } from "@/lib/types";
import { saveActivityCheckIn } from "@/app/dashboard/actions";

const CONTROL_CLASS =
  "rounded-md border border-ink-200 bg-white font-medium text-ink-700 transition-colors duration-150 ease-out hover:border-accent-600 hover:text-accent-700 focus-visible:border-accent-600 focus-visible:outline-none";
const FIELD_CLASS =
  "rounded-md border border-ink-200 bg-white transition-colors duration-150 ease-out focus:border-accent-600 focus:outline-none";

interface ScheduleCheckInViewProps {
  scheduleId: string;
  schedule: WeeklySchedule;
  student: Student;
  checkIns: ActivityCheckIn[];
  readOnly?: boolean;
}

export default function ScheduleCheckInView({
  scheduleId,
  schedule,
  checkIns,
  readOnly = false,
}: ScheduleCheckInViewProps) {
  const [view, setView] = useState<"week" | "day">("week");
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>("MONDAY");
  const [savedCheckIns, setSavedCheckIns] = useState(checkIns);
  const [pending, startTransition] = useTransition();
  const visibleDays = view === "week" ? DAY_ORDER : [selectedDay];
  const byActivityId = new Map(savedCheckIns.map((checkIn) => [checkIn.activityId, checkIn]));

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
      <p className="text-sm font-medium text-ink-700">Week of {formatScheduleWeekOf(schedule.weekOf)}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Your plan for this week</h1>
          <p className="mt-3 text-xl text-ink-500">Your plan is set. Check in as you go.</p>
        </div>
        <p aria-live="polite" className="rounded-full bg-ink-100 px-4 py-2 text-base font-medium text-ink-700">
          {remainingActivityCount(schedule, savedCheckIns)} of {scheduledActivityCount(schedule)} activities remaining
        </p>
      </div>
      <div className="mt-8 flex flex-wrap gap-2" aria-label="Schedule view">
        <button aria-pressed={view === "week"} className={`${view === "week" ? "border-ink-900 bg-ink-900 text-white" : CONTROL_CLASS} px-4 py-2 text-sm`} onClick={() => setView("week")} type="button">Whole week</button>
        <button aria-pressed={view === "day"} className={`${view === "day" ? "border-ink-900 bg-ink-900 text-white" : CONTROL_CLASS} px-4 py-2 text-sm`} onClick={() => setView("day")} type="button">One day</button>
        {view === "day" && (
          <select className={`${FIELD_CLASS} px-2 text-sm`} value={selectedDay} onChange={(event) => setSelectedDay(event.target.value as DayOfWeek)}>
            {DAY_ORDER.map((day) => <option key={day}>{day}</option>)}
          </select>
        )}
      </div>
      <div className="mt-5 flex flex-col gap-4">
        {visibleDays.map((day) => {
          const plan = schedule.days[day];
          return (
            <section key={day} className="rounded-lg border border-ink-100 bg-white p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="font-mono text-sm font-semibold tracking-wide text-ink-900">{day}</h2>
                <span className="text-xs text-ink-500">{plan.totalMinutes} min planned</span>
              </div>
              {plan.activities.length === 0 ? <p className="mt-2 text-sm text-ink-500">{plan.type === "rest" ? "Rest day." : "Nothing scheduled."}</p> : (
                <div className="mt-3 flex flex-col gap-3">
                  {plan.activities.map((activity, index) => {
                    const activityId = scheduleActivityId(day, index);
                    const checkIn = byActivityId.get(activityId);
                    const status = checkIn?.status ?? "not_started";
                    return (
                      <article key={activityId} className="rounded-lg border border-ink-100 p-5">
                        <p className="text-sm font-medium text-ink-900">{activityLabel(activity)}</p>
                        <p className="mt-1 text-xs text-ink-500">{plannedActivityMinutes(activity)} min planned</p>
                        {readOnly ? <p className="mt-2 text-sm text-ink-700">{status.replace("_", " ")}{checkIn?.actualMinutes !== undefined ? ` · ${checkIn.actualMinutes} min actual` : ""}</p> : (
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
                        )}
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
