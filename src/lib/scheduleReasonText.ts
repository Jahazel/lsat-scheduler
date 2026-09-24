import { formatDuration } from "./formatDuration";
import type { DayOfWeek, LRType } from "./types";

export const dayName = (day: DayOfWeek) => day[0] + day.slice(1).toLowerCase();

export function dateInWeek(weekOf: string, dayIndex: number): string {
  const date = new Date(`${weekOf}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dayIndex);
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(date);
}

export const duration = (minutes: number) => formatDuration(Math.round(minutes));

export function starredNames(types: LRType[]): string {
  if (types.length === 1) return types[0];
  if (types.length === 2) return `${types[0]} and ${types[1]}`;
  return `${types.slice(0, -1).join(", ")}, and ${types.at(-1)}`;
}
