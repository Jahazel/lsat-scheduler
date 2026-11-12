"use client";

import { useId, useState } from "react";
import { FOCUS, cx } from "@/components/ui/classes";
import type { Flow } from "./flow";
import { MISSED_TYPES, STATEMENTS, TYPED_STATEMENTS, valueProblem, type AccuracyRow, type ReviewState, type Tier } from "./reviewModel";

type List = "lr" | "rc";
const TIER: Record<Tier, string> = { highest: "Highest", medium: "Medium", low: "Low" };
const SWAP = "analytics-swap";
const CAPTION = "text-caption text-smoke";
const LINK = cx("font-medium text-ink underline underline-offset-[3px]", FOCUS);
// mobile-native: a small control keeps its look but gets a 44 px tall tap area.
const TALL_TAP = "relative after:absolute after:inset-x-0 after:-inset-y-3.5";
const SMALL_BUTTON = cx(
  "h-8 shrink-0 rounded-full border border-vellum-line bg-paper px-3 text-caption font-medium text-ink hover:bg-vellum transition-[transform,background-color] duration-(--duration-fast) ease-out active:scale-[0.97]",
  FOCUS,
);

function useReview(flow: Flow) {
  const typed = flow.values.input === "typed";
  const key = typed ? "typed" : "review";
  const review = flow.values[key];
  const [touched, setTouched] = useState<string[]>([]);
  const set = (change: (old: ReviewState) => Partial<ReviewState>) => flow.edit((old) => ({ [key]: { ...old[key], ...change(old[key]) } }));
  return {
    typed,
    review,
    touched: (type: string) => !typed || touched.includes(type),
    touch: (type: string) => setTouched((t) => (t.includes(type) ? t : [...t, type])),
    setValue: (list: List, type: string, value: string) => set((r) => ({ [list]: r[list].map((row) => (row.type === type ? { ...row, value } : row)) })),
    remove: (list: List, type: string) => set((r) => ({ [list]: r[list].filter((row) => row.type !== type) })),
    add: (type: string) => set((r) => ({ lr: [...r.lr, { kind: "accuracy", type, read: null, value: "" }] })),
    toggleFlag: (type: string) => set((r) => ({ flags: r.flags.map((f) => (f.type === type ? { ...f, on: !f.on } : f)) })),
    tick: (i: 0 | 1) => set((r) => ({ statements: (i === 0 ? [!r.statements[0], r.statements[1]] : [r.statements[0], !r.statements[1]]) as [boolean, boolean] })),
  };
}
type Review = ReturnType<typeof useReview>;

const edited = (row: AccuracyRow) => row.read !== null && row.value.trim() !== String(row.read);
const lowest = (rows: AccuracyRow[]) => rows.reduce<AccuracyRow | null>((low, row) => (valueProblem(row) || (low && Number(low.value) <= Number(row.value)) ? low : row), null)?.type;

