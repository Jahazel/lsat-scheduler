"use client";

import { DAY_LABEL } from "@/lib/studentProfile";
import { SECTIONS } from "@/lib/analyticsReview";
import { screenshot, type PreviewDrill, type WizardState } from "@/lib/onboardingWizard";
import { DrillList, type DrillItem } from "@/components/WeekPreview";
import { ScreenshotCard } from "@/components/SnapshotReviewFields";
import type { DayOfWeek } from "@/lib/types";

export default function LivePreview({ state, drills }: { state: WizardState; drills: { day: DayOfWeek; items: PreviewDrill[] } | null }) {
  const typed = state.analyticsInput === "typed";
  return (
    <aside aria-label="Preview of This week" className="hidden flex-col gap-4 bg-vellum px-8 pb-12 pt-12 lg:flex xl:px-18">
      {!typed && SECTIONS.map((section) => {
        const file = screenshot(state, section)?.file;
        return file && <ScreenshotCard key={section} section={section} file={file} />;
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

function drillItems(drills: PreviewDrill[]): DrillItem[] {
  return drills.map(({ minutes, label, detail }) => ({
    minutes,
    label,
    detail: detail?.kind === "flag" ? { kind: "flag", text: "Priority flag" } : detail,
  }));
}
