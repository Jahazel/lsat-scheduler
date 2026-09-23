import { z } from "zod";
import { DAY_ORDER } from "./engine";
import type { DayOfWeek } from "./types";

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

const dayOfWeekSchema = z.enum(DAY_ORDER as [DayOfWeek, ...DayOfWeek[]]);

const dailyCapacitySchema = z
  .number()
  .int()
  .min(MIN_DAILY_CAPACITY_MINUTES)
  .max(MAX_DAILY_CAPACITY_MINUTES)
  .multipleOf(DAILY_CAPACITY_STEP_MINUTES);

export const studentProfileSchema = z.object({
  platform: z.enum(["7Sage", "LSAT Demon"]),
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
});
