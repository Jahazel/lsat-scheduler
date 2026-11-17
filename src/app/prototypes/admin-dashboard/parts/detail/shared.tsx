"use client";

import { cx } from "@/components/ui/classes";
import { PRESS } from "../chrome";
import { hours, type Student } from "../data";
import { Badge, CARD, PlanBadge } from "../students/controls";
import ScheduleCheckInView from "@/components/ScheduleCheckInView";
import { formatScheduleWeekOf } from "@/lib/scheduleCheckInSummary";
import { PanelHeader } from "./panel";
import { NO_WEEK, TODAY_ISO, notesOf, pace, testLabel, weeklyMinutes, type Detail, type LiveWeek } from "./data";

export type DetailProps = { student: Student; detail: Detail; back: () => void; lab: () => void };

export function BackLink({ back }: { back: () => void }) {
  return <button type="button" onClick={back} className="-my-1 flex min-h-8 w-fit items-center text-small font-medium text-smoke pointer-hover:hover:text-ink">← All students</button>;
}

export function OpenInLab({ lab, className }: { lab: () => void; className?: string }) {
  return (
    <button type="button" onClick={lab} className={cx("flex h-10 shrink-0 items-center justify-center rounded-pill bg-ink px-[18px] text-small font-medium whitespace-nowrap text-chalk pointer-hover:hover:bg-accent", PRESS, className)}>
      Open in lab
    </button>
  );
}

export const ReadOnly = () => <span className="inline-flex shrink-0 items-center rounded-pill border border-vellum-line px-2 py-0.5 text-caption whitespace-nowrap text-smoke">Read only</span>;

export function Badges({ student }: { student: Student }) {
  return <>{student.needsAnalytics && <Badge tone="accent">Needs analytics</Badge>}<PlanBadge student={student} /></>;
}

export const displayName = (student: Student) => student.name ?? "No name";

export function facts(student: Student, detail: Detail): { label: string; value: string; muted?: boolean }[] {
  return [
    { label: "Score", value: detail.current === null ? `No analytics · goal ${detail.goal}` : `${detail.current} → ${detail.goal}`, muted: detail.current === null },
    { label: "Test", value: testLabel(student, detail) },
    { label: "Study time", value: `${hours(weeklyMinutes(student))} per week` },
    { label: "Joined", value: student.joined },
    { label: "Past weeks", value: student.pastWeeks === 0 ? "None yet" : String(student.pastWeeks), muted: student.pastWeeks === 0 },
  ];
}

export function NoWeek({ detail, className }: { detail: Detail; className?: string }) {
  return (
    <div className={cx(CARD, "flex flex-col gap-1 p-5", className)}>
      <p className="text-small font-medium text-ink">No schedule this week</p>
      <p className="max-w-prose text-small text-smoke">{NO_WEEK[detail.noWeek]}</p>
    </div>
  );
}

export function WeekNotes({ notes }: { notes: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {notes.map((n) => <li key={n} className="flex gap-2 text-small text-smoke"><span aria-hidden className="mt-2 size-1 shrink-0 rounded-pill bg-fog" />{n}</li>)}
    </ul>
  );
}

export function WeekSummary({ week }: { week: LiveWeek }) {
  const p = pace(week);
  const notes = notesOf(week);
  return (
    <PanelHeader title={`Week of ${formatScheduleWeekOf(week.schedule.weekOf)}`}
      aside={<><span className="font-medium text-ink tabular-nums">{p.done} of {p.total}</span> done · <span className={p.behind ? "font-medium text-warning-ink" : undefined}>{p.label}</span></>}>
      {notes.length > 0 && <WeekNotes notes={notes} />}
    </PanelHeader>
  );
}

export function LiveDays({ detail, scheduleId }: { detail: Detail; scheduleId: string }) {
  if (!detail.week) return <NoWeek detail={detail} />;
  const { schedule, student, checkIns } = detail.week;
  return <ScheduleCheckInView scheduleId={scheduleId} schedule={schedule} student={student} checkIns={checkIns} readOnly today={TODAY_ISO}
    header={<WeekSummary week={detail.week} />} padding="pt-5" />;
}