function ValueInput({ row, label, showProblem, onChange, onBlur }: { row: AccuracyRow; label: string; showProblem: boolean; onChange: (value: string) => void; onBlur: () => void }) {
  const problem = showProblem && valueProblem(row);
  return (
    <label className={cx("relative flex h-9 w-[72px] shrink-0 items-center rounded-sm border bg-paper pr-2 after:absolute after:inset-x-0 after:-inset-y-1.5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent", problem ? "border-danger" : edited(row) ? "border-accent" : "border-vellum-line")}>
      <input
        inputMode="numeric"
        aria-label={label}
        aria-invalid={!!problem}
        value={row.value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
        onBlur={onBlur}
        className="h-full min-w-0 flex-1 bg-transparent pr-0.5 text-right text-body tabular-nums text-ink outline-none"
      />
      <span aria-hidden className="text-small text-smoke">%</span>
    </label>
  );
}

function RowNote({ row, r }: { row: AccuracyRow; r: Review }) {
  const problem = r.touched(row.type) && valueProblem(row);
  if (problem) return <span className="text-caption text-danger-ink">{problem}</span>;
  if (r.typed) return null;
  if (row.read === null) return <span className="text-caption text-accent">Added by you</span>;
  if (edited(row)) return <span className="text-caption text-accent">Was {row.read}%</span>;
  return null;
}

function AddType({ r }: { r: Review }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const options = MISSED_TYPES.filter((t) => !r.review.lr.some((row) => row.type === t));
  const label = r.typed ? "Add a question type" : "Add a type the screenshot missed";
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={cx("flex h-10 items-center gap-2 self-start text-small", LINK)}>
        <span aria-hidden className="text-body leading-none">+</span> {label}
      </button>
    );
  }
  return (
    <div className={cx("flex flex-wrap items-center gap-2", SWAP)}>
      <label htmlFor={id} className="sr-only">Question type to add</label>
      <select id={id} defaultValue="" onChange={(e) => { if (e.target.value) { r.add(e.target.value); setOpen(false); } }} className={cx("h-10 min-w-0 flex-1 rounded-sm border border-vellum-line bg-paper px-3 text-body text-ink", FOCUS)}>
        <option value="" disabled>Choose a question type</option>
        {options.map((t) => <option key={t}>{t}</option>)}
      </select>
      <button type="button" onClick={() => setOpen(false)} className={SMALL_BUTTON}>Cancel</button>
    </div>
  );
}

function ScreenshotMock({ list, rows }: { list: List; rows: AccuracyRow[] }) {
  return (
    <figure className={cx("flex flex-col gap-2", SWAP)}>
      <div aria-hidden className="overflow-hidden rounded-md border border-vellum-line bg-paper text-[11px] leading-[14px]">
        <div className="bg-graphite px-3 py-1.5 text-chalk">7Sage · Analytics</div>
        <div className="flex flex-col gap-1.5 p-3">
          <span className="font-semibold text-ink">{list === "lr" ? "Logical Reasoning · Question types" : "Reading Comprehension · Passage types"}</span>
          {rows.filter((row) => row.read !== null).map((row) => (
            <span key={row.type} className="flex items-center gap-2">
              <span className="w-[42%] shrink-0 truncate text-smoke">{row.type}</span>
              <span className="flex h-1 grow rounded-full bg-vellum"><span className="h-1 rounded-full bg-abyss-blue" style={{ width: `${row.read}%` }} /></span>
              <span className="w-8 shrink-0 text-right font-mono text-smoke">{row.read}%</span>
            </span>
          ))}
        </div>
      </div>
      <figcaption className="text-caption text-fog">Your screenshot. The prototype draws a stand-in.</figcaption>
    </figure>
  );
}

function SectionHead({ title, list, r }: { title: string; list: List; r: Review }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="text-body font-semibold text-ink">{title}</h2>
        {!r.typed && (
          <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={cx("shrink-0 text-caption", TALL_TAP, LINK)}>
            {open ? "Hide screenshot" : "Show screenshot"}
          </button>
        )}
      </div>
      {open && <ScreenshotMock list={list} rows={r.review[list]} />}
    </div>
  );
}

function RemoveButton({ type, onRemove }: { type: string; onRemove: () => void }) {
  return (
    <button type="button" aria-label={`Remove ${type}`} onClick={onRemove} className={cx("relative grid size-8 shrink-0 place-items-center rounded-full text-smoke after:absolute after:-inset-1.5 hover:bg-vellum hover:text-ink", FOCUS)}>
      <svg viewBox="0 0 12 12" aria-hidden className="size-3"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
    </button>
  );
}

