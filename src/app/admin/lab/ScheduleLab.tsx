"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import ScheduleCheckInView from "@/components/ScheduleCheckInView";
import { FieldMessage, GoalTestDateSelect, ScoreInput, TestTimeChoice, WeekFields } from "@/components/StudyProfileFields";
import { FOCUS, cx } from "@/components/ui/classes";
import type { SampleDirection } from "@/lib/sampleAnalytics";
import {
  DIRECTION_LABEL, PRESET_GROUPS, REASON_NAME, buildLabChain, chainEndText, encodeLabLink, fieldErrors, hasErrors, labWeeks, plannedFrom, presetInputs,
  presets, shortDay, showWeek, staleReason, weekReasons, type CopiedStudent, type LabChain, type LabInputs, type LabRead, type LabWeek,
} from "@/lib/scheduleLab";
import { everyDay, upcomingTestMonths } from "@/lib/studentProfile";
import { PRESS } from "../StudentsLedger";
import { LabScreenshots, useLabScreenshots } from "./LabScreenshots";

const CARD = "rounded-lg border border-vellum-line bg-paper shadow-control";
const SELECT = cx("h-11 w-full min-w-0 rounded-sm border border-vellum-line bg-paper px-3 text-body text-ink", FOCUS);
const PILL = cx("flex h-10 shrink-0 items-center gap-1.5 rounded-pill border px-4 text-small whitespace-nowrap shadow-control disabled:pointer-events-none disabled:border-vellum-line disabled:bg-paper disabled:text-fog disabled:shadow-none", PRESS, FOCUS);
const SEGMENT = "flex h-9 min-w-0 cursor-pointer items-center justify-center rounded px-1 text-center text-small whitespace-nowrap text-smoke transition-colors duration-(--duration-fast) ease-out hover:bg-vellum-line hover:text-ink has-[:checked]:bg-paper has-[:checked]:font-medium has-[:checked]:text-ink has-[:checked]:shadow-control has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent";

