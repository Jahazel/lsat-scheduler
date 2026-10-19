"use client";

import { useEffect, useRef } from "react";
import { DAY_LABEL } from "@/lib/studentProfile";
import { previewDrills, previewHeader, previewWeek, type PreviewDrill, type WizardState } from "@/lib/onboardingWizard";
import type { DayOfWeek } from "@/lib/types";

const SKELETON = "h-2 rounded bg-ink-50";

interface LivePreviewProps {
  state: WizardState;
  firstName: string;
  initials: string;
  today: string;
}

export default function LivePreview({ state, firstName, initials, today }: LivePreviewProps) {
  const drills = state.step === "analytics" || state.step === "review" ? previewDrills(state, today) : null;

  if (state.step === "review" && state.screenshot.status === "read") {
    return (
      <aside aria-label="Preview of This week" className="hidden flex-col gap-4 bg-ink-50 px-8 pb-12 pt-32 lg:flex xl:px-18">
        <ScreenshotCard file={state.screenshot.file} />
        <div className="flex flex-col gap-2.5 rounded-md border border-ink-100 bg-white p-4">
          {drills ? (
            <DrillList title={`Your ${DAY_LABEL[drills.day]} from these values`} tag="Not confirmed yet" items={drills.items} />
          ) : (
            <p className="text-sm text-ink-500">No drilling days left this week.</p>
          )}
        </div>
      </aside>
    );
  }

  const header = previewHeader(state.values, firstName, today);
  return (
    <aside aria-label="Preview of This week" className="hidden overflow-hidden bg-ink-50 pl-8 pt-30 lg:flex xl:pl-18">
      <div className="flex w-full max-w-[880px] flex-col rounded-tl-md bg-white shadow-[0_24px_64px_rgb(10_10_10/0.06)]">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-ink-100 px-5 xl:px-7">
          <div className="flex items-center gap-5">
            <span className="text-base font-semibold tracking-[-0.02em] text-ink-900">DrillMap</span>
            <span className="flex h-7 items-center rounded-full bg-ink-50 px-3 text-sm font-medium text-ink-900">This week</span>
            <span aria-hidden className={`hidden w-14 xl:block ${SKELETON}`} />
            <span aria-hidden className={`hidden w-20 xl:block ${SKELETON}`} />
          </div>
          <div className="flex items-center gap-4">
            {header.countdown && (
              <span className="rounded-full border border-accent-600/25 bg-accent-600/8 px-2.5 py-1 text-sm font-medium text-accent-600">
                {header.countdown}
              </span>
            )}
            <span className="grid size-[30px] place-items-center rounded-full bg-ink-50 text-xs font-medium text-ink-900">{initials}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 px-5 pb-6 pt-8 xl:px-7">
          <p className="text-sm text-ink-500">{header.greeting}</p>
          <p className="flex flex-wrap items-baseline gap-x-3.5">
            <span className="text-[40px] font-semibold leading-[44px] tracking-[-0.035em] text-ink-900">{header.scores}</span>
            {header.target && <span className="text-base font-medium text-accent-600">{header.target}</span>}
          </p>
        </div>
        <div className="flex grow flex-col gap-3 border-t border-ink-100 bg-ink-50 px-5 py-6 xl:px-7">
          {state.step === "goal" ? <SkeletonDays /> : <Week state={state} drillDay={drills?.day ?? null} />}
          {state.step !== "goal" &&
            (drills ? (
              <div className="flex flex-col gap-2.5 rounded-md border border-ink-100 bg-white p-5">
                <DrillList title={`${DAY_LABEL[drills.day]}'s drills`} tag="Extracted · not confirmed" items={drills.items} />
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-md border border-dashed border-ink-200 p-5">
                <p className="text-sm text-ink-500">
                  {state.screenshot.status === "read" ? "No drilling days left this week." : "Your drills fill in after you upload analytics."}
                </p>
                <span aria-hidden className={`w-3/5 max-w-[260px] ${SKELETON} bg-ink-100`} />
                <span aria-hidden className={`w-2/5 max-w-[200px] ${SKELETON} bg-ink-100`} />
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
        <div key={index} className="flex flex-col gap-3 rounded-md border border-ink-100 bg-white p-5">
          {bars.map((width, bar) => (
            <span key={bar} className={`${SKELETON} ${bar === 0 ? "bg-ink-100" : ""}`} style={{ width }} />
          ))}
        </div>
      ))}
    </div>
  );
}

