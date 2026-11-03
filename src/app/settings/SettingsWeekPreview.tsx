import { DAY_ORDER } from "@/lib/engine";
import { shortDuration } from "@/lib/formatDuration";
import { DAY_SHORT_LABEL, weeklyTotalMinutes, type WeekValues } from "@/lib/studyWeek";

const SHORTEST_FULL_BAR_MINUTES = 60;
const SHORT_BAR_SHARE = 0.25;

export function SettingsWeekPreview({
  currentScore,
  goalScore,
  testMonthLabel,
  week,
  storedWeek,
}: {
  currentScore: number;
  goalScore: string;
  testMonthLabel: string | null;
  week: WeekValues;
  storedWeek: WeekValues;
}) {
  const scale = Math.max(SHORTEST_FULL_BAR_MINUTES, ...DAY_ORDER.map((day) => week.dailyCapacityMinutes[day]));
  const practiceTestDay = week.preferredPracticeTestDay;
  return (
    <aside
      aria-label="Preview of your next weekly schedule"
      className="hidden min-w-[280px] flex-1 flex-col gap-5 self-stretch border-l border-vellum-line pl-10 lg:flex"
    >
      <div className="flex flex-col gap-1">
        <p className="font-mono text-label text-smoke uppercase">Preview · next weekly schedule</p>
        <p className="text-h3 font-semibold text-ink tabular-nums">
          {currentScore} → {goalScore.trim() || "—"}
        </p>
        <p className="text-small text-accent">
          {testMonthLabel ? `by ${testMonthLabel}` : "choose a test month"} · {shortDuration(weeklyTotalMinutes(week))} a week
        </p>
      </div>
      <ol className="flex flex-col gap-2 border-t border-vellum-line pt-4">
        {DAY_ORDER.map((day) => {
          const minutes = week.dailyCapacityMinutes[day];
          const share = minutes / scale;
          const practiceTest = day === practiceTestDay;
          const changed =
            minutes !== storedWeek.dailyCapacityMinutes[day] || practiceTest !== (day === storedWeek.preferredPracticeTestDay);
          return (
            <li key={day} className={`flex items-center gap-3 text-small ${changed ? "font-semibold" : ""}`}>
              <span className="w-9 shrink-0 text-ink">{DAY_SHORT_LABEL[day]}</span>
              <span className="relative flex h-5 min-w-0 flex-1 items-center">
                <span
                  aria-hidden
                  className={`preview-bar absolute inset-0 rounded ${practiceTest ? "bg-accent" : "bg-accent/tint"} ${
                    changed ? "shadow-[inset_0_0_0_1.5px_var(--color-accent)]" : ""
                  }`}
                  style={{ transform: `scaleX(${share})` }}
                />
                {practiceTest && (
                  <span className={`relative pl-2 text-caption font-medium ${share < SHORT_BAR_SHARE ? "text-accent" : "text-paper"}`}>PT</span>
                )}
              </span>
              <span className={`w-14 shrink-0 text-right tabular-nums ${changed ? "text-accent" : "text-ink"}`}>
                {shortDuration(minutes)}
                {changed && <span className="sr-only"> (changed)</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-small text-smoke">Updates as you edit. This week stays as it is.</p>
    </aside>
  );
}
