import Link from "next/link";
import { FOCUS_ON_DARK, LANDING_LINK, cx } from "./classes";
import { RouteLogo } from "./RouteLogo";

const LINKS = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/ai-disclosure", label: "AI Disclosure" },
];

export function Footer({ signedIn }: { signedIn: boolean }) {
  return (
    <footer data-page-fade className="flex flex-col gap-12 bg-graphite px-5 pt-16 pb-12 md:px-18">
      <div className="flex items-center justify-between gap-4">
        <p className="text-silver-mist">
          <RouteLogo form="full" />
          <span className="sr-only">DrillMap</span>
        </p>
        {!signedIn && (
          <Link href="/login" className={cx("rounded-xs text-small font-medium text-chalk", LANDING_LINK, FOCUS_ON_DARK)}>
            Log in
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-4 border-t border-graphite-line pt-6 text-small text-fog md:flex-row md:items-center md:justify-between">
        <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={cx("rounded-xs pointer-hover:text-chalk", LANDING_LINK, FOCUS_ON_DARK)}>
              {link.label}
            </Link>
          ))}
        </nav>
        <p>Plans follow fixed rules. AI only reads your screenshots.</p>
      </div>
    </footer>
  );
}
