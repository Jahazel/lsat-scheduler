"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { AnalyticsStep } from "./analytics";
import { ReviewStep } from "./review";
import { REVIEW_DEMO, REVIEW_WORST, TYPED_START, reviewReason, valuesReason, type ReviewState } from "./reviewModel";
import { FOCUS, cx } from "@/components/ui/classes";
import { slideStep } from "@/lib/pageMotion";
import { GoalForm } from "./goal";
import { WeekStepperTable } from "./week";
import { goalScoreError } from "@/lib/studentProfile";
import { attemptProblem, inScoreRange, parseScoreText, type AttemptRow } from "@/lib/studyProfileDraft";
import type { FailureCode, UnexpectedFailure } from "@/lib/unexpectedFailure";
import type { Page, ReadOutcome, SaveOutcome } from "../view";
import { nextScreen } from "./motion";

export const STEPS = [
  { key: "goal", name: "Goal", title: "Set your goal score", lede: "Where you are now, where you want to be, and when." },
  { key: "week", name: "Week", title: "Pick your study days", lede: "How much time you can study each day. We choose your rest day." },
  { key: "analytics", name: "Analytics", title: "Add your 7Sage analytics", lede: "Two screenshots tell us what to drill first." },
  { key: "review", name: "Review", title: "Check what we read", lede: "Compare each value with your screenshots." },
] as const;

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Day = (typeof DAYS)[number];

export type Section = "LR" | "RC";
export type Upload = { name: string; read: boolean; problem?: string; refused?: string };

export type FlowValues = {
  firstName: string;
  current: string;
  goal: string;
  testDate: string;
  testTime: "standard" | "1.5" | "2";
  minutes: Record<Day, number>;
  ptDay: Day | null;
  files: Record<Section, Upload | null>;
  attempts: { taken: boolean; rows: AttemptRow[] };
  input: "screenshots" | "typed";
  review: ReviewState;
  typed: ReviewState;
  drills: Drill[];
};

export type Drill = { minutes: number; label: string; why: string };

const DEMO_DRILLS: Drill[] = [
  { minutes: 35, label: "Diagram", why: "64% accuracy" },
  { minutes: 30, label: "Law passages", why: "58% accuracy" },
  { minutes: 25, label: "Phenomenon-hypothesis", why: "Highest priority" },
];

const DEMO: FlowValues = {
  firstName: "Dana",
  current: "150",
  goal: "165",
  testDate: "January 2027",
  testTime: "standard",
  minutes: { Mon: 90, Tue: 90, Wed: 120, Thu: 90, Fri: 60, Sat: 210, Sun: 120 },
  ptDay: "Sat",
  files: { LR: null, RC: null },
  attempts: { taken: false, rows: [{ id: 1, score: "", month: "" }] },
  input: "screenshots",
  review: REVIEW_DEMO,
  typed: TYPED_START,
  drills: DEMO_DRILLS,
};

