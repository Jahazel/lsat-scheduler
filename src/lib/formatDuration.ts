// Formats whole minutes the way the student enters them: "45 min", "2 h",
// "1 h 30 min".
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

export const shortDuration = (minutes: number) => formatDuration(minutes).replace(/(h \d+) min$/, "$1");

// Rounds each part to whole minutes while keeping the parts' sum equal to the
// rounded total (largest remainder), so a day's activity rows add up to the
// time shown in its header.
export function roundMinutesToTotal(parts: number[]): number[] {
  const target = Math.round(parts.reduce((sum, part) => sum + part, 0));
  const rounded = parts.map(Math.floor);
  let remaining = target - rounded.reduce((sum, part) => sum + part, 0);
  const byRemainder = parts
    .map((part, index) => ({ index, remainder: part - Math.floor(part) }))
    .sort((a, b) => b.remainder - a.remainder);
  for (const { index } of byRemainder) {
    if (remaining <= 0) break;
    rounded[index] += 1;
    remaining -= 1;
  }
  return rounded;
}
