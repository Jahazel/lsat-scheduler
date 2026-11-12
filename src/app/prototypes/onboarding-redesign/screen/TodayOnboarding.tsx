"use client";

import OnboardingWizard from "@/app/onboarding/OnboardingWizard";
import { BAR, HEADER, Logo } from "@/components/nav/shared";
import type { ExtractReply } from "@/lib/screenshotUpload";
import { upcomingTestMonths } from "@/lib/studentProfile";
import type { AnalyticsSection } from "@/lib/types";

const TODAY = "2026-11-11";

const READS: Record<AnalyticsSection, ExtractReply> = {
  LR: {
    kind: "rows",
    rows: [
      { type: "Diagram", category: "regular", accuracy: 64 },
      { type: "Conditional reasoning", category: "regular", accuracy: 68 },
      { type: "Necessary assumption", category: "regular", accuracy: 71 },
      { type: "Flaw or descriptive weakening", category: "regular", accuracy: 74 },
      { type: "Resolve reconcile or explain", category: "regular", accuracy: 75 },
      { type: "Phenomenon-hypothesis (LR)", category: "restricted", isTopPriority: true, priorityTier: "highest" },
      { type: "Link assumption", category: "restricted", priorityTier: "medium" },
      { type: "Causal reasoning", category: "restricted", priorityTier: "low" },
    ],
  },
  RC: {
    kind: "rows",
    showsPassageTypes: true,
    rows: [
      { type: "Law", category: "passage", accuracy: 58 },
      { type: "Comparative", category: "passage", accuracy: 70 },
      { type: "Science", category: "passage", accuracy: 64 },
      { type: "Humanities", category: "passage", accuracy: 81 },
      { type: "Art", category: "passage", accuracy: 77 },
    ],
  },
};

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function TodayOnboarding() {
  return (
    <>
      <header data-site-header="workspace" className={HEADER}>
        <div className={BAR}>
          <Logo href="#" form="mark-below-md" />
          <button type="button" className="text-small text-ink">Log out</button>
        </div>
      </header>
      <OnboardingWizard
        firstName="Dana"
        today={TODAY}
        goalTestDateOptions={upcomingTestMonths(TODAY)}
        onSave={async () => {
          await pause(1200);
        }}
        extract={async (_file, section) => {
          await pause(1500);
          return READS[section];
        }}
      />
    </>
  );
}