// Test data: the longest realistic first name, the widest accommodation and month, all 10 official attempts with an
// empty score, a typo, and a missing month among them, and a week at the schema limits (30 min to 8 h,
// src/lib/studentProfile.ts) with the widest time label and a practice-test day too short for 2× time,
// a full-length macOS screenshot name, and a screenshot the reader could not read.
const WORST: FlowValues = {
  ...DEMO,
  firstName: "Christopher-Alexander",
  current: "120",
  goal: "180",
  testDate: "February 2027",
  testTime: "2",
  minutes: { Mon: 465, Tue: 480, Wed: 210, Thu: 30, Fri: 480, Sat: 480, Sun: 480 },
  ptDay: "Wed",
  files: {
    LR: { name: "Screenshot 2026-11-11 at 8.35.04 PM (2) – 7Sage Analytics – Logical Reasoning.png", read: true },
    RC: { name: "IMG_4821.png", read: false, problem: "We couldn't read the rows in it." },
  },
  review: REVIEW_WORST,
  // A 7 h 45 Monday split into many drills with the longest real type names.
  drills: [
    { minutes: 60, label: "Necessary + Sufficient assumption", why: "71% accuracy" },
    { minutes: 60, label: "Flaw or descriptive weakening", why: "0% accuracy" },
    { minutes: 60, label: "Resolve reconcile or explain", why: "Highest priority" },
    { minutes: 60, label: "Humanities passages", why: "0% accuracy" },
    { minutes: 60, label: "Phenomenon-hypothesis (LR)", why: "Highest priority" },
    { minutes: 60, label: "Parallel reasoning", why: "33% accuracy" },
    { minutes: 45, label: "Method of reasoning", why: "50% accuracy" },
    { minutes: 60, label: "Comparative passages", why: "58% accuracy" },
  ],
  attempts: {
    taken: true,
    rows: [
      { id: 1, score: "180", month: "2026-10" }, { id: 2, score: "120", month: "2026-08" }, { id: 3, score: "", month: "2026-06" },
      { id: 4, score: "185", month: "2026-04" }, { id: 5, score: "151", month: "" }, { id: 6, score: "149", month: "2025-11" },
      { id: 7, score: "152", month: "2025-09" }, { id: 8, score: "150", month: "2025-06" }, { id: 9, score: "147", month: "2025-01" },
      { id: 10, score: "144", month: "2021-12" },
    ],
  },
};

// Test data: nothing typed or picked yet, as on a first arrival or after a reload.
const EMPTY: FlowValues = { ...DEMO, current: "", goal: "", testDate: "", ptDay: null };

export const DATA: Record<"demo" | "worst" | "empty", FlowValues> = { demo: DEMO, worst: WORST, empty: EMPTY };

export type Reveal = "drills" | "skipped" | "admin";

/** Toolbar choices that stand in for the server: how a save and a screenshot read end, and whether scanning is on. */
export type Cases = { save: SaveOutcome; read: ReadOutcome; scanOff: boolean; leave: (page: Page) => void };
const CASES: Cases = { save: "saves", read: "reads", scanOff: false, leave: () => {} };

export type SaveState = "idle" | "saving" | "failed" | { refused: string };
const SAVE_MS = 1600;
// Test data: a made-up error code in the real toast.
const SAVE_FAILURE: UnexpectedFailure = { unexpectedFailure: "3f9a01c2" as FailureCode };
const SAVE_REFUSAL = "You've saved your analytics 5 times today. Try again tomorrow, after midnight Central time.";

export type Flow = {
  index: number;
  done: boolean;
  skipped: boolean;
  admin: boolean;
  skip: () => void;
  atPlan: boolean;
  toPlan: () => void;
  cases: Cases;
  save: SaveState;
  saveAnswer: unknown;
  values: FlowValues;
  edit: (values: Partial<FlowValues> | ((old: FlowValues) => Partial<FlowValues>)) => void;
  go: (dir: 1 | -1) => void;
  canContinue: boolean;
};

export const TEST_DATES = [
  { label: "January 2027", short: "Jan 2027", weeks: 7 },
  { label: "February 2027", short: "Feb 2027", weeks: 12 },
  { label: "April 2027", short: "Apr 2027", weeks: 20 },
  { label: "June 2027", short: "Jun 2027", weeks: 29 },
];

export function scoreProblem(values: FlowValues, box: "current" | "goal"): string | null {
  const text = values[box];
  if (text.trim() === "") return null;
  const score = parseScoreText(text);
  if (!inScoreRange(score)) return `LSAT scores go from 120 to 180. Check ${box === "current" ? "your current score" : "your goal score"}.`;
  const current = parseScoreText(values.current);
  return box === "goal" && inScoreRange(current) ? goalScoreError(current, score) : null;
}

export const PT_NEEDS: Record<FlowValues["testTime"], number> = { standard: 150, "1.5": 195, "2": 225 };

