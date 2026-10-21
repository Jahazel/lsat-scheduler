import { summarizeAnalyticsRows } from "./analytics";
import { currentWeekInTimezone, newestApprovedSnapshots, weightedTrend } from "./currentWeeklySchedule";
import { DAY_ORDER, generateWeek } from "./engine";
import { activityLabel } from "./activityLabel";
import { formatDuration, shortDuration } from "./formatDuration";
import { mockRules } from "./mockData";
import type { MissedStemType, Miss, PracticeTestProblem } from "./practiceTestResult";
import { isoDateInWeek } from "./scheduleReasonText";
import { DAY_LABEL } from "./studentProfile";
import type {
  AnalyticsExtractedRow, AnalyticsSnapshot, ApprovedAnalyticsSnapshot, DayOfWeek, LRStemType,
  PersistedWeeklySchedule, Student, WeeklySchedule,
} from "./types";

const TREND_WINDOW = 3;

export interface NextWeekBasis {
  weekOf: string;
  student: Student;
  hadPracticeTest: boolean;
  priorSnapshots: ApprovedAnalyticsSnapshot[];
  priorWeekPracticeTestReviewMinutes?: number;
  priorSchedules: WeeklySchedule[];
}

export function nextWeekBasis({ now, timezone, student, schedules, snapshots }: {
  now: Date;
  timezone: string;
  student: Student;
  schedules: PersistedWeeklySchedule[];
  snapshots: ApprovedAnalyticsSnapshot[];
}): NextWeekBasis {
  const currentWeek = currentWeekInTimezone(now, timezone);
  const current = schedules.find((record) => record.weekStartDate === currentWeek)?.schedule;
  const sunday = current?.days.SUNDAY;
  return {
    weekOf: isoDateInWeek(currentWeek, 7),
    student,
    hadPracticeTest: DAY_ORDER.some((day) => current?.days[day].activities.some((activity) => activity.kind === "PT") ?? false),
    priorSnapshots: newestApprovedSnapshots(snapshots)
      .slice(0, TREND_WINDOW - 1)
      .map(({ id, approvedAt, weekOf, lrAccuracyByType, lrTopPriorityLogicTypes, rcAccuracyByType }) =>
        ({ id, approvedAt, weekOf, lrAccuracyByType, lrTopPriorityLogicTypes, ...(rcAccuracyByType && { rcAccuracyByType }) })),
    priorWeekPracticeTestReviewMinutes: sunday?.type === "practice_test"
      ? sunday.activities.find((activity) => activity.kind === "PT")?.minutes
      : undefined,
    priorSchedules: schedules.filter((record) => record.weekStartDate <= currentWeek).map((record) => record.schedule),
  };
}

export function nextWeekAnalytics(basis: NextWeekBasis, rows: AnalyticsExtractedRow[]): AnalyticsSnapshot {
  const read = summarizeAnalyticsRows(rows);
  return weightedTrend([read, ...basis.priorSnapshots], basis.weekOf);
}

export function previewNextWeek(
  basis: NextWeekBasis,
  analytics: AnalyticsSnapshot,
  currentScore: number,
  missedStemTypeCounts?: Partial<Record<LRStemType, number>>,
): WeeklySchedule {
  return generateWeek({ ...basis.student, currentScore }, analytics, mockRules, "", {
    createdOn: "MONDAY",
    priorWeekPracticeTestReviewMinutes: basis.priorWeekPracticeTestReviewMinutes,
    priorSchedules: basis.priorSchedules,
    missedStemTypeCounts,
  });
}

const SHORT_DAY: Record<DayOfWeek, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed", THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
};

const utcDate = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);
const dayOfMonth = (isoDate: string) => utcDate(isoDate).getUTCDate();
const monthShort = (isoDate: string) => utcDate(isoDate).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });

export function weekStartLabel(weekOf: string) {
  return utcDate(weekOf).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
}

function weekRange(weekOf: string) {
  const sunday = isoDateInWeek(weekOf, 6);
  const end = monthShort(sunday) === monthShort(weekOf) ? `${dayOfMonth(sunday)}` : `${monthShort(sunday)} ${dayOfMonth(sunday)}`;
  return `${monthShort(weekOf)} ${dayOfMonth(weekOf)}–${end}`;
}

export function weekSummary(schedule: WeeklySchedule) {
  const total = Math.round(DAY_ORDER.reduce((sum, day) => sum + schedule.days[day].totalMinutes, 0));
  const practiceTestDays = DAY_ORDER.filter((day) => schedule.days[day].type === "practice_test").map((day) => DAY_LABEL[day]);
  const practiceTest = practiceTestDays.length > 0 ? `practice test on ${practiceTestDays.join(" and ")}` : "no practice test";
  return `${weekRange(schedule.weekOf)} · ${formatDuration(total)} of study · ${practiceTest}`;
}

export function weekTiles(schedule: WeeklySchedule) {
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
  });
}

export function firstDrills(schedule: WeeklySchedule, goesFirst: LRStemType | undefined) {
  const day = DAY_ORDER.find((weekday) => schedule.days[weekday].type === "drill" && schedule.days[weekday].activities.length > 0);
  if (!day) return null;
  const activities = schedule.days[day].activities;
  const date = isoDateInWeek(schedule.weekOf, DAY_ORDER.indexOf(day));
  const flagged = activities.findIndex((activity) => goesFirst !== undefined && activity.kind === "LR" && !activity.isFullSection && activity.types.includes(goesFirst));
  return {
    day,
    date: `${monthShort(date)} ${dayOfMonth(date)}`,
    items: activities.map((activity, index) => ({
      label: activityLabel(activity),
      detail: index === flagged ? { kind: "flag" as const, text: "Goes first" } : null,
    })),
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

export const MIN_SCORE = 120;
export const MAX_SCORE = 180;

export function parseScore(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const score = Number(trimmed);
  return score >= MIN_SCORE && score <= MAX_SCORE ? score : null;
}
