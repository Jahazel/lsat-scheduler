export type LiveSide =
  | { kind: "signed-out" }
  | { kind: "not-admin" }
  | { kind: "ready"; today: string; realDate: string; simulated: boolean;
      saved: string[] };
export type ReadySide = Extract<LiveSide, { kind: "ready" }>;

export const MAX_AHEAD_DAYS = 56;

const DAY_MS = 86_400_000;
const toTime = (iso: string) => Date.parse(`${iso}T12:00:00Z`);
export const addDays = (iso: string, days: number) => new Date(toTime(iso) + days * DAY_MS).toISOString().slice(0, 10);
export const weekday = (iso: string) => (new Date(toTime(iso)).getUTCDay() + 6) % 7;
export const mondayOf = (iso: string) => addDays(iso, -weekday(iso));

const format = (iso: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(new Date(toTime(iso)));
export const dayName = (iso: string) => format(iso, { weekday: "short", month: "short", day: "numeric" });
export const longDay = (iso: string) => format(iso, { weekday: "long", month: "long", day: "numeric" });
export const shortDate = (iso: string) => format(iso, { month: "short", day: "numeric" });
export const weekdayShort = (iso: string) => format(iso, { weekday: "short" });
export const dayNumber = (iso: string) => Number(iso.slice(-2));

export const nextWeekday = (iso: string, day: number) => addDays(iso, ((day - weekday(iso) + 6) % 7) + 1);
export const dayEvent = (iso: string) => (weekday(iso) === 5 ? "Weekly upload opens" : weekday(iso) === 0 ? "New week starts" : null);
