import { DAY_ORDER } from "./engine";
import { formatDuration, shortDuration } from "./formatDuration";
import { DAY_LABEL, practiceTestMinutes } from "./studentProfile";
import type { Accommodation } from "./studyProfileDraft";
import type { DayOfWeek } from "./types";

export interface WeekValues {
  dailyCapacityMinutes: Record<DayOfWeek, number>;
  preferredPracticeTestDay: DayOfWeek | null;
}

export const DAY_SHORT_LABEL: Record<DayOfWeek, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

export const TEST_TIME_LABEL: Record<Accommodation, string> = {
  1: "Standard",
  1.5: "1.5× time",
  2: "2× time",
};

export function testTimeName(accommodation: Accommodation): string {
  return accommodation === 1 ? "standard time" : TEST_TIME_LABEL[accommodation];
}

export function weeklyTotalMinutes(values: WeekValues): number {
  return DAY_ORDER.reduce((sum, day) => sum + values.dailyCapacityMinutes[day], 0);
}

export function practiceTestFact(accommodation: Accommodation): string {
  return `A full practice test takes ${shortDuration(practiceTestMinutes(accommodation))} with ${testTimeName(accommodation)}.`;
}

export function previewWeek(values: WeekValues) {
  const longest = Math.max(...DAY_ORDER.map((day) => values.dailyCapacityMinutes[day]));
  const day = values.preferredPracticeTestDay;
  return {
    summary: `${formatDuration(weeklyTotalMinutes(values))} of study · ${day ? `practice test on ${DAY_LABEL[day]}` : "practice-test day not chosen"}`,
    days: DAY_ORDER.map((weekday) => {
      const minutes = values.dailyCapacityMinutes[weekday];
      return {
        day: weekday,
        label: DAY_SHORT_LABEL[weekday],
        time: shortDuration(minutes),
        practiceTest: weekday === day,
        barShare: minutes / longest,
      };
    }),
  };
}
