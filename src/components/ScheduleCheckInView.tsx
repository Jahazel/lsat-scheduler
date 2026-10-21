"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { DAY_ORDER } from "@/lib/engine";
import { activityLabel } from "@/lib/activityLabel";
import { formatDuration, roundMinutesToTotal } from "@/lib/formatDuration";
import { plannedActivityMinutes, scheduleActivityId } from "@/lib/currentWeeklySchedule";
import { formatScheduleWeekOf, remainingActivityCount, scheduledActivityCount } from "@/lib/scheduleCheckInSummary";
import { dateInWeek, dayName } from "@/lib/scheduleReasonText";
import type { ActivityCheckIn, DayOfWeek, Student, WeeklySchedule } from "@/lib/types";
import { saveActivityCheckIn } from "@/app/dashboard/actions";

const CONTROL_CLASS =
  "rounded-sm border border-vellum-line bg-paper font-medium text-smoke transition-colors duration-150 ease-out hover:border-accent hover:text-ink focus-visible:border-accent focus-visible:outline-none";
const FIELD_CLASS =
  "rounded-sm border border-vellum-line bg-paper transition-colors duration-150 ease-out focus:border-accent focus:outline-none";
const VIEW_CONTROL_CLASS =
  "flex-1 rounded-sm px-4 py-2 text-small font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1";
const STATUS_CONTROL_CLASS =
  "rounded-sm px-2.5 py-1 text-caption font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50";

