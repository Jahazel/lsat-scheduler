"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { FOCUS, FOCUS_INSET, cx } from "@/components/ui/classes";
import { reducedMotion } from "@/lib/motion";

export type SectionTitle = { id: string; title: string };

const WIDE = "(min-width: 1024px)";
const PANEL_MAX = "60dvh";
const PANEL_GAP_PX = 8;
const OWN_SCROLL = ["wheel", "touchmove", "keydown"] as const;
const TOUCH = "touch-manipulation select-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]";
const LINK = cx(TOUCH, "text-small text-smoke transition-colors duration-(--duration-fast) ease-[ease] motion-reduce:transition-none pointer-hover:text-ink active:text-ink aria-[current]:text-ink");

const readingLineWhereJumpsStop = (section: HTMLElement) => parseFloat(getComputedStyle(section).scrollMarginTop) + 1;

function sectionBeingRead(ids: string[]) {
  const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
  let current = ids[0];
  for (const id of ids) {
    const section = document.getElementById(id)!;
    const line = atEnd ? innerHeight : readingLineWhereJumpsStop(section);
    if (section.getBoundingClientRect().top <= line) current = id;
  }
  return current;
}

function useSectionBeingRead(ids: string[]) {
  const [state, setState] = useState({ active: ids[0], held: null as string | null });

  useEffect(() => {
    const opened = location.hash.slice(1);
    const read = () => setState((now) => (now.held ? now : { active: sectionBeingRead(ids), held: null }));
    const release = () => setState((now) => (now.held ? { active: now.held, held: null } : now));
    const arrive = () => setState(ids.includes(opened) ? { active: opened, held: opened } : { active: sectionBeingRead(ids), held: null });
    arrive();
    addEventListener("scroll", read, { passive: true });
    addEventListener("resize", read);
    for (const type of OWN_SCROLL) addEventListener(type, release, { passive: true });
    return () => {
      removeEventListener("scroll", read);
      removeEventListener("resize", read);
      for (const type of OWN_SCROLL) removeEventListener(type, release);
    };
  }, [ids]);

  const hold = (id: string) => setState({ active: id, held: id });
  return [state.active, hold] as const;
}

function roomAboveTabBar(bar: HTMLElement) {
  const tabBar = [...document.querySelectorAll("[data-tab-bar]")].find((el) => el.getClientRects().length);
  return (tabBar?.getBoundingClientRect().top ?? innerHeight) - PANEL_GAP_PX - bar.getBoundingClientRect().bottom;
}

function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = matchMedia(WIDE);
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return wide;
}

export function OnThisPage({ sections, children }: { sections: SectionTitle[]; children: ReactNode }) {
  const [ids] = useState(() => sections.map((section) => section.id));
  const [active, hold] = useSectionBeingRead(ids);
  const wide = useWide();
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const panel = useRef<HTMLOListElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggle.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!bar.current?.contains(event.target as Node)) setOpen(false);
    };
    addEventListener("keydown", onKey);
    addEventListener("pointerdown", onPointer);
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  useLayoutEffect(() => {
    const line = marker.current;
    const item = list.current?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!line || !item || !wide) {
      placed.current = false;
      return;
    }
    const instant = !placed.current;
    placed.current = true;
    if (instant) line.style.transition = "none";
    line.style.transform = `translateY(${item.offsetTop}px) scaleY(${item.offsetHeight})`;
    if (instant) {
      void line.offsetHeight;
      line.style.transition = "";
    }
  }, [active, wide]);

  function openPanel() {
    panel.current!.style.maxHeight = `min(${PANEL_MAX}, ${roomAboveTabBar(bar.current!)}px)`;
    setOpen(true);
  }

  function jumpTo(id: string) {
    const section = document.getElementById(id)!;
    setOpen(false);
    hold(id);
    section.scrollIntoView({ behavior: reducedMotion() ? "instant" : "smooth", block: "start" });
    history.replaceState(history.state, "", `#${id}`);
    section.querySelector("h2")?.focus({ preventScroll: true });
  }

  const link = (section: SectionTitle, className: string) => (
    <a
      href={`#${section.id}`}
      aria-current={section.id === active ? "location" : undefined}
      onClick={(event) => {
        event.preventDefault();
        jumpTo(section.id);
      }}
      className={className}
    >
      {section.title}
    </a>
  );

  return (
    <>
      <div ref={bar} className="sticky top-(--site-header) z-30 border-b border-vellum-line bg-paper px-6 lg:hidden">
        <button
          ref={toggle}
          type="button"
          aria-expanded={open}
          aria-controls="on-this-page-list"
          onClick={() => (open ? setOpen(false) : openPanel())}
          className={cx("mx-auto flex h-12 w-full max-w-2xl items-center gap-3 text-left active:opacity-70", TOUCH, FOCUS_INSET)}
        >
          <span className="shrink-0 font-mono text-label uppercase text-smoke">On this page</span>
          <span className="min-w-0 flex-1 truncate text-small font-medium text-ink">
            {sections.find((section) => section.id === active)?.title}
          </span>
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className={cx("size-4 shrink-0 text-smoke transition-transform duration-(--duration-base) ease-(--ease-out-strong) motion-reduce:transition-none", open && "rotate-180")}
          >
            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div
          id="on-this-page-list"
          data-open={open || undefined}
          className={cx(
            "absolute inset-x-0 top-full border-b border-vellum-line bg-paper shadow-e1",
            "transition-[opacity,translate,visibility] duration-(--duration-base) ease-(--ease-out-strong) motion-reduce:transition-none",
            "invisible -translate-y-1 opacity-0 data-open:visible data-open:translate-y-0 data-open:opacity-100",
          )}
        >
          <ol ref={panel} aria-label="On this page" className="mx-auto max-h-[60dvh] max-w-2xl overflow-y-auto overscroll-contain px-6 py-2 md:px-0">
            {sections.map((section) => (
              <li key={section.id}>{link(section, cx("flex min-h-11 items-center rounded-xs aria-[current]:font-medium", LINK, FOCUS))}</li>
            ))}
          </ol>
        </div>
      </div>
      <div className="px-6 pt-12 pb-16">
        <div className="mx-auto max-w-2xl lg:grid lg:max-w-[956px] lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-16">
          <nav aria-label="On this page" className="hidden lg:sticky lg:top-[calc(var(--site-header)+2rem)] lg:col-start-2 lg:row-start-1 lg:block lg:self-start">
            <p className="font-mono text-label uppercase text-smoke">On this page</p>
            <div className="relative mt-4">
              <span
                ref={marker}
                aria-hidden
                style={{ transform: "scaleY(0)" }}
                className="absolute top-0 left-0 z-10 h-px w-0.5 origin-top bg-ink transition-transform duration-(--duration-base) ease-(--ease-out-strong) motion-reduce:transition-none"
              />
              <ol ref={list} className="border-l border-vellum-line">
                {sections.map((section) => (
                  <li key={section.id}>{link(section, cx("block rounded-r-xs py-1.5 pl-4", LINK, FOCUS))}</li>
                ))}
              </ol>
            </div>
          </nav>
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">{children}</div>
        </div>
      </div>
    </>
  );
}
