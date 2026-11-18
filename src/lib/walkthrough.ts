export const MAX_AHEAD_DAYS = 56;

export interface WalkthroughFacts {
  today: string;
  realDate: string;
  simulated: boolean;
  scheduledWeeks: string[];
}

const DAY_MS = 86_400_000;
const toTime = (iso: string) => Date.parse(`${iso}T12:00:00Z`);
export const addDays = (iso: string, days: number) => new Date(toTime(iso) + days * DAY_MS).toISOString().slice(0, 10);
const weekday = (iso: string) => (new Date(toTime(iso)).getUTCDay() + 6) % 7;
export const mondayOf = (iso: string) => addDays(iso, -weekday(iso));

const format = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(new Date(toTime(iso)));
export const dayName = (iso: string) => format(iso, { weekday: "short", month: "short", day: "numeric" });
export const longDay = (iso: string) => format(iso, { weekday: "long", month: "long", day: "numeric" });
export const shortDate = (iso: string) => format(iso, { month: "short", day: "numeric" });
export const weekdayShort = (iso: string) => format(iso, { weekday: "short" });
export const monthName = (first: string) => format(first, { month: "long", year: "numeric" });
export const dayNumber = (iso: string) => Number(iso.slice(-2));

const SATURDAY = 5;
const MONDAY = 0;
const nextWeekday = (iso: string, day: number) => addDays(iso, ((day - weekday(iso) + 6) % 7) + 1);
const UPLOAD_OPENS = "Weekly upload opens";
const NEW_WEEK = "New week starts";
const dayEvent = (iso: string) => (weekday(iso) === SATURDAY ? UPLOAD_OPENS : weekday(iso) === MONDAY ? NEW_WEEK : null);

export interface Jump { to: string; title: string; detail: string }

export function jumpsFrom(today: string): Jump[] {
  const tomorrow = addDays(today, 1);
  const saturday = nextWeekday(today, SATURDAY);
  const monday = nextWeekday(today, MONDAY);
  return [
    { to: tomorrow, title: "Next day", detail: [dayName(tomorrow), dayEvent(tomorrow)].filter(Boolean).join(" · ") },
    { to: saturday, title: "Saturday", detail: `${UPLOAD_OPENS} · ${shortDate(saturday)}` },
    { to: monday, title: "Monday", detail: `${NEW_WEEK} · ${shortDate(monday)}` },
  ].filter((jump, index) => index === 0 || jump.to !== tomorrow);
}

export const monthStart = (iso: string) => `${iso.slice(0, 8)}01`;

export function shiftMonth(first: string, by: number) {
  const date = new Date(toTime(first));
  date.setUTCMonth(date.getUTCMonth() + by);
  return date.toISOString().slice(0, 10);
}

export type CalendarDay =
  | { date: string; kind: "outside" }
  | { date: string; kind: "today" | "off" | "on"; scheduled: boolean };

export function calendarMonth(first: string, today: string, scheduledWeeks: string[]): CalendarDay[] {
  const last = addDays(today, MAX_AHEAD_DAYS);
  const next = shiftMonth(first, 1);
  const cells = Math.ceil((dayNumber(addDays(next, -1)) + weekday(first)) / 7) * 7;
  return Array.from({ length: cells }, (_, index): CalendarDay => {
    const date = addDays(mondayOf(first), index);
    if (date.slice(0, 7) !== first.slice(0, 7)) return { date, kind: "outside" };
    const kind = date === today ? "today" : date < today || date > last ? "off" : "on";
    return { date, kind, scheduled: scheduledWeeks.includes(mondayOf(date)) };
  });
}

export const lastPickableMonth = (today: string) => monthStart(addDays(today, MAX_AHEAD_DAYS));
