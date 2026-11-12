"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition, type CSSProperties } from "react";
import { TIER_LABEL } from "@/components/SnapshotReviewFields";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/classes";
import { weekReveal, weeksToTest, type PreviewDrill, type SaveInput } from "@/lib/onboardingWizard";
import { shortDuration } from "@/lib/formatDuration";
import { DAY_LABEL, type upcomingTestMonths } from "@/lib/studentProfile";
import type { DayOfWeek } from "@/lib/types";

const RISE_MS = [0, 70, 120, 160];
const BAR_PX = 80;

const BARS_START_MS = 140;
const BARS_SPAN_MS = 180;

const rise = (beat: number): CSSProperties => ({ animationDelay: `${RISE_MS[beat]}ms` });
const easeOut = (share: number) => 1 - (1 - share) ** 2;
const uncover = (index: number, count: number): CSSProperties => ({
  animationDelay: `${Math.round(BARS_START_MS + BARS_SPAN_MS * easeOut(index / (count - 1)))}ms`,
});

const phoneTileTime = (minutes: number) => shortDuration(minutes).replace(" min", "m").replaceAll(" ", "");

function reason(detail: PreviewDrill["detail"]) {
  if (!detail) return null;
  if (detail.kind === "accuracy") return `${detail.text} accuracy`;
  return detail.tier ? `${TIER_LABEL[detail.tier]} priority` : "Priority flag";
}

export function WeekReveal({
  saved,
  today,
  testMonths,
}: {
  saved: SaveInput;
  today: string;
  testMonths: ReturnType<typeof upcomingTestMonths>;
}) {
  const week = weekReveal(saved, today);
  const month = testMonths.find((option) => option.value === saved.goalTestDate)?.label;
  const weeks = weeksToTest(saved.goalTestDate, today);
  const practiceTestDay = saved.preferredPracticeTestDay;
  const drillDay: DayOfWeek | null = week.drills?.day ?? (week.analyticsAdded ? null : "MONDAY");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="week-reveal-rise flex flex-col gap-2" style={rise(0)}>
        <h1 ref={heading} tabIndex={-1} className="text-h3 font-semibold text-ink outline-none">Your first week is ready</h1>
        <p className="text-body text-smoke">Here is the week DrillMap made for you.</p>
      </div>
      <div className="week-reveal-rise flex flex-col gap-2" style={rise(1)}>
        <p className="text-small text-smoke">
          {[month && `${month} LSAT`, weeks && `${weeks} ${weeks === 1 ? "week" : "weeks"} away`].filter(Boolean).join(" · ")}
        </p>
        <p className="flex flex-wrap items-baseline gap-x-3.5">
          <span className="text-[40px] font-semibold leading-[44px] tracking-display text-ink tabular-nums">
            {`${saved.currentScore} → ${saved.goalScore}`}
          </span>
          <span className="text-body font-medium text-accent">{`+${saved.goalScore - saved.currentScore} to go`}</span>
        </p>
      </div>
      <div className="week-reveal-rise flex flex-col gap-3" style={rise(2)}>
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-body font-semibold text-ink">Your week</span>
          <span className="text-small text-smoke">
            {`${shortDuration(week.totalMinutes)} · practice test ${DAY_LABEL[practiceTestDay]}`}
          </span>
        </p>
        <ol className="grid grid-cols-7 gap-1 sm:gap-2">
          {week.days.map(({ day, label, practiceTest, barShare }, index) => {
            const minutes = saved.dailyCapacityMinutes[day];
            const lead = day === drillDay;
            return (
              <li
                key={day}
                aria-label={`${DAY_LABEL[day]}, ${shortDuration(minutes)}${practiceTest ? ", practice test" : ""}`}
                className={cx(
                  "flex h-[150px] min-w-0 flex-col gap-1.5 rounded-sm border bg-paper p-1 pb-1.5 sm:p-1.5",
                  practiceTest ? "border-accent" : lead ? "border-ink" : "border-vellum-line",
                )}
              >
                <span aria-hidden className={cx("px-0.5 text-caption", practiceTest ? "font-medium text-accent" : lead ? "font-medium text-ink" : "text-smoke")}>
                  {label}
                </span>
                <span aria-hidden className="flex flex-1 items-end">
                  <span
                    className={cx(
                      "week-reveal-bar flex w-full items-end justify-center rounded-xs",
                      practiceTest ? "bg-ink pb-1 text-caption font-medium leading-none text-chalk" : "bg-accent/14",
                    )}
                    style={{ height: Math.max(6, Math.round(barShare * BAR_PX)), ...uncover(index, week.days.length) }}
                  >
                    {practiceTest && "PT"}
                  </span>
                </span>
                <span aria-hidden className="-mx-0.5 whitespace-nowrap text-center text-caption font-medium tracking-heading text-ink tabular-nums">
                  <span className="sm:hidden">{phoneTileTime(minutes)}</span>
                  <span className="max-sm:hidden">{shortDuration(minutes)}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="week-reveal-rise flex flex-col gap-3" style={rise(3)}>
        <h2 className="text-body font-semibold text-ink">{drillDay ? `${DAY_LABEL[drillDay]}'s drills` : "This week's drills"}</h2>
        {week.drills ? (
          <ul className="flex flex-col gap-2">
            {week.drills.items.map(({ label, minutes, detail }, index) => {
              const why = reason(detail);
              return (
                <li key={index} className="flex min-h-11 items-center gap-4 rounded-sm border border-vellum-line bg-paper px-3 py-2">
                  <span className="min-w-[52px] shrink-0 whitespace-nowrap font-mono text-caption text-smoke">{minutes}</span>
                  <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="text-small font-medium text-ink [overflow-wrap:anywhere]">{label}</span>
                    {why && <span className="text-caption text-accent">{why}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-sm border border-dashed border-vellum-line px-4 py-3 text-small text-smoke">
            {week.analyticsAdded ? "No drilling days left this week." : "Drills fill in after you add your analytics."}
          </p>
        )}
      </div>
    </div>
  );
}

export function RevealAction({ admin }: { admin: boolean }) {
  const router = useRouter();
  const [leaving, startLeaving] = useTransition();

  function leave() {
    startLeaving(() => {
      if (admin) router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <Button waiting={leaving} onClick={leave} className="w-full">
      {admin ? "Go to This week" : "Choose your plan"}
    </Button>
  );
}
