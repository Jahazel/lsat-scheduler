"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavIcon } from "./NavIcon";
import { FOCUS, Logo, TABS, cx, isTabActive } from "./shared";
import { WORKSPACE_NAV_BREAKPOINT } from "./workspaceBreakpoint";

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
      <span className={cx("inline-block size-2 rounded-full bg-ink", className)} aria-hidden />
      <span className="sr-only"> analytics upload needed</span>
    </>
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

  const initialsCircle = "flex items-center justify-center rounded-full bg-accent/tint font-semibold text-accent";
  const item = cx("block w-full px-4 py-2.5 text-left text-small text-ink hover:bg-vellum", FOCUS);

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
            ? cx(initialsCircle, "size-9 text-small", FOCUS)
            : cx("flex h-9 items-center gap-2 rounded-full bg-vellum pl-1 pr-2.5 text-small text-ink transition-colors duration-150 ease-out hover:bg-vellum-line", FOCUS)
        }
      >
        {compact ? (
          initials
        ) : (
          <>
            <span className={cx(initialsCircle, "size-7 text-caption")}>{initials}</span>
            <NavIcon name="chevron" className="size-4 text-smoke" />
          </>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-60 rounded-xs border border-vellum-line bg-paper py-1 shadow-e3"
        >
          <p className="truncate border-b border-vellum-line px-4 py-2.5 text-caption text-smoke">{email}</p>
          {countdownLabel && (
            <p className={cx("border-b border-vellum-line px-4 py-2.5 text-small text-smoke", !compact && "@[900px]:hidden")}>{countdownLabel}</p>
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
    return <span className="rounded-full bg-ink px-3 py-1 text-small font-semibold text-chalk">{label}</span>;
  }
  const [count, ...rest] = label.split(" ");
  return (
    <span className="rounded-full bg-vellum px-3 py-1 text-small text-smoke">
      <b className="font-mono font-semibold tabular-nums text-ink">{count}</b> {rest.join(" ")}
    </span>
  );
}

export default function StudentNav(props: StudentNavProps & { workspaceSwitcher?: ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => isTabActive(pathname, href);

  return (
    <>
      {/* Mobile: slim bar. The countdown lives in the avatar menu. */}
      <div className={cx("flex h-14 items-center justify-between px-4", props.workspaceSwitcher ? WORKSPACE_NAV_BREAKPOINT.mobileHeader : "md:hidden")}>
        <div className="flex items-center gap-1 sm:gap-3">
          <Logo href="/dashboard" />
          {props.workspaceSwitcher && <span className="text-fog" aria-hidden data-workspace-separator="true">/</span>}
          {props.workspaceSwitcher}
        </div>
        <AvatarMenu {...props} compact />
      </div>

      {/* Desktop: centred pill tabs. Below 900px of bar width the countdown folds into the menu. */}
      <div className={cx("@container hidden", props.workspaceSwitcher ? WORKSPACE_NAV_BREAKPOINT.desktopHeader : "md:block")}>
        <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-6 px-8">
          <div className="flex items-center gap-3">
            <Logo href="/dashboard" />
            {props.workspaceSwitcher && <span className="text-fog" aria-hidden data-workspace-separator="true">/</span>}
            {props.workspaceSwitcher}
          </div>
          <nav aria-label="Primary" className="flex gap-1 rounded-full bg-vellum p-1">
            {TABS.map((tab) => {
              const active = isActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-small transition-colors duration-150 ease-out",
                    active
                      ? "bg-paper font-semibold text-ink shadow-control"
                      : "text-smoke hover:text-ink",
                    FOCUS,
                  )}
                >
                  {tab.label}
                  {tab.flagsUpload && props.uploadNeeded && <UploadDot />}
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
export function StudentTabBar({ uploadNeeded, withWorkspaceSwitcher = false }: { uploadNeeded: boolean; withWorkspaceSwitcher?: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => isTabActive(pathname, href);

  return (
    <nav
      aria-label="Primary"
      data-tab-bar
      data-workspace-tabs={withWorkspaceSwitcher || undefined}
      className={cx("fixed inset-x-3 bottom-3 z-40 grid grid-cols-3 rounded-md border border-vellum-line bg-paper pb-[env(safe-area-inset-bottom)] shadow-e1", withWorkspaceSwitcher ? WORKSPACE_NAV_BREAKPOINT.mobileTabBar : "md:hidden")}
    >
      {TABS.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex min-h-16 flex-col items-center justify-center gap-1 text-caption",
              active ? "font-semibold text-ink" : "text-smoke",
              FOCUS,
            )}
          >
            <span className="relative flex h-7 w-12 items-center justify-center">
              <NavIcon name={tab.icon} />
              {tab.flagsUpload && uploadNeeded && <UploadDot className="absolute right-2 top-0.5 ring-2 ring-paper" />}
            </span>
            {tab.short}
          </Link>
        );
      })}
    </nav>
  );
}
