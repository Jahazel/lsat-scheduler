import { z } from "zod";
import { summarizeAnalyticsRows } from "./analytics";
import { weightedTrend } from "./currentWeeklySchedule";
import { DAY_ORDER, generateWeek } from "./engine";
import { mockRules } from "./mockData";
import { generateSampleAnalytics, type SampleDirection } from "./sampleAnalytics";
import { isoDateInWeek } from "./scheduleReasonText";
import { dailyCapacityError, everyDay, practiceTestDayError } from "./studentProfile";
import { testMonthOptions } from "./testMonths";
import { goalScoreMessage, inScoreRange, parseScoreText, scoreRangeMessage, type Accommodation } from "./studyProfileDraft";
import type { PracticeTestResult } from "./practiceTestResult";
import type { AnalyticsExtractedRow, AnalyticsTrend, DayOfWeek, PlanningAnalytics, ScheduleReasonCode, Student, WeeklySchedule } from "./types";

export type LabAnalytics = { kind: "sample"; direction: SampleDirection } | { kind: "student" } | { kind: "screenshots" };
export type LabRead = { lr: AnalyticsExtractedRow[]; rc: AnalyticsExtractedRow[]; practiceTest: PracticeTestResult | null };
export type PresetId = "improving" | "steady" | "slipping" | "double" | "soon" | "short";

export type LabInputs = {
  preset: PresetId | "student";
  copiedFrom: string | null;
  weekOf: string;
  current: string;
  goal: string;
  testMonth: string;
  accommodation: Accommodation;
  days: Record<DayOfWeek, number>;
  ptDay: DayOfWeek;
  analytics: LabAnalytics;
  built: number;
  shown: number;
};

export type CopiedStudent = { id: string; name: string; uploadedOn: string | null; trend: AnalyticsTrend | null };

export type LabErrors = { current?: string; goal?: string; testMonth?: string; screenshots?: string; days: Partial<Record<DayOfWeek, string>> };

export type LabWeek = { number: number; schedule: WeeklySchedule; student: Student; plannedFrom: string };
export type ChainEnd = { kind: "limit" } | { kind: "test"; nextWeekOf: string } | null;
export type LabChain = { weeks: LabWeek[]; end: ChainEnd };

export const MAX_WEEKS = 12;

export const WEEK_COUNT = 26;
export const DIRECTION_LABEL: Record<SampleDirection, string> = { improving: "Improving", steady: "Steady", slipping: "Slipping" };
export const PRESET_GROUPS = ["Sample directions", "Edge cases"] as const;

export const REASON_NAME: Record<ScheduleReasonCode, string> = {
  capacity_overage: "Over daily time",
  skip_reduction: "Lighter week",
  starred_rotation: "Starred rotation",
  full_section_dropped: "No full section",
  rest_day_moved: "Rest day moved",
  no_practice_test: "No practice test",
  near_test_week: "Near-test week",
  unscheduled_day: "Not scheduled",
  review_carried_over: "Review carried over",
  practice_test_review_day_next_week: "Review next Monday",
  missed_type_priority: "Missed type first",
};

const SHORT_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
export const shortDay = (iso: string) => SHORT_DAY.format(new Date(`${iso}T00:00:00Z`));

export const labWeeks = (thisWeek: string) =>
  Array.from({ length: WEEK_COUNT }, (_, i) => isoDateInWeek(thisWeek, i * 7)).map((value) => ({ value, label: `Week of ${shortDay(value)}` }));

