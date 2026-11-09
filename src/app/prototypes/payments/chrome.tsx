import type { ReactNode } from "react";
import { BAR, DESKTOP_BAR, HEADER, MOBILE_BAR } from "@/components/nav/shared";
import { NavIcon } from "@/components/nav/NavIcon";
import { cx } from "@/components/ui/classes";
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

const TAB_LABELS = [
  { label: "This week", icon: "week" },
  { label: "Progress", icon: "progress" },
  { label: "Study settings", short: "Settings", icon: "settings" },
] as const;

// A still copy of the student nav: the real one needs a session and links out of the prototype.
export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-paper pb-24 md:pb-0">
      <header className={HEADER}>
        <div className={cx(MOBILE_BAR, "md:hidden")}>
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden whitespace-nowrap rounded-pill bg-vellum px-3 py-[5px] text-small text-ink min-[360px]:inline">This week</span>
            <Avatar compact />
          </div>
        </div>
        <div className="@container hidden md:block">
          <div className={DESKTOP_BAR}>
            <div className="flex min-w-0 items-center gap-8">
              <Logo />
              <nav aria-label="Primary" className="flex gap-1">
                {TAB_LABELS.map((tab, index) => (
                  <span key={tab.label} aria-current={index === 0 ? "page" : undefined} className={cx("flex h-10 items-center whitespace-nowrap rounded-pill px-4 text-body text-ink", index === 0 ? "bg-vellum font-medium" : "font-regular")}>
                    {tab.label}
                  </span>
                ))}
              </nav>
            </div>
            <div className="flex items-center justify-end gap-6 whitespace-nowrap">
              <span className="hidden text-body tabular-nums text-smoke @[900px]:inline-flex">LSAT in 46 days</span>
              <Avatar compact={false} />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <nav aria-label="Primary" className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-3 rounded-md border border-vellum-line bg-paper shadow-e1 md:hidden">
        {TAB_LABELS.map((tab, index) => (
          <span key={tab.label} className={cx("flex min-h-16 flex-col items-center justify-center gap-1 text-caption", index === 0 ? "font-semibold text-ink" : "text-smoke")}>
            <span className="flex h-7 w-12 items-center justify-center"><NavIcon name={tab.icon} /></span>
            {"short" in tab ? tab.short : tab.label}
          </span>
        ))}
      </nav>
    </div>
  );
}

function Avatar({ compact }: { compact: boolean }) {
  return (
    <span className={cx("flex shrink-0 items-center justify-center rounded-pill bg-vellum font-medium text-ink", compact ? "size-8 text-caption" : "size-10 text-small")}>MR</span>
  );
}
