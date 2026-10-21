"use client";

import { useEffect, useRef } from "react";
import { DAY_LABEL } from "@/lib/studentProfile";
import { SECTION_NAME, SECTIONS } from "@/lib/analyticsReview";
import { previewDrills, previewHeader, previewWeek, type PreviewDrill, type WizardState } from "@/lib/onboardingWizard";
import type { AnalyticsSection, DayOfWeek } from "@/lib/types";
import { DrillList, WeekTiles, type DrillItem } from "@/components/WeekPreview";

const SKELETON = "h-2 rounded bg-vellum";

interface LivePreviewProps {
  state: WizardState;
  firstName: string;
  initials: string;
  today: string;
}

export default function LivePreview({ state, firstName, initials, today }: LivePreviewProps) {
  const drills = state.step === "analytics" || state.step === "review" ? previewDrills(state, today) : null;

  if (state.step === "review" && state.draft) {
    return (
      <aside aria-label="Preview of This week" className="hidden flex-col gap-4 bg-vellum px-8 pb-12 pt-32 lg:flex xl:px-18">
        {SECTIONS.map((section) => {
          const screenshot = state.screenshots[section];
          return screenshot.status === "none" ? null : <ScreenshotCard key={section} section={section} file={screenshot.file} />;
        })}
        <div className="flex flex-col gap-2.5 rounded-sm border border-vellum-line bg-paper p-4">
          {drills ? (
            <DrillList title={`Your ${DAY_LABEL[drills.day]} from these values`} tag="Not confirmed yet" items={drillItems(drills.items)} />
          ) : (
            <p className="text-small text-smoke">No drilling days left this week.</p>
          )}
        </div>
      </aside>
    );
  }

  const header = previewHeader(state.values, firstName, today);
  return (
    <aside aria-label="Preview of This week" className="hidden overflow-hidden bg-vellum pl-8 pt-30 lg:flex xl:pl-18">
      <div className="flex w-full max-w-[880px] flex-col rounded-tl-sm bg-paper shadow-e2">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-vellum-line px-5 xl:px-7">
          <div className="flex items-center gap-5">
            <span className="text-body font-semibold tracking-[-0.02em] text-ink">DrillMap</span>
            <span className="flex h-7 items-center rounded-full bg-vellum px-3 text-small font-medium text-ink">This week</span>
            <span aria-hidden className={`hidden w-14 xl:block ${SKELETON}`} />
            <span aria-hidden className={`hidden w-20 xl:block ${SKELETON}`} />
          </div>
          <div className="flex items-center gap-4">
            {header.countdown && (
              <span className="rounded-full border border-accent/25 bg-accent/8 px-2.5 py-1 text-small font-medium text-accent">
                {header.countdown}
              </span>
            )}
            <span className="grid size-[30px] place-items-center rounded-full bg-vellum text-caption font-medium text-ink">{initials}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 px-5 pb-6 pt-8 xl:px-7">
          <p className="text-small text-smoke">{header.greeting}</p>
          <p className="flex flex-wrap items-baseline gap-x-3.5">
            <span className="text-[40px] font-semibold leading-[44px] tracking-display text-ink">{header.scores}</span>
            {header.target && <span className="text-body font-medium text-accent">{header.target}</span>}
          </p>
        </div>
        <div className="flex grow flex-col gap-3 border-t border-vellum-line bg-vellum px-5 py-6 xl:px-7">
          {state.step === "goal" ? <SkeletonDays /> : <Week state={state} drillDay={drills?.day ?? null} />}
          {state.step !== "goal" &&
            (drills ? (
              <div className="flex flex-col gap-2.5 rounded-sm border border-vellum-line bg-paper p-5">
                <DrillList title={`${DAY_LABEL[drills.day]}'s drills`} tag="Extracted · not confirmed" items={drillItems(drills.items)} />
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-sm border border-dashed border-vellum-line p-5">
                <p className="text-small text-smoke">
                  {state.draft ? "No drilling days left this week." : "Your drills fill in after you upload analytics."}
                </p>
                <span aria-hidden className={`w-3/5 max-w-[260px] ${SKELETON} bg-vellum-line`} />
                <span aria-hidden className={`w-2/5 max-w-[200px] ${SKELETON} bg-vellum-line`} />
              </div>
            ))}
        </div>
      </div>
    </aside>
  );
}

function SkeletonDays() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      {[[120, 260, 200], [96, 300], [136, 240, 180]].map((bars, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-sm border border-vellum-line bg-paper p-5">
          {bars.map((width, bar) => (
            <span key={bar} className={`${SKELETON} ${bar === 0 ? "bg-vellum-line" : ""}`} style={{ width }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Week({ state, drillDay }: { state: WizardState; drillDay: DayOfWeek | null }) {
  const week = previewWeek(state.values);
  return (
    <>
      <p className="flex items-baseline gap-3">
        <span className="text-body font-semibold text-ink">Your week</span>
        <span className="text-small text-smoke">{week.summary}</span>
      </p>
      <WeekTiles days={week.days} highlight={drillDay} />
    </>
  );
}

function drillItems(drills: PreviewDrill[]): DrillItem[] {
  return drills.map(({ minutes, label, detail }) => ({
    minutes,
    label,
    detail: detail?.kind === "flag" ? { kind: "flag", text: "Priority flag" } : detail,
  }));
}

function ScreenshotCard({ section, file }: { section: AnalyticsSection; file: File }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (image.current) image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="text-small font-semibold text-ink">{SECTION_NAME[section]}</span>
        <span className="truncate font-mono text-caption text-smoke">{file.name}</span>
      </figcaption>
      <div className="rounded-sm border border-vellum-line bg-paper p-2 shadow-e1">
        {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL; next/image cannot load it */}
        <img ref={image} alt={`Your 7Sage ${SECTION_NAME[section]} screenshot`} className="max-h-[440px] w-full rounded object-contain object-top" />
      </div>
    </figure>
  );
}
