import { weightedTrend } from "@/lib/currentWeeklySchedule";
import { DAY_ORDER, generateWeek } from "@/lib/engine";
import { mockAnalytics, mockRules } from "@/lib/mockData";
import { generateSampleAnalytics, type SampleDirection } from "@/lib/sampleAnalytics";
import { dailyCapacityError, everyDay, practiceTestDayError, upcomingTestMonths } from "@/lib/studentProfile";
import { goalScoreMessage, inScoreRange, parseScoreText, scoreRangeMessage, type Accommodation } from "@/lib/studyProfileDraft";
import type { AnalyticsSnapshot, DayOfWeek, LRStemType, Student as LiveStudent, WeeklySchedule } from "@/lib/types";
import type { Student } from "../data";
import { detailFor, liveStudentFor } from "../detail/data";

export type Missed = Partial<Record<LRStemType, number>>;
export type Analytics =
  | { kind: "sample"; direction: SampleDirection }
  | { kind: "student"; name: string }
  | { kind: "upload" }
  | { kind: "screenshots"; snapshot: AnalyticsSnapshot; missed?: Missed; summary: string };
export type LabDraft = {
  start: string;
  copied: { name: string; on: string | null } | null;
  weekOf: string;
  current: string;
  goal: string;
  testMonth: string;
  accommodation: Accommodation;
  days: Record<DayOfWeek, number>;
  ptDay: DayOfWeek;
  analytics: Analytics;
  built: number;
  shown: number;
};

export const FIRST_LAB_WEEK = "2026-11-16";
const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
export const shortDay = (iso: string) => SHORT.format(new Date(`${iso}T00:00:00Z`));
export const WEEK_OPTIONS = Array.from({ length: 26 }, (_, i) => addDays(FIRST_LAB_WEEK, i * 7)).map((value) => ({ value, label: `Week of ${shortDay(value)}` }));
export const testMonthsFor = (weekOf: string) => upcomingTestMonths(weekOf);

const BASE: Omit<LabDraft, "start" | "analytics"> = {
  copied: null, weekOf: FIRST_LAB_WEEK, current: "150", goal: "165", testMonth: "2027-02-01", accommodation: 1,
  days: { ...everyDay(120), SATURDAY: 210 }, ptDay: "SATURDAY", built: 1, shown: 0,
};

export type Preset = { id: string; label: string; group: "Sample directions" | "Edge cases"; says: string; draft: LabDraft };
const preset = (id: string, label: string, group: Preset["group"], says: string, change: Partial<LabDraft>): Preset =>
  ({ id, label, group, says, draft: { ...BASE, start: id, analytics: { kind: "sample", direction: "steady" }, ...change } });

export const PRESETS: Preset[] = [
  preset("improving", "Improving", "Sample directions", "150 → 165, 2 h a day, accuracy going up", { analytics: { kind: "sample", direction: "improving" } }),
  preset("steady", "Steady", "Sample directions", "150 → 165, 2 h a day, accuracy flat", {}),
  preset("slipping", "Slipping", "Sample directions", "150 → 165, 2 h a day, accuracy going down", { analytics: { kind: "sample", direction: "slipping" } }),
  preset("double", "2× time", "Edge cases", "Steady, with 2× test time and a 4 h Saturday", { accommodation: 2, days: { ...everyDay(120), SATURDAY: 240 } }),
  preset("soon", "Test in 3 weeks", "Edge cases", "Steady, week of Dec 21 before the January test", { weekOf: "2026-12-21", testMonth: "2027-01-01" }),
  preset("short", "30 min days", "Edge cases", "Steady, 30 min every day and 2 h 30 on Saturday", { days: { ...everyDay(30), SATURDAY: 150 } }),
];
export const START_PRESET = PRESETS[1]!;