function WarningIcon() {
  return <svg aria-hidden="true" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>;
}

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
  const weekReasons = schedule.reasons?.filter((reason) => reason.placement.scope === "week") ?? [];
  const practiceTestDays = DAY_ORDER.filter((day) => schedule.days[day].type === "practice_test");

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
      {!isPastPlan && <p className="text-small font-medium text-smoke">Week of {formatScheduleWeekOf(schedule.weekOf)}</p>}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-h3 font-semibold text-ink">{heading}</h1>
          {!isPastPlan && <p className="mt-3 text-lead text-smoke">Your plan is set. Check in as you go.</p>}
        </div>
        {statusFirst ? <div aria-live="polite" className="w-60 rounded-xs border border-vellum-line bg-paper px-4 py-3">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-small font-semibold text-ink">{remainingActivities} remaining</span>
            <span className="text-caption text-smoke">{checkedInActivities} checked in</span>
          </div>
          <div aria-label={`${checkedInActivities} of ${totalActivities} activities checked in`} aria-valuemax={totalActivities} aria-valuemin={0} aria-valuenow={checkedInActivities} className="mt-2 h-1.5 overflow-hidden rounded-full bg-vellum-line" role="progressbar">
            <div className="h-full rounded-full bg-accent" style={{ width: `${checkedInPercent}%` }} />
          </div>
        </div> : <p aria-live="polite" className="rounded-full bg-vellum-line px-4 py-2 text-body font-medium text-smoke">
          {remainingActivities} of {totalActivities} activities remaining
        </p>}
      </div>
      {weekReasons.length > 0 && <div className="mt-5 max-w-2xl rounded-xs border border-vellum-line bg-vellum px-4 py-3 text-small text-smoke">
        {weekReasons.map((reason, index) => <p className={index > 0 ? "mt-2" : ""} key={`${reason.code}-${index}`}>{reason.sentence}</p>)}
      </div>}
      <div className={statusFirst ? "mt-8" : "mt-8 flex flex-wrap gap-2"} aria-label="Schedule view">
        <div className={statusFirst ? "flex items-center justify-between rounded-xs border border-vellum-line bg-paper p-1" : "contents"}>
          <button aria-pressed={view === "week"} className={statusFirst ? `${VIEW_CONTROL_CLASS} ${view === "week" ? "bg-ink text-chalk hover:bg-graphite-raised focus-visible:bg-graphite-raised" : "text-smoke hover:bg-vellum hover:text-ink focus-visible:bg-vellum"}` : `${view === "week" ? "border-ink bg-ink text-chalk" : CONTROL_CLASS} px-4 py-2 text-small`} onClick={() => setView("week")} type="button">Whole week</button>
          <button aria-pressed={view === "day"} className={statusFirst ? `${VIEW_CONTROL_CLASS} ${view === "day" ? "bg-ink text-chalk hover:bg-graphite-raised focus-visible:bg-graphite-raised" : "text-smoke hover:bg-vellum hover:text-ink focus-visible:bg-vellum"}` : `${view === "day" ? "border-ink bg-ink text-chalk" : CONTROL_CLASS} px-4 py-2 text-small`} onClick={() => setView("day")} type="button">One day</button>
        </div>
        {view === "day" && (
          statusFirst ? <div aria-label="Day to view" className="mt-2 grid grid-cols-2 rounded-xs border border-vellum-line bg-paper p-1 sm:grid-cols-7">
            {DAY_ORDER.map((day) => (
              <button
                aria-pressed={selectedDay === day}
                className={`${VIEW_CONTROL_CLASS} ${selectedDay === day ? "bg-ink text-chalk hover:bg-graphite-raised focus-visible:bg-graphite-raised" : "text-smoke hover:bg-vellum hover:text-ink focus-visible:bg-vellum"}`}
                key={day}
                onClick={() => setSelectedDay(day)}
                type="button"
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div> : <select aria-label="Day to view" className={`${FIELD_CLASS} px-2 text-small`} value={selectedDay} onChange={(event) => setSelectedDay(event.target.value as DayOfWeek)}>
            {DAY_ORDER.map((day) => <option key={day}>{day}</option>)}
          </select>
        )}
      </div>
      <div className="mt-5 flex flex-col gap-4">
        {visibleDays.map((day) => {
          const plan = schedule.days[day];
          const activityMinutes = roundMinutesToTotal(plan.activities.map(plannedActivityMinutes));
          const plannedMinutes = activityMinutes.reduce((total, minutes) => total + minutes, 0);
          const dayReasons = schedule.reasons?.filter((reason) => reason.placement.scope === "day" && reason.placement.day === day) ?? [];
          const overageMinutes = plan.capacityOverageMinutes ?? Math.max(0, plannedMinutes - student.dailyCapacityMinutes[day]);
          const warning = dayReasons.find((reason) => reason.code === "capacity_overage");
          const otherDayReasons = dayReasons.filter((reason) => reason.code !== "capacity_overage");
          const isUnscheduled = plan.type === "unscheduled";
          return (
            <section key={day} className={`overflow-hidden rounded-xs border ${isUnscheduled ? "border-dashed border-vellum-line bg-transparent" : warning ? "border-fog bg-paper" : "border-vellum-line bg-paper"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-vellum-line px-5 py-4">
                <h2 className="text-small font-semibold text-ink">{dayName(day)} <span className="font-regular text-smoke">{dateInWeek(schedule.weekOf, DAY_ORDER.indexOf(day))}</span></h2>
                {/* `student` is the saved generationInputs snapshot, so a past week
                    keeps the daily capacity it was created with. */}
                <span className="text-caption text-smoke">
                  {isUnscheduled ? "Not scheduled" : plan.type === "rest" ? "Rest day" : plan.type === "practice_test" ? `Practice test${practiceTestDays.length > 1 ? ` ${practiceTestDays.indexOf(day) + 1} of ${practiceTestDays.length}` : ""}` : plan.type === "review" ? "Practice-test review" : "Drilling"} · {formatDuration(plannedMinutes)} of {formatDuration(student.dailyCapacityMinutes[day])}
                </span>
              </div>
              {warning && <div className="flex gap-3 border-b border-vellum-line bg-vellum px-5 py-3 text-ink" role="note" aria-label={`${dayName(day)} capacity warning`}>
                <WarningIcon />
                <div className="min-w-0">
                  <p className="text-small font-semibold">{formatDuration(Math.round(overageMinutes))} over your {formatDuration(student.dailyCapacityMinutes[day])} {dayName(day)}</p>
                  <p className="mt-0.5 text-small text-smoke">{warning.sentence}</p>
                  {!readOnly && !isPastPlan && <p className="mt-2 text-small"><Link className="font-medium text-accent underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" href="/settings">Change daily capacity</Link><span className="text-smoke"> · applies from next week&apos;s plan</span></p>}
                </div>
              </div>}
              {otherDayReasons.length > 0 && <div className={isUnscheduled && plan.activities.length === 0 ? "px-5 py-4" : "px-5 pt-4"}>
                {otherDayReasons.map((reason, index) => <p className={`${isUnscheduled && plan.activities.length === 0 ? "text-small text-smoke" : "text-small font-medium text-smoke"}${index > 0 ? " mt-2" : ""}`} key={`${reason.code}-${index}`}>{reason.sentence}</p>)}
              </div>}
              {plan.activities.length === 0 ? (isUnscheduled && otherDayReasons.length > 0 ? null : <p className="px-5 py-4 text-small text-smoke">{plan.type === "rest" ? "Rest day. Nothing planned." : isUnscheduled ? "Not scheduled." : "Nothing scheduled."}</p>) : (
                <div className={statusFirst ? "" : "flex flex-col gap-3 px-5 py-4"}>
                  {plan.activities.map((activity, index) => {
                    const activityId = scheduleActivityId(day, index);
                    const checkIn = byActivityId.get(activityId);
                    const status = checkIn?.status ?? "not_started";
                    return (
                      <article key={activityId} className={statusFirst ? "flex flex-wrap items-center gap-3 border-b border-vellum-line px-5 py-4 last:border-0" : "rounded-xs border border-vellum-line p-5"}>
                        {statusFirst && <span aria-label={status === "completed" ? `Activity ${index + 1}, completed` : status === "skipped" ? `Activity ${index + 1}, skipped` : `Activity ${index + 1}, not started`} className={`${status === "completed" ? "bg-accent/tint text-accent" : status === "skipped" ? "bg-vellum-line text-smoke" : "bg-vellum-line text-smoke"} grid size-7 shrink-0 place-items-center rounded-full text-caption font-semibold`}>
                          {status === "completed" ? "✓" : index + 1}
                        </span>}
                        <div className={statusFirst ? "min-w-40 flex-1" : ""}>
                          <p className="text-small font-medium text-ink">{activityLabel(activity)}</p>
                          <p className="mt-1 text-caption text-smoke">{formatDuration(activityMinutes[index])} planned</p>
                          {statusFirst && status === "skipped" && <p className="mt-1 text-caption font-medium text-smoke">Skipped</p>}
                          {readOnly && <p className="mt-2 text-small text-smoke">{status.replace("_", " ")}{checkIn?.actualMinutes !== undefined ? ` · ${checkIn.actualMinutes} min actual` : ""}</p>}
                        </div>
                        {!readOnly && (statusFirst ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex rounded-sm border border-vellum-line p-0.5" aria-label={`Status controls for ${activityLabel(activity)}`}>
                              <button aria-label={status === "completed" ? `Clear completed status for ${activityLabel(activity)}` : `Mark ${activityLabel(activity)} done`} aria-pressed={status === "completed"} disabled={pending} className={`${STATUS_CONTROL_CLASS} ${status === "completed" ? "bg-ink text-chalk hover:bg-graphite-raised focus-visible:bg-graphite-raised" : "text-smoke hover:text-ink"}`} onClick={() => saveCheckIn(activityId, status === "completed" ? "not_started" : "completed")} type="button">Done</button>
                              <button aria-label={status === "skipped" ? `Clear skipped status for ${activityLabel(activity)}` : `Skip ${activityLabel(activity)}`} aria-pressed={status === "skipped"} disabled={pending} className={`${STATUS_CONTROL_CLASS} ${status === "skipped" ? "bg-vellum-line text-ink" : "text-smoke hover:text-ink"}`} onClick={() => saveCheckIn(activityId, status === "skipped" ? "not_started" : "skipped")} type="button">Skip</button>
                            </div>
                            {status === "completed" && (
                              <label className="text-caption text-smoke">Actual min <input aria-label={`Actual minutes for ${activityLabel(activity)}`} className={`${FIELD_CLASS} ml-1 w-16 px-1 py-0.5`} defaultValue={checkIn?.actualMinutes ?? ""} min="0" onBlur={(event) => saveCheckIn(activityId, "completed", event.currentTarget.value === "" ? undefined : Number(event.currentTarget.value))} type="number" /></label>
                            )}
                          </div>
                        ) : (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {(["not_started", "completed", "skipped"] as const).map((nextStatus) => (
                              <button disabled={pending} className={`${CONTROL_CLASS} px-2 py-1 text-caption disabled:cursor-not-allowed disabled:opacity-50`} key={nextStatus} onClick={() => saveCheckIn(activityId, nextStatus)} type="button">
                                {nextStatus === "not_started" ? "Not started" : nextStatus === "completed" ? "Completed" : "Skipped"}
                              </button>
                            ))}
                            {status === "completed" && (
                              <label className="text-caption text-smoke">Actual min <input className={`${FIELD_CLASS} ml-1 w-16 px-1 py-0.5`} defaultValue={checkIn?.actualMinutes ?? ""} min="0" onBlur={(event) => saveCheckIn(activityId, "completed", event.currentTarget.value === "" ? undefined : Number(event.currentTarget.value))} type="number" /></label>
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
      <section className="mt-8 border-t border-vellum-line pt-6">
        <p className="text-small font-medium text-smoke">Looking ahead</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-ink">Prepare next week&apos;s plan</h2>
            <p className="mt-1 text-small text-smoke">When you have updated 7Sage analytics, upload them to shape next week&apos;s plan.</p>
          </div>
          <details className="group">
            <summary className={`${CONTROL_CLASS} cursor-pointer list-none px-4 py-2 text-small group-open:border-accent group-open:text-accent`}>How this works</summary>
            <p className="mt-3 w-full max-w-xl rounded-xs border border-dashed border-vellum-line bg-vellum p-4 text-small text-smoke">Your current plan is saved and will not change. A future analytics upload is used only when a later week&apos;s plan is created.</p>
          </details>
        </div>
      </section>
    </>
  );
}
