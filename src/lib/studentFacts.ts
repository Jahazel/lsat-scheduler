import { formatDuration } from "./formatDuration";
import { SCHEDULE_TIMEZONE } from "./scheduleTimezone";
import { testCountdown } from "./testCountdown";

export type Fact = { label: string; value: string; muted?: boolean };

export type StudentFactsInput = {
  currentScore: number;
  goalScore: number;
  goalTestDate: string;
  weeklyMinutes: number;
  joinedAt: Date;
  pastWeeks: number;
  needsAnalytics: boolean;
};

const testMonth = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const joinedDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: SCHEDULE_TIMEZONE });

function testLeft(goalTestDate: string, now: Date) {
  const countdown = testCountdown(goalTestDate, now, SCHEDULE_TIMEZONE);
  if (countdown === null) return "Passed";
  if (countdown.kind === "today") return "Test day";
  return `${countdown.days} ${countdown.days === 1 ? "day" : "days"}`;
}

export function studentFacts(student: StudentFactsInput, now: Date): Fact[] {
  return [
    student.needsAnalytics
      ? { label: "Score", value: `No analytics · goal ${student.goalScore}`, muted: true }
      : { label: "Score", value: `${student.currentScore} → ${student.goalScore}` },
    { label: "Test", value: `${testMonth.format(new Date(`${student.goalTestDate.slice(0, 10)}T00:00:00Z`))} · ${testLeft(student.goalTestDate, now)}` },
    { label: "Study time", value: `${formatDuration(student.weeklyMinutes)} per week` },
    { label: "Joined", value: joinedDay.format(student.joinedAt) },
    student.pastWeeks === 0
      ? { label: "Past weeks", value: "None yet", muted: true }
      : { label: "Past weeks", value: String(student.pastWeeks) },
  ];
}