export function weekProblem(values: FlowValues): string | null {
  if (!values.ptDay) return "Pick your practice-test day to continue.";
  const needed = PT_NEEDS[values.testTime];
  if (values.minutes[values.ptDay] < needed) return `${DAY_NAMES[values.ptDay]} needs at least ${hours(needed)} for a full practice test. Add time or pick another day.`;
  return null;
}

export const DAY_NAMES: Record<Day, string> = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };

export function goalReady(values: FlowValues) {
  return (
    inScoreRange(parseScoreText(values.current)) &&
    inScoreRange(parseScoreText(values.goal)) &&
    !scoreProblem(values, "goal") &&
    values.testDate !== "" &&
    (!values.attempts.taken || values.attempts.rows.every((row) => !attemptProblem(row)))
  );
}

export function useFlow(start: FlowValues = DEMO, startAt = 0, reveal: Reveal = "drills", cases: Cases = CASES): [Flow, React.RefObject<HTMLDivElement | null>, React.RefObject<HTMLDivElement | null>] {
  const [index, setIndex] = useState(Math.min(startAt, STEPS.length - 1));
  const [done, setDone] = useState(startAt >= STEPS.length);
  const [skipped, setSkipped] = useState(reveal === "skipped");
  const [atPlan, setAtPlan] = useState(startAt > STEPS.length && reveal !== "admin");
  const [values, setValues] = useState(() => (cases.scanOff ? { ...start, input: "typed" as const } : start));
  const [save, setSave] = useState<SaveState>("idle");
  const [saveAnswer, setSaveAnswer] = useState<unknown>(null);
  const tries = useRef(0);
  const region = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const key = STEPS[index].key;
  const saving = save === "saving";
  const ready = key === "goal" ? goalReady(values) : key === "week" ? !weekProblem(values) : key === "review" ? !reviewReason(activeReview(values), values.input === "typed") : key !== "analytics" ? true : values.input === "typed" ? !valuesReason(values.typed, true, "continue") : !!values.files.LR?.read && !!values.files.RC?.read;
  const saveThen = (withoutAnalytics: boolean) => {
    if (saving) return;
    setSave("saving");
    tries.current += 1;
    timer.current = setTimeout(() => {
      if (cases.save === "refused") return setSave({ refused: SAVE_REFUSAL });
      if (cases.save === "fails" && tries.current === 1) {
        setSave("failed");
        setSaveAnswer(SAVE_FAILURE);
        return;
      }
      setSaveAnswer(null);
      nextScreen(area.current, "fade", () => {
        setSave("idle");
        setSkipped(withoutAnalytics);
        setDone(true);
      });
    }, SAVE_MS);
  };
  const go = (dir: 1 | -1) => {
    if (saving) return;
    if (dir === 1 && index === STEPS.length - 1) return saveThen(false);
    const update = () => {
      setSave("idle");
      setIndex((i) => Math.min(STEPS.length - 1, Math.max(0, i + dir)));
    };
    if (region.current) slideStep(region.current, dir * 8, update);
    else update();
  };
  const flow: Flow = {
    index,
    done,
    skipped,
    admin: reveal === "admin",
    skip: () => saveThen(true),
    atPlan,
    toPlan: () => nextScreen(area.current, "slide", () => setAtPlan(true)),
    cases,
    save,
    saveAnswer,
    values,
    edit: (v) => setValues((old) => ({ ...old, ...(typeof v === "function" ? v(old) : v) })),
    go,
    canContinue: ready && !saving,
  };
  return [flow, region, area];
}

export const hours = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h && m ? `${h} h ${m}` : h ? `${h} h` : `${m} min`;
};

export function Ring({ value, size = 20, className }: { value: number; size?: number; className?: string }) {
  const r = (size - 3) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className={cx("-rotate-90 shrink-0", className)}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-vellum-line" strokeWidth={2} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className="stroke-accent transition-[stroke-dashoffset] duration-(--duration-base) ease-(--ease-out-strong) motion-reduce:transition-none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
      />
    </svg>
  );
}

