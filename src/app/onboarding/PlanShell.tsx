import type { ReactNode } from "react";
import { PageCue } from "@/components/SiteMotion";
import { cx } from "@/components/ui/classes";
import type { PlanChoicePlace } from "@/lib/planChoice";
import { ONBOARDING_COLUMN, ONBOARDING_GRID } from "./shell";

export function PlanShell({ place, aside, children }: { place: PlanChoicePlace; aside?: ReactNode; children: ReactNode }) {
  if (place === "weekly_upload") {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] bg-paper lg:min-h-[calc(100vh-var(--spacing-18))] lg:grid-cols-[minmax(0,680px)_minmax(0,1fr)]">
        <div data-page-section className="px-5 pt-8 pb-12 lg:px-30 lg:pt-18 lg:pb-18">{children}</div>
        {aside}
      </div>
    );
  }
  return (
    <div className={cx(ONBOARDING_GRID, "bg-paper")}>
      <PageCue page="onboarding" />
      <div className={ONBOARDING_COLUMN}>
        <div data-page-swap data-page-section className="w-full lg:max-w-[440px]">
          <p className="mb-2 font-mono text-label uppercase text-smoke">Step 5 of 5 · Plan</p>
          {children}
        </div>
      </div>
      {aside}
    </div>
  );
}
