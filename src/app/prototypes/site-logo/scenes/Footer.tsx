import Link from "next/link";
import type { ReactNode } from "react";
import { FOCUS_ON_DARK, LANDING_LINK, cx } from "@/components/ui/classes";
import { ON_DARK, ProtoLogo } from "../logo/ProtoLogo";

const LEGAL = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/ai-disclosure", label: "AI Disclosure" },
];

function FooterLogo() {
  return (
    <p>
      <ProtoLogo form="horizontal" className={cx("h-4.5", ON_DARK)} />
      <span className="sr-only">DrillMap</span>
    </p>
  );
}

function ProtoFooter({ landing, signedIn }: { landing: boolean; signedIn: boolean }) {
  return (
    <footer className={cx("flex flex-col gap-12 px-5 pt-16 pb-12 md:px-18", landing ? "bg-void-eclipse" : "bg-graphite")}>
      <div className="flex items-center justify-between gap-4">
        <FooterLogo />
        {!signedIn && (
          <Link href="/login" className={cx("rounded-xs text-small font-medium text-chalk", LANDING_LINK, FOCUS_ON_DARK)}>
            Log in
          </Link>
        )}
      </div>
      <div className={cx("flex flex-col gap-4 border-t pt-6 text-small text-fog md:flex-row md:items-center md:justify-between", landing ? "border-chalk/12" : "border-graphite-line")}>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
          {LEGAL.map((link) => (
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

function Caption({ children }: { children: ReactNode }) {
  return <p className="bg-graphite-raised px-5 py-2 font-mono text-label text-fog uppercase md:px-18">{children}</p>;
}

export function Footers({ worst }: { worst: boolean }) {
  return (
    <div className="flex flex-col">
      <Caption>{worst ? "Landing page footer · signed in" : "Landing page footer · signed out"}</Caption>
      <div className="h-40 bg-gradient-to-b from-abyss-blue to-void-eclipse" />
      <ProtoFooter landing signedIn={worst} />
      <Caption>{worst ? "Legal page footer · signed out" : "Legal page footer · signed in"}</Caption>
      <div className="h-40 bg-paper" />
      <ProtoFooter landing={false} signedIn={!worst} />
    </div>
  );
}