export function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={cx("size-5 shrink-0", className)}>
      <circle cx="10" cy="10" r="10" className="fill-accent" />
      <path d="m6 10.2 2.6 2.6L14 7.4" fill="none" className="stroke-paper" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


export type Bodies = Partial<Record<(typeof STEPS)[number]["key"], (props: { flow: Flow }) => ReactNode>>;

export function StepBody({ flow, bodies = {} }: { flow: Flow; bodies?: Bodies }) {
  const key = STEPS[flow.index].key;
  const Override = bodies[key];
  if (Override) return <Override flow={flow} />;
  return key === "goal" ? <GoalForm flow={flow} /> : key === "week" ? <WeekStepperTable flow={flow} /> : key === "analytics" ? <AnalyticsStep flow={flow} /> : <ReviewStep flow={flow} />;
}

export function StepHeading({ flow, eyebrow }: { flow: Flow; eyebrow?: ReactNode }) {
  const step = STEPS[flow.index];
  return (
    <div className="flex flex-col gap-2">
      {eyebrow}
      <h1 className="text-h3 font-semibold text-ink [overflow-wrap:anywhere]">{flow.index === 0 ? `Hi ${flow.values.firstName}, set your goal score` : step.key === "review" && flow.values.input === "typed" ? "Check your analytics" : step.title}</h1>
      <p className="text-body text-smoke">{step.key === "review" && flow.values.input === "typed" ? "These are the values you typed. Fix any value here. Nothing counts until you confirm." : step.key === "analytics" && flow.values.input === "typed" ? "Type the values from your 7Sage Analytics page. They tell us what to drill first." : step.lede}</p>
    </div>
  );
}

export const activeReview = (values: FlowValues) => (values.input === "typed" ? values.typed : values.review);

const SAVE_AGAIN: Partial<Record<(typeof STEPS)[number]["key"], string>> = { analytics: "Skip for now", review: "Confirm snapshot" };

function ActionNote({ flow }: { flow: Flow }) {
  const { values, save } = flow;
  const step = STEPS[flow.index].key;
  const typed = values.input === "typed";
  const note = save === "saving" ? "Saving your plan. This takes a few seconds."
    : save === "failed" ? `We couldn't save your plan. Press ${SAVE_AGAIN[step]} again.`
    : typeof save === "object" ? save.refused
    : step === "review" ? reviewReason(activeReview(values), typed)
    : step === "analytics" && typed ? valuesReason(values.typed, true, "continue")
    : null;
  return <p role="status" className="text-center text-small text-smoke empty:hidden">{note}</p>;
}

const SKIP_LINK = cx("relative font-medium text-ink underline underline-offset-[3px] after:absolute after:inset-x-0 after:-inset-y-3.5 aria-disabled:no-underline", FOCUS);

export function StepActions({ flow, className }: { flow: Flow; className?: string }) {
  const last = flow.index === STEPS.length - 1;
  const saving = flow.save === "saving";
  return (
    <div className={cx("flex flex-col gap-3", className)}>
      <div className="flex gap-3">
        {flow.index > 0 && <Button variant="outline" disabled={saving} onClick={() => flow.go(-1)}>Back</Button>}
        <Button className="flex-1" disabled={!flow.canContinue && !(last && saving)} waiting={last && saving} waitLabel="Saving…" onClick={() => flow.go(1)}>
          {last ? "Confirm snapshot" : "Continue"}
        </Button>
      </div>
      {STEPS[flow.index].key === "analytics" && (
        <p className="text-center text-small text-smoke">
          <Button variant="bare" waiting={saving} waitLabel="Saving…" holdsWidth={false} onClick={flow.skip} className={SKIP_LINK}>Skip for now</Button>
          {flow.values.input === "typed" ? " · Your schedule starts after you add your analytics." : " · Your schedule starts after you add both."}
        </p>
      )}
      <ActionNote flow={flow} />
    </div>
  );
}