export function draftFromStudent(student: Student): LabDraft {
  const name = student.name ?? student.email;
  const detail = detailFor(student);
  if (detail.current === null) return { ...START_PRESET.draft, copied: { name, on: null } };
  const live = liveStudentFor(student, detail.current, detail.goal);
  return {
    start: `student:${student.id}`, copied: { name, on: "Nov 13" }, weekOf: FIRST_LAB_WEEK,
    current: String(live.currentScore), goal: String(live.goalScore), testMonth: live.goalTestDate, accommodation: live.accommodationMultiplier,
    days: live.dailyCapacityMinutes, ptDay: live.preferredPracticeTestDay, analytics: { kind: "student", name }, built: 1, shown: 0,
  };
}

export type LabErrors = { current?: string; goal?: string; testMonth?: string; analytics?: string; days: Partial<Record<DayOfWeek, string>> };
export function errorsOf(d: LabDraft): LabErrors {
  const current = parseScoreText(d.current);
  const errors: LabErrors = { days: {} };
  if (!inScoreRange(current)) errors.current = scoreRangeMessage("the current score");
  const goal = inScoreRange(current) ? goalScoreMessage(current, d.goal) : inScoreRange(parseScoreText(d.goal)) ? null : scoreRangeMessage("the goal score");
  if (goal) errors.goal = goal;
  if (!testMonthsFor(d.weekOf).some((m) => m.value === d.testMonth)) errors.testMonth = "Choose a test month after this week.";
  if (d.analytics.kind === "upload") errors.analytics = "Add the Logical Reasoning and Reading Comprehension screenshots to build a week.";
  for (const day of DAY_ORDER) {
    const message = dailyCapacityError(d.days[day]);
    if (message) errors.days[day] = message;
  }
  const pt = practiceTestDayError({ dailyCapacityMinutes: d.days, preferredPracticeTestDay: d.ptDay }, d.accommodation);
  if (pt) errors.days[d.ptDay] ??= pt;
  return errors;
}
export const hasErrors = (e: LabErrors) => errorCount(e) > 0;
export const errorCount = (e: LabErrors) => [e.current, e.goal, e.testMonth, e.analytics].filter(Boolean).length + Object.keys(e.days).length;

function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED: Record<SampleDirection, number> = { improving: 11, steady: 22, slipping: 33 };

const RESTRICTED = mockRules.lrLogicTypes.filter((t) => !mockRules.lrLogicExceptions.includes(t));
const REGULAR = [...mockRules.lrStemTypes, ...mockRules.lrLogicExceptions];

function sampleUploads(direction: SampleDirection, currentScore: number, count: number): AnalyticsSnapshot[] {
  const uploads: AnalyticsSnapshot[] = [];
  for (let i = 0; i < count; i++) {
    const values = generateSampleAnalytics({
      previous: uploads[i - 1] ?? null, direction, currentScore, earlierSampleCount: i,
      regularTypes: REGULAR, restrictedTypes: RESTRICTED, random: seeded(SEED[direction] + i),
    });
    uploads.push({ weekOf: "", ...values });
  }
  return uploads;
}

export const MAX_WEEKS = 12;
export type LabWeek = { schedule: WeeklySchedule; student: LiveStudent; weekOf: string; number: number; analytics: string };
export type ChainEnd = { kind: "test"; nextWeekOf: string } | { kind: "limit" } | null;
export type Chain = { weeks: LabWeek[]; end: ChainEnd };

