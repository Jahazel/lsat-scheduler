"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { cx } from "@/components/ui/classes";
import { TABS, currentTabHref } from "@/components/nav/shared";
import type { Page, View } from "../view";
import { initials, type Admin } from "./data";
import type { RealPages } from "./walk/RealPages";

export type FrameProps = { view: View; admin: Admin; page: Page; go: (page: Page) => void; backToAdmin: () => void; content: ReactNode;
  walk: { label: ReactNode; name: string; toggle: () => void; expanded: boolean; wrap: (control: ReactNode) => ReactNode } | null;
  walkTrigger: RefObject<HTMLButtonElement | null>;
  pages: RealPages };

export const PRESS = "transition-[color,background-color,scale] duration-(--duration-fast) ease-(--ease-out-strong) active:scale-[0.97] motion-reduce:active:scale-100";
export const COLUMN = "mx-auto w-full max-w-[1120px] px-5 md:px-6 lg:px-10";

export function useDismiss(open: boolean, close: () => void): RefObject<HTMLDivElement | null> {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    // A click in a frame, such as the real student page or the toolbar around the screen, sends no pointerdown here.
    // The screen loses focus instead.
    addEventListener("pointerdown", onDown);
    addEventListener("keydown", onKey);
    addEventListener("blur", close);
    return () => { removeEventListener("pointerdown", onDown); removeEventListener("keydown", onKey); removeEventListener("blur", close); };
  }, [open, close]);
  return root;
}

export function AvatarMenu({ admin, compact, items }: { admin: Admin; compact: boolean; items?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useDismiss(open, () => setOpen(false));
  return (
    <div ref={root} className="relative">
      <button type="button" aria-label={`Account menu for ${admin.email}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={cx("relative flex shrink-0 items-center justify-center rounded-pill bg-ink font-semibold text-chalk pointer-hover:hover:bg-accent", PRESS,
          compact ? "size-8 text-caption before:absolute before:-inset-1.5 before:content-['']" : "size-10 text-small", open && "ring-4 ring-vellum-line")}>
        {initials(admin)}
      </button>
      {open && (
        <div role="menu" className={cx("menu-pop absolute z-50 flex w-72 max-w-[calc(100vw-2.5rem)] flex-col", "top-full right-0 mt-2 origin-top-right", "gap-1 rounded-lg border border-vellum-line bg-paper p-2 whitespace-normal shadow-e3")}>
          <div className={cx("flex gap-3 rounded-md bg-vellum p-3", admin.name ? "items-start" : "items-center")}>
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-ink text-small font-semibold text-chalk">{initials(admin)}</span>
            <div className={cx("min-w-0", admin.name && "pt-0.5")}>
              {admin.name && <p className="line-clamp-2 text-small font-medium break-words text-ink">{admin.name}</p>}
              <p className="text-caption [overflow-wrap:anywhere] text-smoke">{admin.email}</p>
            </div>
          </div>
          {items}
          <button role="menuitem" type="button" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-small text-ink pointer-hover:hover:bg-vellum">Account</button>
          <button role="menuitem" type="button" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-small text-danger-ink pointer-hover:hover:bg-vellum">Log out</button>
        </div>
      )}
    </div>
  );
}

export function studentTabsFor(pages: RealPages) {
  if (!pages.path || pages.path.startsWith("/onboarding")) return null;
  const current = currentTabHref(pages.path);
  return TABS.map((t) => ({ ...t, current: t.href === current, open: () => pages.load(t.href) }));
}

export function StudentPhoneTabs({ pages }: { pages: RealPages }) {
  const tabs = studentTabsFor(pages);
  if (!tabs) return null;
  return (
    <nav aria-label="Student pages" className="fixed right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 z-40 grid grid-cols-4 rounded-lg border border-vellum-line bg-paper p-1 shadow-e1 md:hidden">
      {tabs.map((t) => (
        <button key={t.href} type="button" aria-current={t.current ? "page" : undefined} onClick={t.open}
          className={cx("flex min-h-14 items-center justify-center rounded-md text-caption", PRESS, t.current ? "bg-vellum font-medium text-ink" : "text-smoke")}>{t.short}</button>
      ))}
    </nav>
  );
}

export const adminTab = (page: Page): Page => (page === "detail" ? "students" : page);
