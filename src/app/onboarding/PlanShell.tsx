"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { PageCue } from "@/components/SiteMotion";
import type { PlanChoicePlace } from "@/lib/planChoice";
import { slideInFromServer } from "@/lib/pageMotion";
import { ROAD_PANEL, STEP_COLUMN, STEP_CONTENT, STEP_GRID, TALL_SCREEN_PINNED_BAR } from "./shell";
import { StepCount } from "./StepCount";
import { usePinnedBarHeight } from "./usePinnedBarHeight";

type PlanShellProps = { place: PlanChoicePlace; aside?: ReactNode; actions?: ReactNode; children: ReactNode };

export function PlanShell({ place, ...parts }: PlanShellProps) {
  return place === "weekly_upload" ? <WeeklyUploadShell {...parts} /> : <OnboardingShell {...parts} />;
}

function WeeklyUploadShell({ aside, actions, children }: Omit<PlanShellProps, "place">) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] bg-paper lg:min-h-[calc(100vh-var(--spacing-18))] lg:grid-cols-[minmax(0,680px)_minmax(0,1fr)]">
      <div data-page-section className="flex flex-col gap-4 px-5 pt-8 pb-12 lg:px-30 lg:pt-18 lg:pb-18">
        {children}
        {actions}
      </div>
      {aside && (
        <aside data-page-section aria-label="What happens next" className="hidden bg-vellum px-8 pt-32 pb-12 lg:block xl:px-18">
          <div className="max-w-[520px]">{aside}</div>
        </aside>
      )}
    </div>
  );
}

function OnboardingShell({ aside, actions, children }: Omit<PlanShellProps, "place">) {
  const area = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => slideInFromServer(area.current!), []);
  return (
    <div ref={area} className={STEP_GRID}>
      <PageCue page="onboarding" />
      <StepCount step="plan" />
      <div data-page-swap data-page-section className={STEP_COLUMN}>
        <div className={STEP_CONTENT}>
          <div className="w-full max-w-[440px]">{children}</div>
        </div>
        {actions && <PinnedBar>{actions}</PinnedBar>}
      </div>
      <aside data-page-fade aria-label="What happens next" className={ROAD_PANEL}>
        <div data-page-swap data-page-section className="sticky top-30">{aside}</div>
      </aside>
    </div>
  );
}

function PinnedBar({ children }: { children: ReactNode }) {
  const bar = usePinnedBarHeight();
  return (
    <div ref={bar} data-pinned-bar className={TALL_SCREEN_PINNED_BAR}>
      <div className="mx-auto max-w-[440px]">{children}</div>
    </div>
  );
}
