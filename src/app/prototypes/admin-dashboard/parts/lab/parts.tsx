"use client";

import { useId, useMemo, useState } from "react";
import { FieldMessage, GoalTestDateSelect, ScoreInput, TestTimeChoice, WeekFields } from "@/components/StudyProfileFields";
import { everyDay } from "@/lib/studentProfile";
import type { SampleDirection } from "@/lib/sampleAnalytics";
import type { Student } from "../data";
import {
  DIRECTION_LABEL, PRESETS, START_PRESET, WEEK_OPTIONS, buildChain, draftFromStudent, errorsOf, hasErrors, testMonthsFor,
  type LabDraft, type LabErrors,
} from "./model";

export function useLab(initial: LabDraft, onChange?: (draft: LabDraft) => void) {
  const [draft, setDraft] = useState(initial);
  const [good, setGood] = useState<LabDraft | null>(hasErrors(errorsOf(initial)) ? null : initial);
  const [allDays, setAllDays] = useState(initial.days.MONDAY);
  const errors = errorsOf(draft);
  const chain = useMemo(() => (good ? buildChain(good) : null), [good]);
  const apply = (next: LabDraft) => {
    setDraft(next);
    onChange?.(next);
    if (!hasErrors(errorsOf(next))) setGood(next);
  };
  const set = (change: Partial<LabDraft>) => apply({ ...draft, ...change });
  const start = (next: LabDraft) => {
    apply(next);
    setAllDays(next.days.MONDAY);
  };
  const show = (shown: number) => {
    const place = (d: LabDraft) => ({ ...d, shown, built: Math.max(d.built, shown + 1) });
    const next = place(draft);
    setDraft(next);
    onChange?.(next);
    setGood((g) => g && place(g));
  };
  const week = chain ? (chain.weeks[Math.min(draft.shown, chain.weeks.length - 1)] ?? null) : null;
  return { draft, set, start, errors, chain, week, show, stale: hasErrors(errors), allDays, setAllDays };
}
export type Lab = ReturnType<typeof useLab>;

const presetDraft = (id: string) => (PRESETS.find((p) => p.id === id) ?? START_PRESET).draft;

export const startFor = (student: Student | undefined): LabDraft => (student ? draftFromStudent(student) : START_PRESET.draft);

