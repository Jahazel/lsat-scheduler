"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SignOutForm } from "@/components/SignOutForm";
import { FOCUS, MOTION, cx } from "@/components/ui/classes";
import { NavTab } from "@/components/ui/NavTab";
import { NavIcon } from "./NavIcon";
import { DESKTOP_BAR, Logo, MOBILE_BAR, TABS, isTabActive } from "./shared";
import type { SignOutAnswer } from "@/lib/requestPolicy";
import { WORKSPACE_NAV_BREAKPOINT } from "./workspaceBreakpoint";

export interface StudentNavProps {
  initials: string;
  email: string;
  countdownLabel: string | null;
  isTestDay: boolean;
  uploadNeeded: boolean;
  logOut: () => Promise<SignOutAnswer>;
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
        className={cx(
          "flex shrink-0 items-center justify-center rounded-pill bg-vellum font-medium text-ink hover:bg-vellum-line",
          compact ? "size-8 text-caption" : "size-10 text-small",
          MOTION,
          FOCUS,
        )}
      >
        {initials}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-60 rounded-xs border border-vellum-line bg-paper py-1 shadow-e3"
        >
          <p className="truncate border-b border-vellum-line px-4 py-2.5 text-caption text-smoke">{email}</p>
          {countdownLabel && (
            <p className={cx("border-b border-vellum-line px-4 py-2.5 text-small text-smoke", !compact && "@[900px]:hidden")}>{countdownLabel}</p>
          )}
          <Link role="menuitem" href="/account" onClick={() => setOpen(false)} className={item}>
            Account
          </Link>
          <SignOutForm action={logOut}>
            <button role="menuitem" type="submit" className={item}>
              Log out
            </button>
          </SignOutForm>
        </div>
      )}
    </div>
  );
}

function Countdown({ label, isTestDay }: { label: string; isTestDay: boolean }) {
  if (isTestDay) {
    return <span className="text-body font-medium text-ink">{label}</span>;
  }
  return <span className="text-body tabular-nums text-smoke">{label}</span>;
}

export default function StudentNav(props: StudentNavProps & { workspaceSwitcher?: ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => isTabActive(pathname, href);

  const currentTab = TABS.find((tab) => isActive(tab.href));

  return (
    <>
      <div className={cx(MOBILE_BAR, props.workspaceSwitcher ? WORKSPACE_NAV_BREAKPOINT.mobileHeader : "md:hidden")}>
        <div className="flex min-w-0 items-center gap-1 sm:gap-3">
          <Logo href="/dashboard" compact />
          {props.workspaceSwitcher && <span className="text-fog" aria-hidden data-workspace-separator="true">/</span>}
          {props.workspaceSwitcher}
        </div>
        <div className="flex items-center gap-3">
          {currentTab && (
            <span className="hidden whitespace-nowrap rounded-pill bg-vellum px-3 py-[5px] text-small text-ink min-[360px]:inline">{currentTab.label}</span>
          )}
          <AvatarMenu {...props} compact />
        </div>
      </div>

      <div className={cx("@container hidden", props.workspaceSwitcher ? WORKSPACE_NAV_BREAKPOINT.desktopHeader : "md:block")}>
        <div className={DESKTOP_BAR}>
          <div className="flex min-w-0 items-center gap-8">
            <div className="flex items-center gap-3">
              <Logo href="/dashboard" />
              {props.workspaceSwitcher && <span className="text-fog" aria-hidden data-workspace-separator="true">/</span>}
              {props.workspaceSwitcher}
            </div>
            <nav aria-label="Primary" className="flex gap-1">
              {TABS.map((tab) => (
                <NavTab key={tab.href} href={tab.href} current={isActive(tab.href)}>
                  {tab.label}
                  {tab.flagsUpload && props.uploadNeeded && <UploadDot />}
                </NavTab>
              ))}
            </nav>
          </div>
          <div className="flex items-center justify-end gap-6 whitespace-nowrap">
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
