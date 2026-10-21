import Link from "next/link";
import { FOCUS, cx } from "./classes";

const LINKS = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/ai-disclosure", label: "AI Disclosure" },
];

export function Footer() {
  return (
    <footer className="flex flex-col gap-12 bg-graphite px-5 pt-16 pb-12 md:px-18">
      <p className="text-lead leading-h6 font-semibold tracking-heading text-chalk">DrillMap</p>
      <div className="flex flex-col gap-4 border-t border-graphite-line pt-6 text-small text-fog md:flex-row md:items-center md:justify-between">
        <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={cx("rounded-xs hover:text-chalk", FOCUS)}>
              {link.label}
            </Link>
          ))}
        </nav>
        <p>Plans follow fixed rules. AI only reads your screenshots.</p>
      </div>
    </footer>
  );
}