type Lab = {
  inputs: LabInputs;
  set: (change: Partial<LabInputs>) => void;
  start: (inputs: LabInputs) => void;
  thisWeek: string;
  copied: CopiedStudent | null;
};

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-4 border-vellum-line px-5 py-5 not-first:border-t">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-small font-semibold text-ink">{title}</h3>
        {note && <span className="min-w-0 truncate text-caption text-smoke">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function PresetSelect({ lab }: { lab: Lab }) {
  const { inputs, copied } = lab;
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="sr-only">Preset</span>
      <select value={inputs.preset} onChange={(e) => lab.start(presetInputs(e.target.value, lab.thisWeek))} className={SELECT}>
        {inputs.preset === "student" && copied && <option value="student" disabled>{copied.name} (copied)</option>}
        {PRESET_GROUPS.map((group) => (
          <optgroup key={group} label={group}>
            {presets(lab.thisWeek).filter((p) => p.group === group).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function CopiedNote({ copied }: { copied: CopiedStudent }) {
  const name = <span className="font-medium [overflow-wrap:anywhere] text-ink">{copied.name}</span>;
  return (
    <p className="rounded-sm border border-vellum-line bg-vellum px-3 py-2 text-caption text-smoke">
      {copied.uploadedOn === null
        ? <>{name} has no analytics yet, so the lab started from the Steady preset.</>
        : <>Copied from {name}, {shortDay(copied.uploadedOn)}. Edits here do not change the student.</>}
    </p>
  );
}

function Score({ lab, which, label, message }: { lab: Lab; which: "current" | "goal"; label: string; message?: string }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <ScoreInput label={label} name={`${which}Score`} value={lab.inputs[which]} messageId={message ? id : null} onChange={(value) => lab.set({ [which]: value })} />
      {message && <FieldMessage id={id} icon>{message}</FieldMessage>}
    </div>
  );
}

function TestMonth({ lab, message }: { lab: Lab; message?: string }) {
  const id = useId();
  const options = upcomingTestMonths(lab.inputs.weekOf);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <GoalTestDateSelect label="Goal test month" value={options.some((m) => m.value === lab.inputs.testMonth) ? lab.inputs.testMonth : ""} options={options}
        placeholder="Choose a month" messageId={message ? id : null} onChange={(testMonth) => lab.set({ testMonth })} />
      {message && <FieldMessage id={id} icon>{message}</FieldMessage>}
    </div>
  );
}

function AnalyticsChoice({ lab }: { lab: Lab }) {
  const a = lab.inputs.analytics;
  const options: { key: string; label: string; pick: () => void }[] = (Object.keys(DIRECTION_LABEL) as SampleDirection[]).map((direction) => ({
    key: direction, label: DIRECTION_LABEL[direction], pick: () => lab.set({ analytics: { kind: "sample", direction } }),
  }));
  if (lab.copied?.trend) options.push({ key: "student", label: "Their upload", pick: () => lab.set({ analytics: { kind: "student" } }) });
  options.push({ key: "screenshots", label: "Screenshots", pick: () => lab.set({ analytics: { kind: "screenshots" } }) });
  const active = a.kind === "sample" ? a.direction : a.kind;
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="sr-only">Analytics</legend>
      <div className="grid grid-cols-2 gap-1 rounded-sm bg-vellum p-1">
        {options.map((o) => (
          <label key={o.key} className={SEGMENT}>
            <input type="radio" name="labAnalytics" className="sr-only" checked={active === o.key} onChange={o.pick} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

type Travel = "next" | "earlier";

function ChainButtons({ at, canNext, stop, go }: { at: number; canNext: boolean; stop: string | null; go: (to: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={at === 0} onClick={() => go(at - 1)} className={cx(PILL, "border-vellum-line bg-paper text-ink pointer-hover:hover:bg-vellum")}>
        <span aria-hidden>←</span> Earlier week
      </button>
      <button type="button" disabled={!canNext} onClick={() => go(at + 1)} title={stop ?? undefined}
        className={cx(PILL, "border-ink bg-ink text-chalk pointer-hover:hover:bg-accent")}>
        Next week <span aria-hidden>→</span>
      </button>
    </div>
  );
}

function BuiltWeek({ week, stop, travel }: { week: LabWeek | null; stop: string | null; travel: Travel | null }) {
  if (!week) return <p className="text-small text-smoke">No week yet.</p>;
  const reasons = weekReasons(week.schedule);
  return (
    <div key={week.number} data-travel={travel ?? undefined} className="lab-week flex flex-col gap-4">
      <section aria-label="Schedule reasons" className={cx(CARD, "flex flex-col gap-3 px-4 py-4 sm:px-5")}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-small font-medium text-ink">Schedule reasons</h3>
          <span className="min-w-0 text-caption [overflow-wrap:anywhere] text-smoke">Planned from {week.plannedFrom}</span>
        </div>
        {reasons.length === 0
          ? <p className="text-small text-smoke">No week reasons. Day reasons sit on their day below.</p>
          : <ul className="flex flex-col gap-2">
              {reasons.map((r, i) => (
                <li key={`${r.code}-${i}`} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <span className="shrink-0 text-small font-medium text-ink sm:w-40">{REASON_NAME[r.code]}</span>
                  <span className="text-small text-smoke">{r.sentence}</span>
                </li>
              ))}
            </ul>}
        {stop && <p className="border-t border-vellum-line pt-3 text-caption text-smoke">Last week in the chain. {stop}</p>}
      </section>
      <ScheduleCheckInView scheduleId="lab" schedule={week.schedule} student={week.student} checkIns={[]} readOnly header={<></>} padding="pt-0" />
    </div>
  );
}

function chainPlace(chain: LabChain | null, shown: number, testMonth: string) {
  if (!chain) return null;
  const at = Math.min(shown, chain.weeks.length - 1);
  const last = at === chain.weeks.length - 1;
  return { at, week: chain.weeks[at]!, canNext: !last || chain.end === null, stop: last ? chainEndText(chain.end, testMonth) : null };
}

type Built = { inputs: LabInputs; read: LabRead | null };

export function ScheduleLab({ thisWeek, start, copied, scanningOff }: {
  thisWeek: string; start: LabInputs; copied: CopiedStudent | null; scanningOff: boolean;
}) {
  const [inputs, setInputs] = useState(start);
  const screenshots = useLabScreenshots(scanningOff);
  const read = inputs.analytics.kind === "screenshots" ? screenshots.read : null;
  const [built, setBuilt] = useState<Built | null>(null);
  const [allDays, setAllDays] = useState(start.days.MONDAY);
  const errors = fieldErrors(inputs, read);
  const stale = hasErrors(errors);
  if (!stale && (built?.inputs !== inputs || built.read !== read)) setBuilt({ inputs, read });
  const showCopy = inputs.copiedFrom !== null ? copied : null;
  const [travel, setTravel] = useState<Travel | null>(null);
  const chain = useMemo(
    () => (built ? buildLabChain(built.inputs, built.inputs.copiedFrom !== null ? copied : null, built.read) : null),
    [built, copied],
  );
  const place = chainPlace(chain, inputs.shown, built?.inputs.testMonth ?? inputs.testMonth);
  const week = place?.week ?? null;

  const link = (next: LabInputs) => window.history.replaceState(null, "", `${window.location.pathname}?lab=${encodeLabLink(next)}`);
  const apply = (next: LabInputs) => {
    setInputs(next);
    setTravel(null);
    link(next);
  };
  const go = (to: number) => {
    setTravel(to > (place?.at ?? 0) ? "next" : "earlier");
    const next = showWeek(inputs, to);
    setInputs(next);
    setBuilt((last) => last && { ...last, inputs: showWeek(last.inputs, to) });
    link(next);
  };
  const lab: Lab = {
    inputs, thisWeek, copied: showCopy,
    set: (change) => apply({ ...inputs, ...change }),
    start: (next) => {
      apply(next);
      setAllDays(next.days.MONDAY);
    },
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div data-page-section className="flex flex-col gap-1">
          <h1 className="text-h3 font-semibold text-ink">Schedule lab</h1>
          <p className="text-small text-smoke">Type inputs and see the week the engine builds. Nothing here is saved.</p>
        </div>
        {stale && (
          <p role="status" className="flex items-start gap-2 rounded-sm border border-warning-line bg-warning-wash px-3 py-2 text-small text-ink">
            <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-pill bg-warning-ink" />
            <span>{week && <span className="font-medium">Showing the last week that built. </span>}{staleReason(errors)}</span>
          </p>
        )}
      </div>
      <div data-page-section className="grid items-start gap-x-6 gap-y-4 lg:grid-cols-[400px_minmax(0,1fr)]">
        <h2 className="order-1 flex min-h-8 items-center text-h4 font-semibold text-ink lg:order-none">Inputs</h2>
        <div className="order-3 flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-3 pt-4 lg:order-none lg:pt-0">
          <h2 className="text-h4 font-semibold text-ink">
            {week ? <>Week {week.number} <span className="font-regular text-smoke">· {shortDay(week.schedule.weekOf)}</span></> : "No week yet"}
          </h2>
          {place && <ChainButtons at={place.at} canNext={place.canNext} stop={place.stop} go={go} />}
        </div>
        <div role="region" aria-label="Inputs" className={cx(CARD, "order-2 min-w-0 lg:sticky lg:top-24 lg:order-none lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:[scrollbar-width:thin]")}>
          <Group title="Preset" note="Fills every input below">
            <PresetSelect lab={lab} />
            {showCopy && <CopiedNote copied={showCopy} />}
          </Group>
          <Group title="Goal">
            <div className="grid grid-cols-2 items-start gap-3">
              <Score lab={lab} which="current" label="Current PT score" message={errors.current} />
              <Score lab={lab} which="goal" label="Goal score" message={errors.goal} />
            </div>
            <TestMonth lab={lab} message={errors.testMonth} />
            <TestTimeChoice value={inputs.accommodation} onChange={(accommodation) => lab.set({ accommodation })} />
          </Group>
          <Group title="Analytics" note={plannedFrom(inputs.analytics, showCopy, read)}>
            <AnalyticsChoice lab={lab} />
            {inputs.analytics.kind === "screenshots" && <LabScreenshots slots={screenshots} />}
          </Group>
          <Group title="Week">
            <label className="flex min-w-0 flex-col gap-2">
              <span className="text-small font-medium text-ink">First week</span>
              <select value={inputs.weekOf} onChange={(e) => lab.set({ weekOf: e.target.value })} className={SELECT}>
                {labWeeks(thisWeek).map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
            </label>
            <WeekFields values={{ dailyCapacityMinutes: inputs.days, preferredPracticeTestDay: inputs.ptDay }} allDaysMinutes={allDays}
              accommodation={inputs.accommodation} dayMessages={errors.days}
              onAllDaysChange={setAllDays} onApplyAllDays={() => lab.set({ days: everyDay(allDays) })}
              onDayChange={(day, minutes) => lab.set({ days: { ...inputs.days, [day]: minutes } })} onPracticeTestDayChange={(ptDay) => lab.set({ ptDay })} />
          </Group>
        </div>
        <section aria-label="Built week" className="order-4 min-w-0 lg:order-none"><BuiltWeek week={week} stop={place?.stop ?? null} travel={travel} /></section>
      </div>
    </div>
  );
}
