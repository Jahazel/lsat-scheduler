"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Logo } from "@/components/nav/shared";
import { cx } from "@/components/ui/classes";
import { TODAYS, type Today, type View } from "../view";
import { DAY_KEYS, DAY_NAMES, countdown, initials, noteText, type Week } from "./data";
import type { Surface } from "./content";
import { Icon, type IconName } from "./icons";
import { NavGlyph, type IconSet, type NavName } from "./navIcons";

export type FrameProps = { view: View; week: Week; page: string; go: (page: string) => void; setDate?: (today: Today) => void; content: (surface: Surface) => ReactNode };

type Item = { page: string; label: string; short: string; icon: IconName };
const ITEMS: Item[] = [
  { page: "thisweek", label: "This week", short: "This week", icon: "week" },
  { page: "upload", label: "Weekly upload", short: "Upload", icon: "upload" },
  { page: "progress", label: "Progress", short: "Progress", icon: "progress" },
  { page: "settings", label: "Study settings", short: "Settings", icon: "settings" },
];

const uploadDue = (view: View) => view.week === "upload";

function Dot({ className }: { className?: string }) {
  return (
    <>
      <span aria-hidden className={cx("size-2 shrink-0 rounded-pill bg-accent", className)} />
      <span className="sr-only"> analytics upload needed</span>
    </>
  );
}

function Avatar({ week, size = "size-8" }: { week: Week; size?: string }) {
  return <span aria-hidden className={cx("flex shrink-0 items-center justify-center rounded-pill bg-ink text-caption font-semibold text-chalk", size)}>{initials(week.student)}</span>;
}

export function PlanNoteCard({ view, go, shape = "row" }: { view: View; go: (page: string) => void; shape?: "row" | "stack" }) {
  const note = noteText(view);
  if (!note) return null;
  const target = view.note === "lapsed" ? "plan" : "card";
  return (
    <div className={cx("flex gap-3 rounded-lg border border-vellum-line bg-paper p-4 shadow-control", shape === "stack" ? "flex-col" : "flex-wrap items-center justify-between")}>
      <div className="flex min-w-0 gap-3">
        <span className={cx("flex size-8 shrink-0 items-center justify-center rounded-md", view.note === "ending" ? "bg-vellum text-smoke" : "bg-warning-wash text-warning-ink")}>
          <Icon name={view.note === "ending" ? "calendar" : "card"} className="size-4.5" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-small font-medium text-ink">{note.lead}</p>
          <p className="text-caption text-smoke">{note.rest}</p>
        </div>
      </div>
      {note.action && (
        <button type="button" onClick={() => go(target)} className={cx("h-9 shrink-0 rounded-pill bg-ink px-4 text-small font-medium text-chalk select-none transition-[background-color,scale] duration-(--duration-fast) ease-(--ease-out-strong) pointer-hover:bg-graphite-line active:scale-[0.97] motion-reduce:active:scale-100", shape === "row" && "ml-11 sm:ml-0")}>{note.action}</button>
      )}
    </div>
  );
}

const DATES: Record<Today, string> = { mon: "Nov 9", tue: "Nov 10", wed: "Nov 11", thu: "Nov 12", fri: "Nov 13", sat: "Nov 14", sun: "Nov 15" };

