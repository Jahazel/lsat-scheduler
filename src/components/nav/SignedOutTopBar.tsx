import Link from "next/link";
import { FOCUS, LANDING_BUTTON, LANDING_LINK, cx } from "@/components/ui/classes";
import { Logo } from "./shared";

const SECTION_LINK = cx("rounded-xs text-small text-smoke pointer-hover:text-ink", LANDING_LINK, FOCUS);

export default function SignedOutTopBar() {
  return (
    <header data-site-header="bar" className="sticky top-0 z-40 px-5 md:px-12">
      <div data-page-fade aria-hidden className="absolute inset-0 -z-10 border-b border-vellum-line bg-vellum" />
      <div className="mx-auto flex h-16 max-w-content items-center gap-2.5 min-[360px]:gap-10">
        <Logo href="/" />
        <nav data-page-fade aria-label="Primary" className="flex flex-1 items-center justify-end md:justify-between">
          <div className="hidden gap-7 md:flex">
            <Link href="/#how-it-works" className={SECTION_LINK}>How it works</Link>
            <Link href="/#pricing" className={SECTION_LINK}>Pricing</Link>
          </div>
          <div className="flex items-center gap-2.5 min-[360px]:gap-5">
            <Link href="/login" className={cx("rounded-xs text-small font-medium whitespace-nowrap text-ink", LANDING_LINK, FOCUS)}>Log in</Link>
            <Link href="/signup" className={cx(LANDING_BUTTON, FOCUS)}>Start free week</Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
