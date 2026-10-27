import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/nav/shared";
import { FOCUS, cx } from "@/components/ui/classes";
import type { LoginNotice } from "@/lib/loginNotice";

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

const NOTICE_LOOKS = {
  danger: { icon: "stroke-danger-ink", text: "text-danger-ink", role: "alert" },
  warning: { icon: "stroke-warning-ink", text: "text-warning-ink", role: "alert" },
  info: { icon: "stroke-smoke", text: "text-ink", role: "status" },
  emailSent: { icon: "stroke-accent", text: "text-accent", role: "status" },
  success: { icon: "stroke-success-ink", text: "text-success-ink", role: "status" },
} as const;

export function Notice({ notice }: { notice: LoginNotice }) {
  const look = NOTICE_LOOKS[notice.tone];
  return (
    <div className="flex items-start gap-2">
      <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" className={cx("mt-0.5 shrink-0", look.icon)} fill="none" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        {notice.tone === "emailSent" ? (
          <>
            <rect x="1.75" y="3.25" width="12.5" height="9.5" rx="1.5" />
            <path d="M2.25 4.25L8 8.75l5.75-4.5" />
          </>
        ) : (
          <circle cx="8" cy="8" r="6.5" />
        )}
        {notice.tone === "danger" && (
          <>
            <path d="M8 4.75V8.75" />
            <circle cx="8" cy="11" r="0.8" className="fill-danger-ink stroke-none" />
          </>
        )}
        {(notice.tone === "info" || notice.tone === "warning") && <path d="M8 4.75V8L10.25 9.5" />}
        {notice.tone === "success" && <path d="M5.25 8.25l1.85 1.85 3.65-3.85" />}
      </svg>
      <p role={look.role} className={cx("text-small leading-[20px]", look.text)}>
        {notice.text}
      </p>
    </div>
  );
}
