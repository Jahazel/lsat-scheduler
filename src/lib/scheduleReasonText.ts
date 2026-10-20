import type { DayOfWeek, LRType } from "./types";

export const dayName = (day: DayOfWeek) => day[0] + day.slice(1).toLowerCase();

const monthAndDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long", day: "numeric", timeZone: "UTC",
});

export function monthAndDay(date: Date): string {
  return monthAndDayFormatter.format(date);
}

export function dateInWeek(weekOf: string, dayIndex: number): string {
  return monthAndDay(new Date(isoDateInWeek(weekOf, dayIndex) + "T00:00:00.000Z"));
}

export function isoDateInWeek(weekOf: string, dayIndex: number): string {
  const date = new Date(`${weekOf}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dayIndex);
  return date.toISOString().slice(0, 10);
}

export function starredNames(types: LRType[]): string {
  if (types.length === 1) return types[0];
  if (types.length === 2) return `${types[0]} and ${types[1]}`;
  return `${types.slice(0, -1).join(", ")}, and ${types.at(-1)}`;
}

export function missedTypePrioritySentence(type: LRType): string {
  return `${type} comes first this week. You missed it most on your last practice test.`;
}

export function starredRotationSentence(types: LRType[]): string {
  return `${starredNames(types)} ${types.length === 1 ? "sits" : "sit"} out this week in the starred rotation.`;
}

export type FullSectionDroppedCause =
  | { kind: "score"; score: number }
  | { kind: "no_drilling_day" }
  | { kind: "capacity" };

export function fullSectionDroppedSentence(
  cause: FullSectionDroppedCause
): string {
  if (cause.kind === "score") return `No full section this week: your current score is ${cause.score}, below 150.`;
  return cause.kind === "no_drilling_day"
    ? "No full section this week: no drilling day remains."
    : "No full section this week: no remaining drilling day has 60 minutes of daily capacity.";
}

type OriginalRestDayUse = "practice test" | "practice test review";
export type RestDayMoveCase =
  | { kind: "schedule" }
  | { kind: "occupied"; by: OriginalRestDayUse }
  | { kind: "reserved"; for: OriginalRestDayUse };

export function restDayMovedSentence(
  restDay: DayOfWeek, originalRestDay: DayOfWeek, moveCase: RestDayMoveCase
): string {
  if (moveCase.kind === "schedule") {
    return `Rest day moved to ${dayName(restDay)} to fit this week's practice tests and reviews.`;
  }
  return moveCase.kind === "occupied"
    ? `Rest day moved to ${dayName(restDay)}: your ${moveCase.by} takes ${dayName(originalRestDay)}.`
    : `Rest day moved to ${dayName(restDay)}: ${dayName(originalRestDay)} was reserved for a ${moveCase.for}.`;
}

export function noPracticeTestSentence(nextDate?: string): string {
  return nextDate === undefined
    ? "No practice test this week."
    : `No practice test this week; your next one is ${nextDate}.`;
}

export function nearTestWeekSentence(count: number, goalTestDate?: string): string {
  const ending = goalTestDate === undefined ? ""
    : ` before your ${monthAndDay(new Date(`${goalTestDate}T00:00:00.000Z`))} test`;
  return `This near-test week has ${count} LawHub practice ${count === 1 ? "test" : "tests"}${ending}.`;
}

export function unscheduledDaySentence(startDay: DayOfWeek): string {
  return `Not scheduled because this weekly schedule started ${dayName(startDay)}.`;
}

export function reviewCarriedOverSentence(weekOf: string): string {
  return `Review for last Sunday's practice test (${dateInWeek(weekOf, -1)}).`;
}

export function practiceTestReviewDayNextWeekSentence(): string {
  return "The practice-test review day is next Monday in the next weekly schedule.";
}
