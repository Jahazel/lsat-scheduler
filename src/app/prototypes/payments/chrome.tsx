import type { ReactNode } from "react";
import { BAR, HEADER } from "@/components/nav/shared";
import { ONBOARDING_COLUMN, ONBOARDING_GRID } from "@/app/onboarding/shell";

function Logo() {
  return <span className="shrink-0 text-h5 font-semibold text-ink md:text-lead md:leading-h6 md:tracking-heading">DrillMap</span>;
}

export function OnboardingChrome({ children, preview }: { children: ReactNode; preview: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-paper">
      <header className={HEADER}>
        <div className={BAR}>
          <Logo />
          <span className="text-small text-smoke md:text-body">Log out</span>
        </div>
      </header>
      <div className={ONBOARDING_GRID}>
        <div className={ONBOARDING_COLUMN}>
          <div data-page-swap className="w-full lg:max-w-[440px]">
            <p className="mb-2 font-mono text-label uppercase text-smoke">Step 5 of 5 · Plan</p>
            {children}
          </div>
        </div>
        {preview}
      </div>
    </div>
  );
}