export function buildChain(d: LabDraft): Chain | null {
  if (hasErrors(errorsOf(d))) return null;
  const student: LiveStudent = {
    currentScore: Number(d.current), goalScore: Number(d.goal), dailyCapacityMinutes: d.days,
    preferredPracticeTestDay: d.ptDay, accommodationMultiplier: d.accommodation, goalTestDate: d.testMonth,
  };
  const a = d.analytics;
  const depth = Math.min(Math.max(d.built, 1), MAX_WEEKS);
  const uploads = a.kind === "sample" ? sampleUploads(a.direction, student.currentScore, depth) : [];
  const weeks: LabWeek[] = [];
  for (let i = 0; i < depth; i++) {
    const weekOf = addDays(d.weekOf, i * 7);
    if (weekOf >= d.testMonth) return { weeks, end: { kind: "test", nextWeekOf: weekOf } };
    const analytics = a.kind === "sample" ? weightedTrend(uploads.slice(0, i + 1).reverse(), weekOf)
      : a.kind === "screenshots" ? { ...a.snapshot, weekOf } : { ...mockAnalytics, weekOf };
    const prior = weeks.map((w) => w.schedule);
    const sunday = prior.at(-1)?.days.SUNDAY;
    const schedule = generateWeek(student, analytics, mockRules, d.copied?.name ?? "Lab", {
      priorSchedules: prior,
      priorWeekPracticeTestReviewMinutes: sunday?.type === "practice_test" ? sunday.activities.find((x) => x.kind === "PT")?.minutes : undefined,
      missedStemTypeCounts: i === 0 && a.kind === "screenshots" ? a.missed : undefined,
    });
    weeks.push({ schedule, student, weekOf, number: i + 1, analytics: analyticsSource(a, i) });
  }
  const nextWeekOf = addDays(d.weekOf, depth * 7);
  return { weeks, end: depth === MAX_WEEKS ? { kind: "limit" } : nextWeekOf >= d.testMonth ? { kind: "test", nextWeekOf } : null };
}

function analyticsSource(a: Analytics, i: number) {
  if (a.kind === "sample") return i === 0 ? `${DIRECTION_LABEL[a.direction]} sample` : `${DIRECTION_LABEL[a.direction]} sample, week ${i + 1} upload`;
  return i === 0 ? analyticsLabel(a) : `${analyticsLabel(a)}, as in week 1`;
}

function chainPlace(built: unknown, shown: unknown) {
  const b = Number.isInteger(built) ? Math.min(Math.max(built as number, 1), MAX_WEEKS) : 1;
  return { built: b, shown: Number.isInteger(shown) ? Math.min(Math.max(shown as number, 0), b - 1) : 0 };
}

export const DIRECTION_LABEL: Record<SampleDirection, string> = { improving: "Improving", steady: "Steady", slipping: "Slipping" };
export function analyticsLabel(a: Analytics) {
  if (a.kind === "sample") return `${DIRECTION_LABEL[a.direction]} sample`;
  if (a.kind === "student") return `${a.name}'s latest upload`;
  return a.kind === "upload" ? "Screenshots not read yet" : `Screenshots: ${a.summary}`;
}

type Linked = Omit<LabDraft, "analytics"> & { analytics: Exclude<Analytics, { kind: "screenshots" }> };
export function encodeDraft(d: LabDraft): string {
  const linked: Linked = { ...d, analytics: d.analytics.kind === "screenshots" ? { kind: "upload" } : d.analytics };
  return btoa(unescape(encodeURIComponent(JSON.stringify(linked)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function decodeDraft(text: string): LabDraft | null {
  if (!text) return null;
  try {
    const d = JSON.parse(decodeURIComponent(escape(atob(text.replace(/-/g, "+").replace(/_/g, "/"))))) as Partial<LabDraft>;
    const days = d.days && DAY_ORDER.every((day) => typeof d.days![day] === "number") ? d.days : null;
    if (typeof d.start !== "string" || typeof d.weekOf !== "string" || typeof d.current !== "string" || typeof d.goal !== "string"
      || typeof d.testMonth !== "string" || ![1, 1.5, 2].includes(d.accommodation as number) || !days || !DAY_ORDER.includes(d.ptDay!) || !d.analytics) return null;
    return { start: d.start, copied: d.copied ?? null, weekOf: d.weekOf, current: d.current, goal: d.goal, testMonth: d.testMonth,
      accommodation: d.accommodation!, days, ptDay: d.ptDay!, analytics: d.analytics,
      ...chainPlace(d.built, d.shown) };
  } catch {
    return null;
  }
}
