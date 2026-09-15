"use client";

import { useState, useTransition } from "react";
import { DAY_ORDER } from "@/lib/engine";
import { activityLabel } from "@/lib/activityLabel";
import { plannedActivityMinutes, scheduleActivityId } from "@/lib/currentWeeklySchedule";
import type { ActivityCheckIn, DayOfWeek, Student, WeeklySchedule } from "@/lib/types";
import { saveActivityCheckIn } from "@/app/dashboard/actions";

const CONTROL_CLASS =
  "rounded-md border border-ink-200 bg-white transition-colors duration-150 ease-out hover:border-accent-600 hover:text-accent-700 focus-visible:border-accent-600 focus-visible:outline-none";
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
  student,
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
    startTransition(async () => {
      const saved = await saveActivityCheckIn({ scheduleId, activityId, status, actualMinutes });
      setSavedCheckIns((previous) => [...previous.filter((checkIn) => checkIn.activityId !== activityId), saved]);
    });
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
        {schedule.studentName}&rsquo;s Week of {schedule.weekOf}
      </h1>
      <p className="mt-1 text-sm text-ink-500">{student.weekdayHours}h/day capacity · score {student.currentScore}</p>
      <div className="mt-6 flex flex-wrap gap-2" aria-label="Schedule view">
        <button className={`${CONTROL_CLASS} px-3 py-1.5 text-sm`} onClick={() => setView("week")} type="button">Whole week</button>
        <button className={`${CONTROL_CLASS} px-3 py-1.5 text-sm`} onClick={() => setView("day")} type="button">One day</button>
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
    </>
  );
}
