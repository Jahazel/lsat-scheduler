"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NavIcon, type NavIconName } from "./NavIcon";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600";
const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

const TABS: { href: string; label: string; short: string; icon: NavIconName }[] = [
  { href: "/dashboard", label: "This week", short: "This week", icon: "week" },
  { href: "/progress", label: "Progress", short: "Progress", icon: "progress" },
  { href: "/settings", label: "Study settings", short: "Settings", icon: "settings" },
];

export interface StudentNavProps {
  initials: string;
  email: string;
  countdownLabel: string | null;
  isTestDay: boolean;
  uploadNeeded: boolean;
  logOut: () => Promise<void>;
}

function UploadDot({ className }: { className?: string }) {
  return (
    <>
      <span className={cx("inline-block size-2 rounded-full bg-accent-600", className)} aria-hidden />
      <span className="sr-only"> — analytics upload needed</span>
    </>
  );
}

function Logo() {
  return (
    <Link href="/dashboard" className={cx("font-semibold tracking-tight text-ink-900", FOCUS)}>
      DrillMap
    </Link>
  );
}

function AvatarMenu({ initials, email, countdownLabel, logOut, compact }: Pick<StudentNavProps, "initials" | "email" | "countdownLabel" | "logOut"> & { compact: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const initialsCircle = "flex items-center justify-center rounded-full bg-accent-100 font-semibold text-accent-700";
  const item = cx("block w-full px-4 py-2.5 text-left text-sm text-ink-900 hover:bg-ink-50", FOCUS);

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${email}`}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className={
          compact
            ? cx(initialsCircle, "size-9 text-sm", FOCUS)
            : cx("flex h-9 items-center gap-2 rounded-full bg-ink-50 pl-1 pr-2.5 text-sm text-ink-900 transition-colors duration-150 ease-out hover:bg-ink-100", FOCUS)
        }
      >
        {compact ? (
          initials
        ) : (
          <>
            <span className={cx(initialsCircle, "size-7 text-xs")}>{initials}</span>
            <NavIcon name="chevron" className="size-4 text-ink-500" />
          </>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-60 rounded-lg border border-ink-200 bg-white py-1 shadow-[0_8px_24px_oklch(19%_0.013_205/0.12)]"
        >
          <p className="truncate border-b border-ink-100 px-4 py-2.5 text-xs text-ink-500">{email}</p>
          {countdownLabel && (
            <p className={cx("border-b border-ink-100 px-4 py-2.5 text-sm text-ink-700", !compact && "@[900px]:hidden")}>{countdownLabel}</p>
          )}
          <Link role="menuitem" href="/account" onClick={() => setOpen(false)} className={item}>
            Account
          </Link>
          <form action={logOut}>
            <button role="menuitem" type="submit" className={item}>
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Countdown({ label, isTestDay }: { label: string; isTestDay: boolean }) {
  if (isTestDay) {
    return <span className="rounded-full bg-accent-600 px-3 py-1 text-sm font-semibold text-white">{label}</span>;
  }
  const [count, ...rest] = label.split(" ");
  return (
    <span className="rounded-full bg-ink-50 px-3 py-1 text-sm text-ink-700">
      <b className="font-mono font-semibold tabular-nums text-ink-900">{count}</b> {rest.join(" ")}
    </span>
  );
}

export default function StudentNav(props: StudentNavProps) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Mobile: slim bar. The countdown lives in the avatar menu. */}
      <div className="flex h-14 items-center justify-between px-4 md:hidden">
        <Logo />
        <AvatarMenu {...props} compact />
      </div>

      {/* Desktop: centred pill tabs. Below 900px of bar width the countdown folds into the menu. */}
      <div className="@container hidden md:block">
        <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-6 px-8">
          <div className="flex items-center">
            <Logo />
          </div>
          <nav aria-label="Primary" className="flex gap-1 rounded-full bg-ink-50 p-1">
            {TABS.map((tab) => {
              const active = isActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors duration-150 ease-out",
                    active
                      ? "bg-white font-semibold text-ink-900 shadow-[0_1px_2px_oklch(19%_0.013_205/0.12)]"
                      : "text-ink-500 hover:text-ink-900",
                    FOCUS,
                  )}
                >
                  {tab.label}
                  {tab.href === "/dashboard" && props.uploadNeeded && <UploadDot />}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center justify-end gap-4 whitespace-nowrap">
            {props.countdownLabel && (
              <span className="hidden @[900px]:inline-flex">
                <Countdown label={props.countdownLabel} isTestDay={props.isTestDay} />
              </span>
            )}
            <AvatarMenu {...props} compact={false} />
          </div>
        </div>
      </div>
    </>
  );
}

// Floating bottom tab bar, mobile only. Rendered outside the header so it can be fixed to the viewport.
export function StudentTabBar({ uploadNeeded }: { uploadNeeded: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-3 rounded-2xl border border-ink-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_4px_16px_oklch(19%_0.013_205/0.1)] md:hidden"
    >
      {TABS.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex min-h-16 flex-col items-center justify-center gap-1 text-xs",
              active ? "font-semibold text-accent-700" : "text-ink-500",
              FOCUS,
            )}
          >
            <span className="relative flex h-7 w-12 items-center justify-center">
              <NavIcon name={tab.icon} />
              {tab.href === "/dashboard" && uploadNeeded && <UploadDot className="absolute right-2 top-0.5 ring-2 ring-white" />}
            </span>
            {tab.short}
          </Link>
        );
      })}
    </nav>
  );
}