function BarRows({ r, list }: { r: Review; list: List }) {
  const rows = r.review[list];
  const first = list === "rc" ? lowest(rows) : null;
  const removable = list === "lr" || r.typed;
  if (rows.length === 0) return <p className="py-2 text-small text-fog">No question types yet.</p>;
  return (
    <div className="flex flex-col gap-1">
      {rows.map((row) => {
        const n = valueProblem(row) ? 0 : Number(row.value);
        return (
          <div key={row.type} className="flex flex-col gap-1.5 py-2">
            <div className="flex items-center gap-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex flex-wrap items-baseline gap-x-2 text-small text-ink">
                  {row.type}
                  {first === row.type && <span className="text-caption font-medium text-accent">Goes first</span>}
                </span>
                <RowNote row={row} r={r} />
              </span>
              <ValueInput row={row} label={`${row.type} accuracy`} showProblem={r.touched(row.type)} onChange={(v) => r.setValue(list, row.type, v)} onBlur={() => r.touch(row.type)} />
              {removable && <RemoveButton type={row.type} onRemove={() => r.remove(list, row.type)} />}
            </div>
            <span aria-hidden className="relative h-1.5 rounded-full bg-vellum">
              {row.read !== null && edited(row) && <span className="absolute inset-y-0 left-0 rounded-full bg-fog/35" style={{ width: `${row.read}%` }} />}
              <span
                className={cx("absolute inset-0 transition-[clip-path] duration-(--duration-fast) ease-(--ease-out-strong) motion-reduce:transition-none", first === row.type ? "bg-accent" : "bg-accent/45")}
                style={{ clipPath: `inset(0 ${100 - n}% 0 0 round 9999px)` }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FlagSwitches({ r }: { r: Review }) {
  return (
    <div className="flex flex-col">
      {r.review.flags.map((f) => (
        <label key={f.type} className="flex min-h-11 cursor-pointer items-center gap-3 py-1.5">
          <span className="min-w-0 flex-1 text-small text-ink">{f.type}</span>
          <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-caption", f.tier === "highest" ? "bg-accent/8 font-medium text-accent" : "bg-vellum text-smoke")}>{TIER[f.tier]}</span>
          <input type="checkbox" role="switch" checked={f.on} onChange={() => r.toggleFlag(f.type)} className="peer sr-only" />
          <span aria-hidden className="relative h-6 w-10 shrink-0 rounded-full bg-vellum-line transition-colors duration-(--duration-fast) ease-out peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-paper after:shadow-e1 after:transition-transform after:duration-(--duration-fast) after:ease-(--ease-out-strong) peer-checked:after:translate-x-4" />
        </label>
      ))}
    </div>
  );
}

function MirrorFields({ r }: { r: Review }) {
  return (
    <>
      <section className="flex flex-col gap-2">
        <SectionHead title="Logical Reasoning" list="lr" r={r} />
        <p className={CAPTION}>{r.typed ? "Add each question type with its accuracy." : "Same order as your screenshot · grey shows the value we read before you changed it"}</p>
        <BarRows r={r} list="lr" />
        <AddType r={r} />
        {r.review.flags.length > 0 && (
          <>
            <p className={cx(CAPTION, "pt-4")}>Priority flags · switched-on flags go first</p>
            <FlagSwitches r={r} />
          </>
        )}
      </section>
      <section className="flex flex-col gap-2">
        <SectionHead title="Reading Comprehension" list="rc" r={r} />
        <p className={CAPTION}>The lowest passage type, in dark blue, goes first in your plan</p>
        <BarRows r={r} list="rc" />
      </section>
    </>
  );
}

export function TypedAnalytics({ flow }: { flow: Flow }) {
  const r = useReview(flow);
  return <div className="flex flex-col gap-8"><MirrorFields r={r} /></div>;
}

export function ReviewStep({ flow }: { flow: Flow }) {
  const r = useReview(flow);
  const statements = r.typed ? TYPED_STATEMENTS : STATEMENTS;
  return (
    <div className="flex flex-col gap-8">
      <MirrorFields r={r} />
      <fieldset className="flex flex-col gap-1 border-t border-vellum-line pt-4">
        <legend className="sr-only">Confirm your analytics</legend>
        {statements.map((text, i) => (
          <label key={text} className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5 text-small text-ink">
            <input type="checkbox" checked={r.review.statements[i]} onChange={() => r.tick(i as 0 | 1)} className="mt-0.5 size-[18px] shrink-0 accent-accent" />
            {text}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
