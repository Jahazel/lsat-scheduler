import type { ReactNode } from "react";
import { NavIcon } from "@/components/nav/NavIcon";
import { TABS } from "@/components/nav/shared";
import { LANDING_BUTTON, cx } from "@/components/ui/classes";
import { PAGE_IDS, PAGE_LABELS, type LegalPageId } from "./pages";
import { goToPage } from "./protoContext";

export function SiteChrome({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  return (
    <div className={cx("flex min-h-full flex-col bg-paper", signedIn ? "[--site-header:3.5rem] max-md:pb-24 md:[--site-header:4.5rem]" : "[--site-header:4rem]")}>
      {signedIn ? <StudentHeader /> : <SignedOutHeader />}
      <main className="flex-1">{children}</main>
      <footer className="flex flex-col gap-12 bg-graphite px-5 pt-16 pb-12 md:px-18">
        <div className="flex items-center justify-between gap-4">
          <p className="text-lead leading-h6 font-semibold tracking-heading text-chalk">DrillMap</p>
          {!signedIn && <span className="text-small font-medium text-chalk">Log in</span>}
        </div>
        <div className="flex flex-col gap-4 border-t border-graphite-line pt-6 text-small text-fog md:flex-row md:items-center md:justify-between">
          <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
            {PAGE_IDS.map((id) => (
              <FooterLink key={id} id={id} />
            ))}
          </nav>
          <p>Plans follow fixed rules. AI only reads your screenshots.</p>
        </div>
      </footer>
      {signedIn && <StudentTabBar />}
    </div>
  );
}

function SignedOutHeader() {
  return (
    <header data-site-header className="sticky top-0 z-40 px-5 md:px-12">
      <div aria-hidden className="absolute inset-0 -z-10 border-b border-vellum-line bg-vellum" />
      <div className="mx-auto flex h-16 max-w-content items-center gap-10">
        <span className="shrink-0 text-lead leading-h6 font-semibold tracking-heading text-ink">DrillMap</span>
        <nav aria-label="Primary" className="flex flex-1 items-center justify-end md:justify-between">
          <div className="hidden gap-7 text-small text-smoke md:flex">
            <span>How it works</span>
            <span>Pricing</span>
          </div>
          <div className="flex items-center gap-5">
            <span className="text-small font-medium text-ink">Log in</span>
            <span className={LANDING_BUTTON}>Start free week</span>
          </div>
        </nav>
      </div>
    </header>
  );
}

const AVATAR = "flex shrink-0 items-center justify-center rounded-pill bg-vellum font-medium text-ink";

function StudentHeader() {
  return (
    <header data-site-header className="sticky top-0 z-40 border-b border-vellum-line bg-paper">
      <div className="flex h-14 items-center justify-between gap-3 px-5 md:hidden">
        <span className="text-h5 font-semibold text-ink">DrillMap</span>
        <span className={cx(AVATAR, "size-8 text-caption")}>AW</span>
      </div>
      <div className="hidden h-18 items-center justify-between gap-6 px-18 md:flex">
        <div className="flex items-center gap-8">
          <span className="text-lead leading-h6 font-semibold tracking-heading text-ink">DrillMap</span>
          <nav aria-label="Primary" className="flex gap-1">
            {TABS.map((tab) => (
              <span key={tab.href} className="rounded-pill px-3 py-1.5 text-small text-smoke">{tab.label}</span>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-6 whitespace-nowrap">
          <span className="hidden text-body tabular-nums text-smoke lg:inline">41 days to test</span>
          <span className={cx(AVATAR, "size-10 text-small")}>AW</span>
        </div>
      </div>
    </header>
  );
}

function StudentTabBar() {
  return (
    <nav aria-label="Primary" className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-3 rounded-md border border-vellum-line bg-paper pb-[env(safe-area-inset-bottom)] shadow-e1 md:hidden">
      {TABS.map((tab) => (
        <span key={tab.href} className="flex min-h-16 flex-col items-center justify-center gap-1 text-caption text-smoke">
          <span className="flex h-7 w-12 items-center justify-center">
            <NavIcon name={tab.icon} />
          </span>
          {tab.short}
        </span>
      ))}
    </nav>
  );
}

function FooterLink({ id }: { id: LegalPageId }) {
  const label = id === "ai-disclosure" ? "AI Disclosure" : PAGE_LABELS[id];
  return (
    <a href={`/legal/${id}`} onClick={(event) => { event.preventDefault(); goToPage(id); }} className={cx("rounded-xs pointer-hover:text-chalk")}>
      {label}
    </a>
  );
}