const BAR_MAX_PX = 130;

function Week({ state, drillDay }: { state: WizardState; drillDay: DayOfWeek | null }) {
  const week = previewWeek(state.values);
  return (
    <>
      <p className="flex items-baseline gap-3">
        <span className="text-base font-semibold text-ink-900">Your week</span>
        <span className="text-sm text-ink-500">{week.summary}</span>
      </p>
      <ol className="flex max-w-[636px] gap-1 min-[1440px]:gap-2">
        {week.days.map(({ day, label, time, practiceTest, barShare }) => (
          <li
            key={day}
            className={`flex h-[200px] min-w-0 max-w-[84px] flex-1 flex-col justify-between rounded-md border bg-white p-2 min-[1440px]:p-3 ${
              practiceTest ? "border-accent-600" : day === drillDay ? "border-ink-900" : "border-ink-100"
            }`}
          >
            <span className="flex flex-col gap-0.5">
              <span className={`text-xs ${practiceTest ? "text-accent-600" : "text-ink-500"}`}>{label}</span>
              <span className="whitespace-nowrap text-sm font-semibold text-ink-900 min-[1440px]:text-base">{time}</span>
            </span>
            <span
              className={`flex w-full items-end rounded ${practiceTest ? "bg-accent-600 p-2 text-xs font-medium leading-[14px] text-white" : "bg-accent-600/14"}`}
              style={{ height: Math.round(barShare * BAR_MAX_PX) }}
            >
              {practiceTest && "PT"}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

function FlagIcon() {
  return (
    <svg aria-hidden viewBox="0 0 10 10" className="size-2.5" fill="currentColor" stroke="currentColor" strokeLinejoin="round">
      <path d="M2 9V1.5h5.5L6.5 3.5l1 2H2" />
    </svg>
  );
}

function DrillList({ title, tag, items }: { title: string; tag: string; items: PreviewDrill[] }) {
  return (
    <>
      <p className="flex items-center gap-3">
        <span className="text-sm font-semibold text-ink-900">{title}</span>
        <span className="flex items-center gap-1.5 rounded-full border border-dashed border-accent-600 px-2 py-0.5 text-xs text-accent-600">
          <span aria-hidden className="size-1.5 rounded-full border border-accent-600" />
          {tag}
        </span>
      </p>
      <ul className="flex flex-col gap-2.5">
        {items.map(({ minutes, label, detail }, index) => (
          <li key={index} className="flex min-h-10 items-center gap-4 rounded-md border border-dashed border-accent-600/55 bg-accent-600/4 px-3">
            <span className="w-[52px] shrink-0 font-mono text-xs text-ink-500">{minutes}</span>
            <span className="text-sm font-medium text-ink-900">{label}</span>
            {detail?.kind === "accuracy" && <span className="font-mono text-xs text-accent-600">{detail.text}</span>}
            {detail?.kind === "flag" && (
              <span className="flex items-center gap-[5px] text-xs text-accent-600">
                <FlagIcon />
                Priority flag
              </span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function ScreenshotCard({ file }: { file: File }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (image.current) image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-semibold text-ink-900">Your screenshot</span>
        <span className="truncate font-mono text-xs text-ink-500">{file.name}</span>
      </figcaption>
      <div className="rounded-md border border-ink-100 bg-white p-2 shadow-[0_8px_24px_rgb(10_10_10/0.04)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL; next/image cannot load it */}
        <img ref={image} alt="Your 7Sage screenshot" className="max-h-[440px] w-full rounded object-contain object-top" />
      </div>
    </figure>
  );
}
