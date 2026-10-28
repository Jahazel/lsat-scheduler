import { activityLabel } from "@/lib/activityLabel";
import { DAY_ORDER } from "@/lib/engine";
import { formatDuration, shortDuration } from "@/lib/formatDuration";
import { mockRules } from "@/lib/mockData";
import type { MissedStemType, Miss, PracticeTestProblem } from "@/lib/practiceTestResult";
import { isoDateInWeek } from "@/lib/scheduleReasonText";
import { DAY_LABEL } from "@/lib/studentProfile";
import type { Activity, AnalyticsSnapshot, DayOfWeek, LRStemType, WeeklySchedule } from "@/lib/types";
import { MAX_SCORE, MIN_SCORE, type WeeklyUploadBasis } from "@/lib/weeklyUploadPreview";

const SHORT_DAY: Record<DayOfWeek, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed", THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
};

const utcDate = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);
const dayOfMonth = (isoDate: string) => utcDate(isoDate).getUTCDate();
const monthShort = (isoDate: string) => utcDate(isoDate).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });

const longDate = (isoDate: string) =>
  utcDate(isoDate).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });

const PLAN_TEXT = {
  next_week: { title: "Plan next week", week: "next week", Week: "Next week", lastWeek: "this week", LastWeek: "This week", previewDay: "Next", preview: "next Monday" },
  this_week: { title: "Plan this week", week: "this week", Week: "This week", lastWeek: "last week", LastWeek: "Last week", previewDay: "This", preview: "this week" },
} as const;

export function planText(basis: WeeklyUploadBasis) {
  return {
    ...PLAN_TEXT[basis.plans],
    startSentence: basis.plans === "next_week"
      ? `Next week starts ${longDate(basis.weekOf)}.`
      : `Your plan starts today and runs to ${longDate(isoDateInWeek(basis.weekOf, 6))}.`,
  };
}

function weekRange(weekOf: string, startsOn: DayOfWeek) {
  const start = isoDateInWeek(weekOf, DAY_ORDER.indexOf(startsOn));
  const sunday = isoDateInWeek(weekOf, 6);
  const end = monthShort(sunday) === monthShort(start) ? `${dayOfMonth(sunday)}` : `${monthShort(sunday)} ${dayOfMonth(sunday)}`;
  return `${monthShort(start)} ${dayOfMonth(start)}–${end}`;
}

export function weekSummary(schedule: WeeklySchedule, startsOn: DayOfWeek) {
  const total = Math.round(DAY_ORDER.reduce((sum, day) => sum + schedule.days[day].totalMinutes, 0));
  const practiceTestDays = DAY_ORDER.filter((day) => schedule.days[day].type === "practice_test").map((day) => DAY_LABEL[day]);
  const practiceTest = practiceTestDays.length > 0 ? `practice test on ${practiceTestDays.join(" and ")}` : "no practice test";
  return `${weekRange(schedule.weekOf, startsOn)} · ${formatDuration(total)} of study · ${practiceTest}`;
}

export function weekTiles(schedule: WeeklySchedule, startsOn: DayOfWeek) {
  const longest = Math.max(1, ...DAY_ORDER.map((day) => schedule.days[day].totalMinutes));
  return DAY_ORDER.map((day, index) => {
    const plan = schedule.days[day];
    return {
      day,
      label: `${SHORT_DAY[day]} ${dayOfMonth(isoDateInWeek(schedule.weekOf, index))}`,
      time: plan.type === "rest" ? "Rest" : shortDuration(Math.round(plan.totalMinutes)),
      practiceTest: plan.type === "practice_test",
      barShare: plan.totalMinutes / longest,
    };
  }).slice(DAY_ORDER.indexOf(startsOn));
}

function firstDrillDay(schedule: WeeklySchedule, goesFirst: LRStemType | undefined) {
  const day = DAY_ORDER.find((weekday) => schedule.days[weekday].type === "drill" && schedule.days[weekday].activities.length > 0);
  if (!day) return null;
  const activities = schedule.days[day].activities;
  const goesFirstIndex = activities.findIndex((activity) =>
    goesFirst !== undefined && activity.kind === "LR" && !activity.isFullSection && activity.types.includes(goesFirst));
  return { day, activities, goesFirstIndex };
}

export function firstDrills(schedule: WeeklySchedule, goesFirst: LRStemType | undefined) {
  const first = firstDrillDay(schedule, goesFirst);
  if (!first) return null;
  const { day, activities, goesFirstIndex: flagged } = first;
  const date = isoDateInWeek(schedule.weekOf, DAY_ORDER.indexOf(day));
  return {
    day,
    date: `${monthShort(date)} ${dayOfMonth(date)}`,
    items: activities.map((activity, index) => ({
      label: activityLabel(activity),
      detail: index === flagged ? { kind: "flag" as const, text: "Goes first" } : null,
    })),
  };
}