/* The live Admin group's simulated date. Change opens the week's seven dates; picking one shows This week for that date. */
function AdminDate({ className, today, setDate }: { className?: string; today: Today; setDate?: (today: Today) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    addEventListener("pointerdown", onDown);
    addEventListener("keydown", onKey);
    return () => { removeEventListener("pointerdown", onDown); removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div ref={root} className={cx("relative w-fit", className)}>
      <span className="flex items-center rounded-pill border border-dashed border-vellum-line py-1 pl-3 text-caption text-smoke">
        Admin date:&nbsp;<span className="font-medium text-ink">{TODAYS[today]}, {DATES[today]}</span>&nbsp;·
        <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
          className="-my-1 min-h-8 rounded-pill pr-3 pl-1 font-medium text-accent">Change</button>
      </span>
      {open && (
        <div role="menu" aria-label="Simulated date" className="menu-pop absolute top-full left-0 z-50 mt-2 flex w-60 origin-top-left flex-col gap-0.5 rounded-lg border border-vellum-line bg-paper p-2 shadow-e3">
          {DAY_KEYS.map((key) => (
            <button key={key} role="menuitemradio" aria-checked={key === today} type="button" onClick={() => { setOpen(false); setDate?.(key); }}
              className="flex min-h-10 items-center justify-between rounded-md px-3 py-2 text-left text-small text-ink select-none pointer-hover:hover:bg-vellum aria-checked:font-medium">
              {DAY_NAMES[key]}, {DATES[key]}{key === today && <Icon name="check" className="size-4 text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const ADMIN_ITEM: Item = { page: "admin", label: "Admin", short: "Admin", icon: "admin" };
function CountChip({ week, className, onGrey = false }: { week: Week; className?: string; onGrey?: boolean }) {
  const testDay = week.student.daysAway === 0;
  if (countdown(week) === null) return null;
  return (
    <span className={cx("flex h-8 shrink-0 items-center gap-1.5 rounded-pill px-3 text-caption", testDay ? "bg-ink text-chalk" : onGrey ? "border border-vellum-line bg-paper text-smoke" : "bg-vellum text-smoke", className)}>
      <Icon name="flag" className="size-3.5" />
      <span className={cx("font-medium", testDay ? "text-chalk" : "text-ink")}>{countdown(week)}</span>
    </span>
  );
}

/* Round 3: today's top bar, kept as the base. Copied from src/components/nav/StudentNav.tsx, then improved step by step. */
const CURRENT_TABS: Item[] = [ITEMS[0]!, ITEMS[2]!, ITEMS[3]!];
type Level = "current" | "polished" | "upload-tab";

function CurrentMenu({ week, go, level, compact }: { week: Week; go: (page: string) => void; level: Level; compact: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    addEventListener("pointerdown", onDown);
    addEventListener("keydown", onKey);
    return () => { removeEventListener("pointerdown", onDown); removeEventListener("keydown", onKey); };
  }, [open]);
  const pick = (page: string) => { setOpen(false); go(page); };
  const polished = level !== "current";
  return (
    <div ref={root} className="relative">
      <button type="button" aria-label="Account menu" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={cx("flex shrink-0 items-center justify-center rounded-pill font-medium transition-[background-color,scale] duration-(--duration-fast) ease-(--ease-out-strong) motion-reduce:active:scale-100",
          compact ? "relative size-8 text-caption before:absolute before:-inset-1.5 before:content-['']" : "size-10 text-small",
          polished ? cx("bg-ink text-chalk pointer-hover:bg-graphite-line active:scale-[0.96]", open && "ring-4 ring-vellum-line") : "bg-vellum text-ink pointer-hover:bg-vellum-line")}>
        {initials(week.student)}
      </button>
      {open && !polished && (
        <div role="menu" className="absolute top-full right-0 z-50 mt-1 w-60 rounded-xs border border-vellum-line bg-paper py-1 shadow-e3">
          <p className="truncate border-b border-vellum-line px-4 py-2.5 text-caption text-smoke">{week.student.email}</p>
          <button role="menuitem" type="button" onClick={() => pick("account")} className="block w-full px-4 py-2.5 text-left text-small text-ink pointer-hover:bg-vellum">Account</button>
          <button role="menuitem" type="button" onClick={() => pick("login")} className="block w-full px-4 py-2.5 text-left text-small text-ink pointer-hover:bg-vellum">Log out</button>
        </div>
      )}
      {open && polished && (
        <div role="menu" className="menu-pop absolute top-full right-0 z-50 mt-2 flex w-72 origin-top-right flex-col whitespace-normal gap-1 rounded-lg border border-vellum-line bg-paper p-2 shadow-e3">
          <div className={cx("flex gap-3 rounded-md bg-vellum p-3", week.student.fullName ? "items-start" : "items-center")}>
            <Avatar week={week} size="size-10" />
            <div className={cx("min-w-0", week.student.fullName && "pt-0.5")}>
              {week.student.fullName && <p className="line-clamp-2 text-small font-medium break-words text-ink">{week.student.fullName}</p>}
              <p className="text-caption [overflow-wrap:anywhere] text-smoke">{week.student.email}</p>
            </div>
          </div>
          <button role="menuitem" type="button" onClick={() => pick("account")} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-small text-ink pointer-hover:bg-vellum"><Icon name="account" className="size-4.5 text-smoke" />Account</button>
          <button role="menuitem" type="button" onClick={() => pick("login")} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-small text-danger-ink pointer-hover:bg-vellum"><Icon name="logout" className="size-4.5" />Log out</button>
        </div>
      )}
    </div>
  );
}

function CurrentPhoneTabs({ view, page, go, level, icons }: { view: View; page: string; go: (page: string) => void; level: Level; icons: IconSet }) {
  const items = level === "upload-tab" ? ITEMS : CURRENT_TABS;
  const polished = level !== "current";
  return (
    <nav data-tab-bar aria-label="Pages" className={cx("fixed right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 z-40 grid rounded-md border border-vellum-line bg-paper shadow-e1 md:hidden", items.length === 4 ? "grid-cols-4" : "grid-cols-3", polished && "rounded-lg p-1")}>
      {items.map((item) => {
        const on = page === item.page;
        const dot = uploadDue(view) && (item.page === "upload" || (level !== "upload-tab" && item.page === "thisweek"));
        return (
          <button key={item.page} type="button" aria-current={on ? "page" : undefined} onClick={() => go(item.page)}
            className={cx("flex flex-col items-center justify-center gap-1 text-caption", polished ? cx("min-h-14 rounded-md transition-[background-color,scale] duration-(--duration-fast) ease-(--ease-out-strong) active:scale-[0.96] motion-reduce:active:scale-100", on ? "bg-vellum font-medium text-ink" : "text-smoke") : cx("min-h-16", on ? "font-semibold text-ink" : "text-smoke"))}>
            <span className="relative flex h-6 w-12 items-center justify-center">
              <NavGlyph set={icons} name={item.icon as NavName} on={on} className="size-5" />
              {dot && <Dot className={cx("absolute top-0 right-2 ring-2 ring-paper", !polished && "bg-ink")} />}
            </span>
            {item.short}
          </button>
        );
      })}
    </nav>
  );
}

function CurrentBar({ view, week, page, go, setDate, content, level, icons = "line" }: FrameProps & { level: Level; icons?: IconSet }) {
  const polished = level !== "current";
  const tabs = level === "upload-tab" ? ITEMS : CURRENT_TABS;
  const current = [...ITEMS, ADMIN_ITEM].find((t) => t.page === page);
  return (
    <div className="min-h-dvh bg-vellum">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-vellum-line bg-paper px-5 md:hidden">
        <Logo href="#" form="mark" />
        <div className="flex min-w-0 items-center gap-3">
          {!polished && current && <span className="hidden rounded-pill bg-vellum px-3 py-[5px] text-small whitespace-nowrap text-ink min-[360px]:inline">{current.short}</span>}
          <CurrentMenu week={week} go={go} level={level} compact />
        </div>
      </header>
      <div className="md:hidden">
        <main className="flex flex-col gap-4 px-4 pt-5 pb-28">
          {view.admin && <AdminDate today={view.today} setDate={setDate} />}
          <PlanNoteCard view={view} go={go} />
          {content("grey")}
        </main>
      </div>
      <CurrentPhoneTabs view={view} page={page} go={go} level={level} icons={icons} />
      <div className="hidden md:block">
        <header className={cx("sticky top-0 z-40 border-b border-vellum-line", polished ? "bg-paper/90 backdrop-blur-md" : "bg-paper")}>
          <div className={cx("@container flex h-18 items-center justify-between gap-6", polished ? "mx-auto max-w-[1120px] px-6 lg:px-10" : "px-18")}>
            <div className="flex min-w-0 items-center gap-8">
              <Logo href="#" />
              <nav aria-label="Pages" className="flex gap-1">
                {tabs.map((item) => {
                  const on = page === item.page;
                  const dot = uploadDue(view) && (item.page === "upload" || (level !== "upload-tab" && item.page === "thisweek"));
                  return (
                    <button key={item.page} type="button" aria-current={on ? "page" : undefined} data-on={on || undefined} onClick={() => go(item.page)}
                      className={cx("flex h-10 items-center gap-2 rounded-pill px-4 whitespace-nowrap text-ink pointer-hover:bg-vellum data-on:bg-vellum data-on:font-medium",
                        polished ? "text-small text-smoke transition-[color,background-color,scale] duration-(--duration-fast) ease-(--ease-out-strong) pointer-hover:text-ink active:scale-[0.97] motion-reduce:active:scale-100 data-on:text-ink" : "text-body transition-colors duration-(--duration-fast)")}>
                      {level === "upload-tab" && icons !== "none" && (icons !== "current-only" || on) && <NavGlyph set={icons} name={item.icon as NavName} on={on} className={icons === "line" ? "size-4.5" : "size-4"} />}
                      {level === "upload-tab" ? <><span className="lg:hidden">{item.short}</span><span className="hidden lg:inline">{item.label}</span></> : item.label}
                      {dot && <Dot className={polished ? undefined : "bg-ink"} />}
                    </button>
                  );
                })}
                {view.admin && (
                  <button type="button" data-on={page === "admin" || undefined} onClick={() => go("admin")}
                    className={cx("flex h-10 items-center rounded-pill px-4 text-ink pointer-hover:bg-vellum data-on:bg-vellum data-on:font-medium", polished ? "text-small text-smoke data-on:text-ink" : "text-body")}>Admin</button>
                )}
              </nav>
            </div>
            <div className="flex items-center justify-end gap-4 whitespace-nowrap">
              {polished
                ? <CountChip week={week} className="hidden @[860px]:flex" />
                : <span className="hidden text-body text-smoke tabular-nums @[900px]:inline">{countdown(week)}</span>}
              <CurrentMenu week={week} go={go} level={level} compact={false} />
            </div>
          </div>
        </header>
        <main className="mx-auto flex max-w-[1120px] flex-col gap-6 px-6 pt-8 pb-12 lg:px-10 lg:pt-10">
          {view.admin && <AdminDate today={view.today} setDate={setDate} />}
          <PlanNoteCard view={view} go={go} />
          {content("grey")}
        </main>
      </div>
    </div>
  );
}

// Section 1 pick (2026-11-12): today's top bar, polished, with Weekly upload as its own tab and words only.
const PickedBar = (p: FrameProps) => <CurrentBar {...p} level="upload-tab" icons="none" />;
export const FRAMES = [{ name: "Top bar · words only", Frame: PickedBar }];
