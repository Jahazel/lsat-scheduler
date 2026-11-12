import { cx } from "@/components/ui/classes";
import { DAY_LABEL, type upcomingTestMonths } from "@/lib/studentProfile";
import { goalGain, weeksToTest, type PreviewDrill, type WizardValues } from "@/lib/onboardingWizard";
import { shortDuration } from "@/lib/formatDuration";
import { DAY_SHORT_LABEL, previewWeek, testTimeName, weeklyTotalMinutes } from "@/lib/studyWeek";
import type { DayOfWeek } from "@/lib/types";

const W = 400;
const H = 120;
const BAR_PX = 48;
const BAR = "h-full w-full rounded-xs transition-[clip-path] duration-(--duration-base) ease-(--ease-out-strong) motion-reduce:transition-none";

const scoreY = (score: number) => H - 16 - ((score - 120) / 60) * (H - 32);

export function RoadToTestDay({
  values,
  firstName,
  today,
  testMonths,
  weekSet,
  focusWeek,
  drills,
}: {
  values: WizardValues;
  firstName: string;
  today: string;
  testMonths: ReturnType<typeof upcomingTestMonths>;
  weekSet: boolean;
  focusWeek: boolean;
  drills: { day: DayOfWeek; items: PreviewDrill[] } | null;
}) {
  const weeks = weeksToTest(values.goalTestDate, today);
  const month = testMonths.find((option) => option.value === values.goalTestDate)?.label;
  const rising = goalGain(values) !== null;
  const current = Number(values.currentScore);
  const goal = Number(values.goalScore);
  const week = previewWeek(values);
  const practiceTestDay = values.preferredPracticeTestDay;

  return (
    <div className="flex flex-col gap-6 rounded-lg bg-paper p-8 shadow-e1">
      <div className="flex flex-col gap-1">
        <p className="text-small text-smoke [overflow-wrap:anywhere]">{`Hi ${firstName} · ${testTimeName(values.accommodationMultiplier)}`}</p>
        <h2 className="text-h3 font-semibold text-ink">
          {weeks && month ? `${weeks} ${weeks === 1 ? "week" : "weeks"} to the ${month} LSAT` : "Your road to test day"}
        </h2>
      </div>
      <div className="flex flex-col gap-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={rising ? `From ${current} now to ${goal} by test day` : "Your score line appears once your goal is above your current score"}
          className="w-full overflow-visible"
        >
          {Array.from({ length: weeks ?? 0 }, (_, index) => {
            const x = 8 + (index / Math.max((weeks ?? 1) - 1, 1)) * (W - 16);
            return <line key={index} x1={x} x2={x} y1={H - 10} y2={H - 4} className={index === 0 ? "stroke-accent" : "stroke-vellum-line"} strokeWidth={index === 0 ? 3 : 2} strokeLinecap="round" />;
          })}
          {rising ? (
            <>
              <path d={`M8 ${scoreY(current)} C ${W * 0.45} ${scoreY(current)}, ${W * 0.55} ${scoreY(goal)}, ${W - 8} ${scoreY(goal)}`} fill="none" className="stroke-accent" strokeWidth={2.5} strokeLinecap="round" />
              <circle cx={8} cy={scoreY(current)} r={4} className="fill-paper stroke-accent" strokeWidth={2} />
              <circle cx={W - 8} cy={scoreY(goal)} r={5} className="fill-accent" />
            </>
          ) : (
            <line x1={8} x2={W - 8} y1={H / 2} y2={H / 2} className="stroke-vellum-line" strokeWidth={2} strokeDasharray="4 6" />
          )}
        </svg>
        <p className="flex justify-between text-small">
          <span><span className="font-semibold tabular-nums text-ink">{values.currentScore.trim() || "—"}</span> <span className="text-smoke">now</span></span>
          <span><span className="text-smoke">goal</span> <span className="font-semibold tabular-nums text-accent">{values.goalScore.trim() || "—"}</span></span>
        </p>
      </div>
      <div className={cx("flex flex-col gap-3 rounded-md border p-4 transition-colors duration-(--duration-base) ease-out", focusWeek ? "border-accent/40" : "border-vellum-line")}>
        <p className="text-small">
          <span className="font-semibold text-ink">Week 1</span>
          <span className="text-smoke">
            {" · "}
            {weekSet
              ? `${shortDuration(weeklyTotalMinutes(values))}${practiceTestDay ? ` · practice test ${DAY_SHORT_LABEL[practiceTestDay]}` : ""}`
              : "set on the next step"}
          </span>
        </p>
        <ol aria-hidden className="grid grid-cols-7 gap-2">
          {week.days.map(({ day, barShare, practiceTest }) => {
            const accent = weekSet && practiceTest;
            const height = weekSet ? Math.max(4, Math.round(barShare * BAR_PX)) : 4;
            return (
              <li key={day} className="flex flex-col items-center gap-1.5">
                <span className="flex h-12 w-full items-end">
                  <span className={cx(BAR, accent ? "bg-accent" : "bg-vellum-line")} style={{ clipPath: `inset(${BAR_PX - height}px 0 0 0 round 2px)` }} />
                </span>
                <span className={cx("text-caption", accent ? "font-medium text-accent" : "text-smoke")}>{DAY_LABEL[day].slice(0, 2)}</span>
              </li>
            );
          })}
        </ol>
        {drills ? (
          <p className="border-t border-vellum-line pt-3 text-small text-smoke">
            <span className="font-medium text-ink">{`${DAY_LABEL[drills.day]}:`}</span> {drills.items.map(({ label }) => label).join(" · ")}
          </p>
        ) : (
          <p className="border-t border-vellum-line pt-3 text-small text-smoke">Drills fill in after you add analytics.</p>
        )}
      </div>
    </div>
  );
}