export function checkPreviewDrills(schedule: WeeklySchedule, goesFirst: LRStemType | undefined, analytics: AnalyticsSnapshot) {
  const first = firstDrillDay(schedule, goesFirst);
  if (!first) return null;
  const { day, activities, goesFirstIndex } = first;
  const rcAccuracy = analytics.rcAccuracyByType ?? {};
  const lowest = mockRules.rcTypes
    .filter((type) => rcAccuracy[type] !== undefined)
    .sort((a, b) => rcAccuracy[a]! - rcAccuracy[b]!)[0];
  const detail = (activity: Activity, index: number): string | null => {
    if (index === goesFirstIndex) return "goes first";
    if (activity.kind === "LR" && !activity.isFullSection && activity.types.length === 2) return "paired";
    if (activity.kind === "RC" && !activity.isFullSection && lowest && activity.passages.some(({ type }) => type === lowest)) {
      return `${Math.round(rcAccuracy[lowest]! * 100)}% · lowest`;
    }
    return null;
  };
  return {
    day,
    items: activities.map((activity, index) => {
      const text = detail(activity, index);
      return { label: activityLabel(activity), detail: text ? { kind: "accuracy" as const, text } : null };
    }),
  };
}

export const formatSectionScore = (score: number) => (score < 0 ? `−${Math.abs(score)}` : `${score}`);

export const missLabel = ({ section, question, result }: Miss) =>
  `S${section} Q${question}${result === "unanswered" ? " unanswered" : ""}`;

const times = (count: number) => (count === 1 ? "once" : `${count} times`);

export function missedTypesInOrder(types: MissedStemType[], goesFirst: LRStemType | undefined) {
  const first = types.find(({ type }) => type === goesFirst);
  return first ? [first, ...types.filter((type) => type !== first)] : types;
}

export function missedCountSentence(types: MissedStemType[], analytics: AnalyticsSnapshot): string {
  const [first, ...others] = types;
  const count = first.misses.length;
  const tied = others.filter(({ misses }) => misses.length === count);
  if (tied.length > 0) {
    const accuracy = (type: LRStemType) => analytics.lrAccuracyByType[type] ?? 1;
    const breaker = tied.every(({ type }) => accuracy(type) > accuracy(first.type))
      ? "It has the lowest accuracy in your analytics."
      : "It comes first in the tutor's type order.";
    return `You missed it ${times(count)}, as often as ${tied.map(({ type }) => type).join(" and ")}. ${breaker}`;
  }
  if (others.length === 0) return `You missed it ${times(count)}. You missed no other question type.`;
  return `You missed it ${times(count)}. No other type was missed more than ${times(others[0].misses.length)}.`;
}

const KIND_NAME = { LR: "Logical Reasoning", RC: "Reading Comprehension" } as const;
export const sectionTitle = (section: number, kind: "LR" | "RC") => `Section ${section} · ${KIND_NAME[kind]}`;

export function problemMessage(problem: Exclude<PracticeTestProblem, { problem: "section-missing" | "hidden-pick" }>): string {
  switch (problem.problem) {
    case "wrong-page":
      return problem.shows === "analytics"
        ? "This shows your Analytics page. Add the Review page of your practice test, one section per screenshot."
        : "This is not a practice test Review page. Add the Review page of your practice test, one section per screenshot.";
    case "different-prep-test":
      return `This is practice test ${problem.prepTest}. Your other sections are from practice test ${problem.expected}. Add the 4 sections of one practice test.`;
    case "same-section-twice":
      return problem.missingSection === null
        ? `Section ${problem.section} is already added. Remove this one.`
        : `Section ${problem.section} is already added. Remove this one, then add Section ${problem.missingSection}.`;
    case "cut-off":
      return problem.lastQuestion !== null && problem.lastQuestion < 24
        ? `Section ${problem.section} stops at Q${problem.lastQuestion}. A Logical Reasoning section has 24 to 26 questions. Take the screenshot again, down to the last one.`
        : `Section ${problem.section} stops before its last question. Take the screenshot again, from the section title down to the last one.`;
    case "score-mismatch":
      return `The score of ${formatSectionScore(problem.score)} does not match the ${problem.missed} missed ${problem.missed === 1 ? "question" : "questions"} we read. Take the screenshot again with every result in view.`;
  }
}

export function parseScore(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const score = Number(trimmed);
  return score >= MIN_SCORE && score <= MAX_SCORE ? score : null;
}
