"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, type MouseEvent, type ReactNode } from "react";

const FAST = 120;
const BASE = 200;
const SLIDE = 8;
const EXIT = "cubic-bezier(0.4, 0, 1, 1)";
const STANDARD = "cubic-bezier(0.2, 0, 0, 1)";

type WeekOrList = string | null;

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const hrefOf = (url: URL | Location) => url.pathname + url.search;
const hrefFor = (shown: WeekOrList) => (shown ? `/progress?week=${shown}` : "/progress");

function slideBetween(from: WeekOrList, to: WeekOrList) {
  return from && to ? (to < from ? -SLIDE : SLIDE) : 0;
}

function stopAtCurrentFrame(el: HTMLElement): Keyframe {
  const { opacity, transform } = getComputedStyle(el);
  for (const animation of el.getAnimations()) animation.cancel();
  return { opacity, transform };
}

function fadeOut(el: HTMLElement, x: number) {
  return el.animate([stopAtCurrentFrame(el), { opacity: 0, transform: `translateX(${-x}px)` }], { duration: FAST, easing: EXIT, fill: "forwards" });
}

function fadeIn(el: HTMLElement, x: number, from: Keyframe = { opacity: 0, transform: `translateX(${x}px)` }) {
  if (reducedMotion()) el.animate([{ opacity: from.opacity }, { opacity: 1 }], { duration: FAST, easing: "linear" });
  else el.animate([from, { opacity: 1, transform: "none" }], { duration: BASE, easing: STANDARD });
}

const PageShown = createContext<(shown: WeekOrList, page: HTMLElement) => void>(() => {});

// Next updates search params on Back before the page content changes, so each page reports when it is on screen.
export function ProgressScreen({ week = null, children }: { week?: string | null; children: ReactNode }) {
  const pageShown = useContext(PageShown);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => pageShown(week, ref.current!), [pageShown, week]);
  return <div ref={ref} className="min-h-screen">{children}</div>;
}

export default function ProgressMotion({ children }: { children: ReactNode }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const shown = useRef<WeekOrList | undefined>(undefined);
  const target = useRef<string | null>(null);
  const listScroll = useRef<number | null>(null);
  const committed = () => (shown.current === undefined ? null : hrefFor(shown.current));

  function leave(to: WeekOrList) {
    const el = ref.current!;
    const from = shown.current ?? null;
    if (from === null) listScroll.current = scrollY;
    if (!reducedMotion()) return fadeOut(el, slideBetween(from, to));
  }

  function returnToCommitted() {
    target.current = null;
    const el = ref.current!;
    fadeIn(el, 0, stopAtCurrentFrame(el));
  }

  const pageShown = useCallback((to: WeekOrList, page: HTMLElement) => {
    const from = shown.current;
    shown.current = to;
    target.current = null;
    if (from === undefined || from === to) return;

    const el = ref.current!;
    for (const animation of el.getAnimations()) animation.cancel();
    if (to === null) {
      const saved = listScroll.current;
      scrollTo(0, saved ?? 0);
      page.querySelector<HTMLElement>(`a[href="${hrefFor(from)}"]`)?.focus({ preventScroll: saved !== null });
    } else {
      scrollTo(0, 0);
      page.querySelector("h1")?.focus({ preventScroll: true });
    }
    fadeIn(el, slideBetween(from, to));
  }, []);

  useEffect(() => {
    let replaying = false;
    let latest = 0;
    function holdPopStateUntilFadedOut(event: PopStateEvent) {
      if (replaying || location.pathname !== "/progress") return;
      if (hrefOf(location) === committed()) return returnToCommitted();
      const exit = leave(new URLSearchParams(location.search).get("week"));
      if (!exit) return;
      event.stopImmediatePropagation();
      const mine = ++latest;
      exit.finished.then(() => {
        if (mine !== latest) return;
        replaying = true;
        dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
        replaying = false;
      }, () => {});
    }
    addEventListener("popstate", holdPopStateUntilFadedOut, { capture: true });
    return () => removeEventListener("popstate", holdPopStateUntilFadedOut, { capture: true });
  }, []);

  function onClickCapture(event: MouseEvent) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest("a");
    if (!link) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || url.pathname !== "/progress") return;
    event.preventDefault();
    const href = hrefOf(url);
    if (href === (target.current ?? committed())) return;
    const navigate = () => router.push(href, { scroll: false });
    if (href === committed()) {
      navigate();
      return returnToCommitted();
    }
    target.current = href;
    const exit = leave(url.searchParams.get("week"));
    if (exit) exit.finished.then(navigate, () => {});
    else navigate();
  }

  return (
    <PageShown.Provider value={pageShown}>
      <div ref={ref} onClickCapture={onClickCapture}>{children}</div>
    </PageShown.Provider>
  );
}
