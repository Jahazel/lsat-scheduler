import type { Student } from "@/lib/types";
import { testCountdown } from "@/lib/testCountdown";

export type RoadToTestDay = {
  current: number;
  goal: number;
  month: string;
  year: string;
  left: { kind: "weeks" | "days"; count: number } | { kind: "test_day" } | { kind: "passed" };
};

const monthYear = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

export function roadToTestDay(student: Pick<Student, "currentScore" | "goalScore" | "goalTestDate">, now: Date, timezone: string): RoadToTestDay {
  const countdown = testCountdown(student.goalTestDate, now, timezone);
  const parts = monthYear.formatToParts(new Date(`${student.goalTestDate.slice(0, 10)}T00:00:00.000Z`));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    current: student.currentScore,
    goal: student.goalScore,
    month: part("month"),
    year: part("year"),
    left: countdown === null ? { kind: "passed" }
      : countdown.kind === "today" ? { kind: "test_day" }
      : countdown.days < 7 ? { kind: "days", count: countdown.days }
      : { kind: "weeks", count: Math.round(countdown.days / 7) },
  };
}
