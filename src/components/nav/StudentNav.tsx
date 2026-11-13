"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SignOutButton, SignOutForm } from "@/components/SignOutForm";
import { FOCUS, cx } from "@/components/ui/classes";
import { NavTab } from "@/components/ui/NavTab";
import { NavIcon } from "./NavIcon";
import { DESKTOP_BAR, Logo, MOBILE_BAR, TABS, UPLOAD_HREF, currentTabHref } from "./shared";
import type { SignOutAnswer } from "@/lib/requestPolicy";
import { WORKSPACE_NAV_BREAKPOINT } from "./workspaceBreakpoint";

export interface StudentNavProps {
  name: string | null;
  initials: string;
  email: string;
  countdownLabel: string | null;
  isTestDay: boolean;
  uploadNeeded: boolean;
  logOut: () => Promise<SignOutAnswer>;
}

const PRESS = "transition-[color,background-color,scale] duration-(--duration-fast) ease-(--ease-out-strong) motion-reduce:active:scale-100";

function UploadDot({ className }: { className?: string }) {
  return <span className={cx("inline-block size-2 shrink-0 rounded-pill bg-accent", className)} aria-hidden />;
}

const UploadNeeded = () => <span className="sr-only"> analytics upload needed</span>;

function AvatarMenu({ name, initials, email, logOut, compact }: Pick<StudentNavProps, "name" | "initials" | "email" | "logOut"> & { compact: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const item = cx("flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-small pointer-hover:bg-vellum", FOCUS);

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${email}`}
        onClick={() => {
          // The Account link is hidden until the menu opens, so its own prefetch starts too late for a quick tap to show its loading screen.
          if (!open) router.prefetch("/account");
          setOpen(!open);
        }}
        className={cx(
          "relative flex shrink-0 items-center justify-center rounded-pill bg-ink font-semibold text-chalk before:absolute before:content-[''] pointer-hover:bg-graphite-line active:scale-[0.96]",
          compact ? "size-8 text-caption before:-inset-1.5" : "size-10 text-small before:-inset-0.5",
          open && "ring-4 ring-vellum-line",
          PRESS,
          FOCUS,
        )}
      >
        {initials}
      </button>
      <div
        role="menu"
        aria-label="Account"
        hidden={!open}
        className="menu-pop absolute top-full right-0 z-50 mt-2 flex w-72 max-w-[calc(100vw-2.5rem)] origin-top-right flex-col gap-1 rounded-lg border border-vellum-line bg-paper p-2 whitespace-normal shadow-e3"
      >
        <div className={cx("flex gap-3 rounded-md bg-vellum p-3", name ? "items-start" : "items-center")}>
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-ink text-small font-semibold text-chalk">{initials}</span>
          <div className={cx("min-w-0", name && "pt-0.5")}>
            {name && <p className="line-clamp-2 text-small font-medium break-words text-ink">{name}</p>}
            <p className="text-caption [overflow-wrap:anywhere] text-smoke">{email}</p>
          </div>
        </div>
        <Link role="menuitem" href="/account" onClick={() => setOpen(false)} className={cx(item, "text-ink")}>
          <NavIcon name="account" className="size-4.5 text-smoke" />
          Account
        </Link>
        <SignOutForm action={logOut}>
          <SignOutButton role="menuitem" variant="bare" size="md" className={cx(item, "text-danger-ink")}>
            <NavIcon name="logout" className="size-4.5" />
            Log out
          </SignOutButton>
        </SignOutForm>
      </div>
    </div>
  );
}

function CountdownChip({ label, isTestDay, className }: { label: string; isTestDay: boolean; className?: string }) {
  return (
    <span className={cx("h-8 shrink-0 items-center gap-1.5 rounded-pill px-3 text-caption", isTestDay ? "bg-ink text-chalk" : "bg-vellum text-smoke", className)}>
      <NavIcon name="flag" className="size-3.5" />
      <span className={cx("font-medium", isTestDay ? "text-chalk" : "text-ink")}>{label}</span>
    </span>
  );
}

export default function StudentNav(props: StudentNavProps & { workspaceSwitcher?: ReactNode }) {
  const current = currentTabHref(usePathname());

  return (
    <>
      <div className={cx(MOBILE_BAR, props.workspaceSwitcher ? WORKSPACE_NAV_BREAKPOINT.mobileHeader : "md:hidden")}>
        <div className="flex min-w-0 items-center gap-1 sm:gap-3">
          <Logo href="/dashboard" form="mark" />
          {props.workspaceSwitcher && <span className="text-fog" aria-hidden data-workspace-separator="true">/</span>}
          {props.workspaceSwitcher}
        </div>
        <div data-page-fade className="flex items-center">
          <AvatarMenu {...props} compact />
        </div>
      </div>

      <div className={cx("hidden", props.workspaceSwitcher ? WORKSPACE_NAV_BREAKPOINT.desktopHeader : "md:block")}>
        <div className={DESKTOP_BAR}>
          <div className="flex min-w-0 items-center gap-8">
            <div className="flex items-center gap-3">
              <Logo href="/dashboard" />
              {props.workspaceSwitcher && <span className="text-fog" aria-hidden data-workspace-separator="true">/</span>}
              {props.workspaceSwitcher}
            </div>
            <nav data-page-fade aria-label="Primary" className="flex gap-1">
              {TABS.map((tab) => (
                <NavTab key={tab.href} href={tab.href} current={tab.href === current}>
                  <span className="lg:hidden">{tab.short}</span>
                  <span className="hidden lg:inline">{tab.label}</span>
                  {tab.href === UPLOAD_HREF && props.uploadNeeded && <><UploadDot /><UploadNeeded /></>}
                </NavTab>
              ))}
            </nav>
          </div>
          <div data-page-fade className="flex items-center justify-end gap-4 whitespace-nowrap">
            {props.countdownLabel && (
              <CountdownChip
                label={props.countdownLabel}
                isTestDay={props.isTestDay}
                className={cx("hidden", props.workspaceSwitcher ? "@[1040px]:flex" : "@[860px]:flex")}
              />
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
  const current = currentTabHref(usePathname());

  return (
    <nav
      aria-label="Primary"
      data-tab-bar
      data-page-fade
      data-workspace-tabs={withWorkspaceSwitcher || undefined}
      className={cx("fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] z-40 grid grid-cols-4 rounded-lg border border-vellum-line bg-paper p-1 shadow-e1", withWorkspaceSwitcher ? WORKSPACE_NAV_BREAKPOINT.mobileTabBar : "md:hidden")}
    >
      {TABS.map((tab) => {
        const active = tab.href === current;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-caption active:scale-[0.96]",
              active ? "bg-vellum font-medium text-ink" : "text-smoke",
              PRESS,
              FOCUS,
            )}
          >
            <span className="relative flex h-6 w-12 items-center justify-center">
              <NavIcon name={tab.icon} />
              {tab.href === UPLOAD_HREF && uploadNeeded && <UploadDot className="absolute top-0 right-2 ring-2 ring-paper" />}
            </span>
            {tab.short}
            {tab.href === UPLOAD_HREF && uploadNeeded && <UploadNeeded />}
          </Link>
        );
      })}
    </nav>
  );
}
