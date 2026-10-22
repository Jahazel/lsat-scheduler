import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/nav/shared";
import { FOCUS, cx } from "@/components/ui/classes";

const LEGAL = [
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/ai-disclosure", label: "AI disclosure" },
];

export function SignInFrame({ title, lead, preview, children }: {
  title: string;
  lead: string;
  preview: ReactNode;
  children: ReactNode;
}) {
  return (
    <div data-sign-in-page className="flex min-h-screen bg-paper">
      <div className="flex w-full flex-col px-5 py-8 md:px-30 lg:w-170 lg:shrink-0">
        <div className="flex h-10 items-center">
          <Logo href="/" />
        </div>
        <div className="flex grow flex-col justify-center py-12">
          <div className="flex w-full max-w-100 flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-h3 font-semibold text-ink">{title}</h1>
              <p className="text-body text-smoke">{lead}</p>
            </div>
            {children}
          </div>
        </div>
        <nav aria-label="Legal" className="flex gap-6 text-small text-smoke">
          {LEGAL.map((link) => (
            <Link key={link.href} href={link.href} className={cx("rounded-xs hover:text-ink", FOCUS)}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div aria-hidden className="hidden grow py-4 pr-4 lg:flex">
        <div className="relative flex grow items-center justify-center overflow-clip rounded-lg bg-vellum">
          <div className="absolute -right-[10%] -bottom-[55%] -left-[10%] h-[110%] rounded-[50%] bg-sign-in-glow" />
          <div className="relative flex w-110 shrink-0 flex-col gap-5 rounded-md border border-vellum-line bg-paper p-6 shadow-e2">
            {preview}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PreviewHeader({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <p className="font-mono text-label text-smoke uppercase">{label}</p>
      <p className="text-small text-smoke">{detail}</p>
    </div>
  );
}

export function SwitchPageLink({ question, href, label }: { question: string; href: string; label: string }) {
  return (
    <p className="flex gap-1 text-small text-smoke">
      {question}
      <Link href={href} className={cx("rounded-xs font-medium text-accent hover:text-ink", FOCUS)}>
        {label}
      </Link>
    </p>
  );
}