const SELECT = "h-11 w-full min-w-0 rounded-sm border border-vellum-line bg-paper px-3 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function StartSelect({ lab }: { lab: Lab }) {
  const copied = lab.draft.start.startsWith("student:") ? lab.draft.copied : null;
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="sr-only">Preset</span>
      <select value={lab.draft.start} onChange={(e) => lab.start(presetDraft(e.target.value))} className={SELECT}>
        {copied && <option value={lab.draft.start} disabled>{copied.name} (copied)</option>}
        {(["Sample directions", "Edge cases"] as const).map((group) => (
          <optgroup key={group} label={group}>
            {PRESETS.filter((p) => p.group === group).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

export function CopiedNote({ lab }: { lab: Lab }) {
  const copied = lab.draft.copied;
  if (!copied) return null;
  return (
    <p className="rounded-sm border border-vellum-line bg-vellum px-3 py-2 text-caption text-smoke">
      {copied.on === null
        ? <><span className="font-medium [overflow-wrap:anywhere] text-ink">{copied.name}</span> has no analytics yet, so the lab started from the Steady preset.</>
        : <>Copied from <span className="font-medium [overflow-wrap:anywhere] text-ink">{copied.name}</span>, {copied.on}. Edits here do not change the student.</>}
    </p>
  );
}

export function WeekOfSelect({ lab }: { lab: Lab }) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="text-small font-medium text-ink">First week</span>
      <select value={lab.draft.weekOf} onChange={(e) => lab.set({ weekOf: e.target.value })} className={SELECT}>
        {WEEK_OPTIONS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
      </select>
    </label>
  );
}

export function AnalyticsChoice({ lab, hideLegend = false }: { lab: Lab; hideLegend?: boolean }) {
  const a = lab.draft.analytics;
  const options: { key: string; label: string; pick: () => void }[] = [
    ...(["improving", "steady", "slipping"] as SampleDirection[]).map((direction) => ({ key: direction, label: DIRECTION_LABEL[direction], pick: () => lab.set({ analytics: { kind: "sample", direction } }) })),
  ];
  const fromStudent = lab.draft.start.startsWith("student:") && lab.draft.copied;
  if (fromStudent) options.push({ key: "student", label: "Their upload", pick: () => lab.set({ analytics: { kind: "student", name: lab.draft.copied!.name } }) });
  options.push({ key: "screenshots", label: "Screenshots", pick: () => lab.set({ analytics: { kind: "upload" } }) });
  const active = a.kind === "sample" ? a.direction : a.kind === "student" ? "student" : "screenshots";
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className={hideLegend ? "sr-only" : "mb-2 text-small font-medium text-ink"}>Analytics</legend>
      <div className="grid grid-cols-2 gap-1 rounded-sm bg-vellum p-1">
        {options.map((o) => (
          <label key={o.key} className="flex h-9 min-w-0 cursor-pointer items-center justify-center rounded px-1 text-center text-small whitespace-nowrap text-smoke transition-colors duration-(--duration-fast) ease-out hover:bg-vellum-line hover:text-ink has-[:checked]:bg-paper has-[:checked]:font-medium has-[:checked]:text-ink has-[:checked]:shadow-control has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
            <input type="radio" name="labAnalytics" className="sr-only" checked={active === o.key} onChange={o.pick} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Score({ lab, which, label, message }: { lab: Lab; which: "current" | "goal"; label: string; message?: string }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <ScoreInput label={label} value={lab.draft[which]} messageId={message ? id : null} onChange={(v) => lab.set({ [which]: v })} />
      {message && <FieldMessage id={id} icon>{message}</FieldMessage>}
    </div>
  );
}

export const CurrentScore = ({ lab }: { lab: Lab }) => <Score lab={lab} which="current" label="Current PT score" message={lab.errors.current} />;
export const GoalScore = ({ lab }: { lab: Lab }) => <Score lab={lab} which="goal" label="Goal score" message={lab.errors.goal} />;

export function TestMonth({ lab }: { lab: Lab }) {
  const id = useId();
  const message = lab.errors.testMonth;
  const options = testMonthsFor(lab.draft.weekOf);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <GoalTestDateSelect label="Goal test month" value={options.some((m) => m.value === lab.draft.testMonth) ? lab.draft.testMonth : ""} options={options} placeholder="Choose a month" messageId={message ? id : null} onChange={(testMonth) => lab.set({ testMonth })} />
      {message && <FieldMessage id={id} icon>{message}</FieldMessage>}
    </div>
  );
}

export const TestTime = ({ lab }: { lab: Lab }) => <TestTimeChoice value={lab.draft.accommodation} onChange={(accommodation) => lab.set({ accommodation })} />;

export function Days({ lab }: { lab: Lab }) {
  const d = lab.draft;
  return (
    <WeekFields values={{ dailyCapacityMinutes: d.days, preferredPracticeTestDay: d.ptDay }} allDaysMinutes={lab.allDays} accommodation={d.accommodation} dayMessages={lab.errors.days}
      onAllDaysChange={lab.setAllDays} onApplyAllDays={() => lab.set({ days: everyDay(lab.allDays) })}
      onDayChange={(day, minutes) => lab.set({ days: { ...d.days, [day]: minutes } })} onPracticeTestDayChange={(ptDay) => lab.set({ ptDay })} />
  );
}

function staleReason(errors: LabErrors) {
  const fields = [errors.current && "current PT score", errors.goal && "goal score", errors.testMonth && "goal test month", Object.keys(errors.days).length > 0 && "study time"].filter(Boolean) as string[];
  const fix = fields.length > 0 ? `Fix the ${fields.join(", ")}` : "";
  if (errors.analytics) return fix ? `${fix}, and add the LR and RC screenshots.` : "Add the Logical Reasoning and Reading Comprehension screenshots.";
  return `${fix}.`;
}

export function StaleNotice({ lab }: { lab: Lab }) {
  if (!lab.stale) return null;
  return (
    <p role="status" className="flex items-start gap-2 rounded-sm border border-warning-line bg-warning-wash px-3 py-2 text-small text-ink">
      <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-pill bg-warning-ink" />
      <span>{lab.week && <span className="font-medium">Showing the last week that built. </span>}{staleReason(lab.errors)}</span>
    </p>
  );
}

export function ColumnTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex min-h-8 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="text-h4 font-semibold text-ink">{title}</h2>
      {note && <span className="text-caption text-smoke">{note}</span>}
    </div>
  );
}