const mondayOnOrBefore = (iso: string) => isoDateInWeek(iso, -((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7));

function steadyTestMonth(thisWeek: string, testMonths: readonly string[]) {
  const months = testMonthOptions(testMonths, thisWeek).map((m) => m.value);
  return months.find((month) => month >= isoDateInWeek(thisWeek, 8 * 7)) ?? months.at(-1) ?? "";
}

function nearTestWeek(thisWeek: string, testMonths: readonly string[]) {
  const weeks = labWeeks(thisWeek).map((w) => w.value);
  for (const { value } of testMonthOptions(testMonths, thisWeek)) {
    const weekOf = mondayOnOrBefore(isoDateInWeek(value, -7));
    if (weeks.includes(weekOf)) return { weekOf, testMonth: value };
  }
  return { weekOf: thisWeek, testMonth: steadyTestMonth(thisWeek, testMonths) };
}

const steadyInputs = (thisWeek: string, testMonths: readonly string[]): LabInputs => ({
  preset: "steady", copiedFrom: null, weekOf: thisWeek, current: "150", goal: "165", testMonth: steadyTestMonth(thisWeek, testMonths),
  accommodation: 1, days: { ...everyDay(120), SATURDAY: 210 }, ptDay: "SATURDAY", analytics: { kind: "sample", direction: "steady" },
  built: 1, shown: 0,
});

export type Preset = { id: PresetId; label: string; group: (typeof PRESET_GROUPS)[number]; inputs: LabInputs };

export function presets(thisWeek: string, testMonths: readonly string[]): Preset[] {
  const steady = steadyInputs(thisWeek, testMonths);
  const preset = (id: PresetId, label: string, group: Preset["group"], change: Partial<LabInputs>): Preset =>
    ({ id, label, group, inputs: { ...steady, ...change, preset: id } });
  return [
    preset("improving", "Improving", "Sample directions", { analytics: { kind: "sample", direction: "improving" } }),
    preset("steady", "Steady", "Sample directions", {}),
    preset("slipping", "Slipping", "Sample directions", { analytics: { kind: "sample", direction: "slipping" } }),
    preset("double", "2× time", "Edge cases", { accommodation: 2, days: { ...everyDay(120), SATURDAY: 240 } }),
    preset("soon", "Test in 3 weeks", "Edge cases", nearTestWeek(thisWeek, testMonths)),
    preset("short", "30 min days", "Edge cases", { days: { ...everyDay(30), SATURDAY: 150 } }),
  ];
}

export function presetInputs(id: string, thisWeek: string, testMonths: readonly string[]) {
  const all = presets(thisWeek, testMonths);
  return (all.find((p) => p.id === id) ?? all[1]!).inputs;
}

export function copiedInputs(student: Student, copied: CopiedStudent, thisWeek: string, testMonths: readonly string[]): LabInputs {
  if (!copied.trend) return { ...steadyInputs(thisWeek, testMonths), copiedFrom: copied.id };
  return {
    preset: "student", copiedFrom: copied.id, weekOf: thisWeek,
    current: String(student.currentScore), goal: String(student.goalScore), testMonth: student.goalTestDate,
    accommodation: student.accommodationMultiplier, days: student.dailyCapacityMinutes, ptDay: student.preferredPracticeTestDay,
    analytics: { kind: "student" }, built: 1, shown: 0,
  };
}

export function fieldErrors(inputs: LabInputs, testMonths: readonly string[], read: LabRead | null = null): LabErrors {
  const errors: LabErrors = { days: {} };
  if (inputs.analytics.kind === "screenshots" && !read) errors.screenshots = "Add the Logical Reasoning and Reading Comprehension screenshots.";
  const current = parseScoreText(inputs.current);
  if (!inScoreRange(current)) errors.current = scoreRangeMessage("the current score");
  const goal = inScoreRange(current)
    ? goalScoreMessage(current, inputs.goal)
    : inScoreRange(parseScoreText(inputs.goal)) ? null : scoreRangeMessage("the goal score");
  if (goal) errors.goal = goal;
  if (!testMonthOptions(testMonths, inputs.weekOf).some((m) => m.value === inputs.testMonth)) errors.testMonth = "Choose a test month after this week.";
  for (const day of DAY_ORDER) {
    const message = dailyCapacityError(inputs.days[day]);
    if (message) errors.days[day] = message;
  }
  const pt = practiceTestDayError({ dailyCapacityMinutes: inputs.days, preferredPracticeTestDay: inputs.ptDay }, inputs.accommodation);
  if (pt) errors.days[inputs.ptDay] ??= pt;
  return errors;
}

export const hasErrors = (errors: LabErrors) =>
  Boolean(errors.current || errors.goal || errors.testMonth || errors.screenshots) || Object.keys(errors.days).length > 0;

export function staleReason(errors: LabErrors) {
  const fields = [
    errors.current && "current PT score", errors.goal && "goal score", errors.testMonth && "goal test month",
    Object.keys(errors.days).length > 0 && "study time",
  ].filter((field): field is string => Boolean(field));
  return [fields.length > 0 && `Fix the ${fields.join(", ")}.`, errors.screenshots].filter(Boolean).join(" ");
}

const SEED: Record<SampleDirection, number> = { improving: 11, steady: 22, slipping: 33 };

function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleUploads(direction: SampleDirection, currentScore: number, count: number) {
  const uploads: ReturnType<typeof generateSampleAnalytics>[] = [];
  for (let i = 0; i < count; i++) {
    const previous = uploads.at(-1);
    uploads.push(generateSampleAnalytics({
      previous: previous ? { weekOf: "", ...previous } : null, direction, currentScore, earlierSampleCount: i,
      regularTypes: [...mockRules.lrStemTypes, ...mockRules.lrLogicExceptions],
      restrictedTypes: mockRules.lrLogicTypes.filter((type) => !mockRules.lrLogicExceptions.includes(type)),
      random: seeded(SEED[direction] + i),
    }));
  }
  return uploads;
}

export function readSummary(read: LabRead) {
  const parts = [`${read.lr.filter((row) => row.category === "regular").length} LR types`, `${read.rc.length} RC types`];
  if (read.practiceTest) parts.push(`PT ${read.practiceTest.prepTest}, ${read.practiceTest.missedQuestions} missed`);
  return parts.join(" · ");
}

export function plannedFrom(analytics: LabAnalytics, copied: CopiedStudent | null, read: LabRead | null, weekNumber = 1) {
  if (analytics.kind === "sample") {
    const sample = `${DIRECTION_LABEL[analytics.direction]} sample`;
    return weekNumber === 1 ? sample : `${sample}, week ${weekNumber} upload`;
  }
  if (analytics.kind === "screenshots" && !read) return "Screenshots not read yet";
  const upload = analytics.kind === "screenshots" && read ? `Screenshots: ${readSummary(read)}` : `${copied?.name}'s latest upload`;
  return weekNumber === 1 ? upload : `${upload}, as in week 1`;
}

const priorSundayTestMinutes = (prior: WeeklySchedule | undefined) => {
  const sunday = prior?.days.SUNDAY;
  return sunday?.type === "practice_test" ? sunday.activities.find((activity) => activity.kind === "PT")?.minutes : undefined;
};

export function buildLabChain(
  inputs: LabInputs, testMonths: readonly string[], copied: CopiedStudent | null, read: LabRead | null = null,
): LabChain | null {
  if (hasErrors(fieldErrors(inputs, testMonths, read))) return null;
  const a = inputs.analytics;
  const screenshots = a.kind === "screenshots" && read ? summarizeAnalyticsRows([...read.lr, ...read.rc]) : null;
  const copiedTrend = a.kind === "student" ? copied?.trend : null;
  if (a.kind === "student" && !copiedTrend) return null;
  const student: Student = {
    currentScore: Number(inputs.current), goalScore: Number(inputs.goal), dailyCapacityMinutes: inputs.days,
    preferredPracticeTestDay: inputs.ptDay, accommodationMultiplier: inputs.accommodation, goalTestDate: inputs.testMonth,
  };
  const count = clampBuilt(inputs.built);
  const uploads = a.kind === "sample" ? sampleUploads(a.direction, student.currentScore, count) : [];
  const weeks: LabWeek[] = [];
  for (let i = 0; i < count; i++) {
    const weekOf = isoDateInWeek(inputs.weekOf, i * 7);
    if (weekOf >= inputs.testMonth) return { weeks, end: { kind: "test", nextWeekOf: weekOf } };
    const analytics: PlanningAnalytics = copiedTrend
      ? { ...copiedTrend, weekOf }
      : weightedTrend(screenshots ? [screenshots] : uploads.slice(0, i + 1).reverse(), weekOf);
    const priorSchedules = weeks.map((week) => week.schedule);
    const schedule = generateWeek(student, analytics, mockRules, copied?.name ?? "Lab", {
      priorSchedules, priorWeekPracticeTestReviewMinutes: priorSundayTestMinutes(priorSchedules.at(-1)),
      missedStemTypeCounts: i === 0 ? read?.practiceTest?.missedStemTypeCounts : undefined,
    });
    weeks.push({ number: i + 1, schedule, student, plannedFrom: plannedFrom(a, copied, read, i + 1) });
  }
  const nextWeekOf = isoDateInWeek(inputs.weekOf, count * 7);
  const end: ChainEnd = count === MAX_WEEKS ? { kind: "limit" } : nextWeekOf >= inputs.testMonth ? { kind: "test", nextWeekOf } : null;
  return { weeks, end };
}

const LONG_MONTH = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

export function chainEndText(end: ChainEnd, testMonth: string) {
  if (!end) return null;
  if (end.kind === "limit") return `The lab builds up to ${MAX_WEEKS} weeks.`;
  return `The ${LONG_MONTH.format(new Date(`${testMonth}T00:00:00Z`))} test comes before the week of ${shortDay(end.nextWeekOf)}.`;
}

const clampBuilt = (built: number) => Math.min(Math.max(built, 1), MAX_WEEKS);

export const showWeek = (inputs: LabInputs, shown: number): LabInputs =>
  ({ ...inputs, shown, built: clampBuilt(Math.max(inputs.built, shown + 1)) });

export const weekReasons = (schedule: WeeklySchedule) => schedule.reasons?.filter((r) => r.placement.scope === "week") ?? [];

const linkSchema = z.object({
  preset: z.enum(["improving", "steady", "slipping", "double", "soon", "short", "student"]),
  copiedFrom: z.string().nullable(),
  weekOf: z.string(),
  current: z.string(),
  goal: z.string(),
  testMonth: z.string(),
  accommodation: z.union([z.literal(1), z.literal(1.5), z.literal(2)]),
  days: z.object(Object.fromEntries(DAY_ORDER.map((day) => [day, z.number().int()])) as Record<DayOfWeek, z.ZodNumber>),
  ptDay: z.enum(DAY_ORDER as [DayOfWeek, ...DayOfWeek[]]),
  analytics: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("sample"), direction: z.enum(["improving", "steady", "slipping"]) }),
    z.object({ kind: z.literal("student") }),
    z.object({ kind: z.literal("screenshots") }),
  ]),
  built: z.number().int().min(1).max(MAX_WEEKS).catch(1),
  shown: z.number().int().min(0).catch(0),
});

export function encodeLabLink(inputs: LabInputs): string {
  const bytes = new TextEncoder().encode(JSON.stringify(inputs));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function readLabLink(text: string, thisWeek: string): LabInputs | null {
  let value: unknown;
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))));
  } catch {
    return null;
  }
  const parsed = linkSchema.safeParse(value);
  if (!parsed.success) return null;
  const inputs = { ...parsed.data, shown: Math.min(parsed.data.shown, parsed.data.built - 1) };
  const fromStudent = inputs.preset === "student" || inputs.analytics.kind === "student";
  if (fromStudent && inputs.copiedFrom === null) return null;
  if (!labWeeks(thisWeek).some((w) => w.value === inputs.weekOf)) return null;
  return inputs;
}
