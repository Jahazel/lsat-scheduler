export type TestCountdown = { kind: "days"; days: number } | { kind: "today" } | null;

function localDate(now: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

// The goal test date is a calendar day, so both sides are compared as dates in
// the schedule timezone. A test date that has passed shows no countdown.
export function testCountdown(goalTestDate: string, now: Date, timezone: string): TestCountdown {
  const goal = Date.parse(`${goalTestDate.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(goal)) return null;
  const today = Date.parse(`${localDate(now, timezone)}T00:00:00.000Z`);
  const days = Math.round((goal - today) / 86_400_000);
  if (days < 0) return null;
  return days === 0 ? { kind: "today" } : { kind: "days", days };
}

export function testCountdownLabel(countdown: TestCountdown) {
  if (!countdown) return null;
  if (countdown.kind === "today") return "Test day";
  return `${countdown.days} ${countdown.days === 1 ? "day" : "days"} to test`;
}
