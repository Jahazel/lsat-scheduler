import { z } from "zod";
import { DAY_ORDER } from "./engine";
import type { DayOfWeek } from "./types";

export const DAY_LABEL: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export function everyDay(minutes: number): Record<DayOfWeek, number> {
  return Object.fromEntries(DAY_ORDER.map((day) => [day, minutes])) as Record<DayOfWeek, number>;
}

// Daily capacity bounds, shared by the intake form and the server so both
// enforce the same range and step.
export const MIN_DAILY_CAPACITY_MINUTES = 30;
export const MAX_DAILY_CAPACITY_MINUTES = 480;
export const DAILY_CAPACITY_STEP_MINUTES = 15;

// The form's message for a day's capacity, or null when it is valid. The
// form only offers 15-minute steps, so the step has no message here.
export function dailyCapacityError(minutes: number): string | null {
  if (minutes < MIN_DAILY_CAPACITY_MINUTES) return "Enter at least 30 min.";
  if (minutes > MAX_DAILY_CAPACITY_MINUTES) return "Enter 8 h or less.";
  return null;
}

// The minute options valid for a given hour, so the form never offers a
// value dailyCapacityError would then reject (0 h 00 min, or 8 h 15/30/45
// min).
export function minuteOptionsForHour(hour: number): number[] {
  const allSteps = [0, 15, 30, 45];
  return allSteps.filter((minute) => {
    const total = hour * 60 + minute;
    return total >= MIN_DAILY_CAPACITY_MINUTES && total <= MAX_DAILY_CAPACITY_MINUTES;
  });
}

export function goalScoreError(currentScore: number, goalScore: number): string | null {
  return goalScore > currentScore ? null : `Your goal must be higher than your current score, ${currentScore}.`;
}

const LSAT_TEST_MONTHS = ["2026-10-01", "2026-11-01", "2027-01-01", "2027-02-01", "2027-04-01", "2027-06-01"];

const testMonthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

// `today` is the student-side date (YYYY-MM-DD), so an admin's simulated date
// changes the list.
export function upcomingTestMonths(today: string) {
  return LSAT_TEST_MONTHS.filter((month) => month > today).map((value) => ({
    value,
    label: testMonthLabel.format(new Date(`${value}T00:00:00Z`)),
  }));
}

const dayOfWeekSchema = z.enum(DAY_ORDER as [DayOfWeek, ...DayOfWeek[]]);

const dailyCapacitySchema = z
  .number()
  .int()
  .min(MIN_DAILY_CAPACITY_MINUTES)
  .max(MAX_DAILY_CAPACITY_MINUTES)
  .multipleOf(DAILY_CAPACITY_STEP_MINUTES);

export const studentProfileSchema = z.object({
  platform: z.literal("7Sage").default("7Sage"),
  currentScore: z.number().int().min(120).max(180),
  goalScore: z.number().int().min(120).max(180),
  dailyCapacityMinutes: z.object(
    Object.fromEntries(DAY_ORDER.map((day) => [day, dailyCapacitySchema])) as Record<
      DayOfWeek,
      typeof dailyCapacitySchema
    >
  ),
  preferredPracticeTestDay: dayOfWeekSchema,
  accommodationMultiplier: z.union([z.literal(1), z.literal(1.5), z.literal(2)]),
  goalTestDate: z.string().min(1),
}).superRefine((profile, context) => {
  const message = goalScoreError(profile.currentScore, profile.goalScore);
  if (message) context.addIssue({ code: "custom", path: ["goalScore"], message });
});

// The server-side parse: the goal test date must also be one the form offers
// today, so a form left open past a test month cannot save it.
export function parseStudentProfile(input: unknown, today: string) {
  return studentProfileSchema
    .refine((profile) => upcomingTestMonths(today).some((month) => month.value === profile.goalTestDate), {
      path: ["goalTestDate"],
      message: "Choose an upcoming LSAT test month.",
    })
    .parse(input);
}

// What the onboarding form and Study settings send: every profile field but
// the platform, which the schema fills in.
export type StudentProfileInput = Omit<z.input<typeof studentProfileSchema>, "platform">;

export const MAX_OFFICIAL_ATTEMPTS = 10;
const ATTEMPT_MONTH_COUNT = 60;

const attemptMonthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

export function attemptMonths(today: string) {
  const [year, month] = today.split("-").map(Number);
  return Array.from({ length: ATTEMPT_MONTH_COUNT }, (_, back) => {
    const date = new Date(Date.UTC(year, month - 1 - back, 1));
    return { value: date.toISOString().slice(0, 7), label: attemptMonthLabel.format(date) };
  });
}

const officialAttemptSchema = z.object({
  score: z.number().int().min(120).max(180),
  month: z.string(),
});

export type OfficialAttempt = z.infer<typeof officialAttemptSchema>;

export function parseOfficialAttempts(input: unknown, today: string): OfficialAttempt[] {
  const offered = new Set(attemptMonths(today).map(({ value }) => value));
  return z
    .array(officialAttemptSchema.refine((attempt) => offered.has(attempt.month), { path: ["month"] }))
    .max(MAX_OFFICIAL_ATTEMPTS)
    .parse(input);
}
