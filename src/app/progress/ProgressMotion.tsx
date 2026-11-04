"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { fadeIn, fadeOut, isPlainClick, reducedMotion, slideFrom, stopAtCurrentFrame } from "@/lib/motion";

const SLIDE = 8;
const DIMMED = 0.5;

type WeekOrList = string | null;

const hrefOf = (url: URL | Location) => url.pathname + url.search;
const hrefFor = (shown: WeekOrList) => (shown ? `/progress?week=${shown}` : "/progress");

function slideBetween(from: WeekOrList, to: WeekOrList) {
  return from && to ? (to < from ? -SLIDE : SLIDE) : 0;
}

const PageShown = createContext<(shown: WeekOrList, requested: string | null, page: HTMLElement) => void>(() => {});

// Next updates search params on Back before the page content changes, so each page reports when it is on screen.
// `requested` is the week the address asked for; an unknown week shows the list.
export function ProgressScreen({ week = null, requested = null, children }: { week?: string | null; requested?: string | null; children: ReactNode }) {
  const pageShown = useContext(PageShown);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => pageShown(week, requested, ref.current!));
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
    // Next keeps the old page on screen until a same-route navigation's page arrives, so it dims instead of fading out.
    if (reducedMotion()) fadeOut(el, { to: DIMMED });
    else return fadeOut(el, { to: DIMMED, x: slideBetween(from, to) });
  }

  function returnToCommitted() {
    target.current = null;
    const el = ref.current!;
    fadeIn(el, stopAtCurrentFrame(el));
  }

  const pageShown = useCallback((to: WeekOrList, requested: string | null, page: HTMLElement) => {
    const from = shown.current;
    shown.current = to;
    if (target.current !== null && target.current !== hrefFor(requested)) return;
    target.current = null;
    if (from === undefined) return;

    const el = ref.current!;
    // Back to an unknown-week bookmark dimmed a list that comes back unchanged.
    if (from === to) {
      if (el.getAnimations().some((animation) => animation.effect?.getTiming().fill === "forwards")) fadeIn(el, stopAtCurrentFrame(el));
      return;
    }
    for (const animation of el.getAnimations()) animation.cancel();
    if (to === null) {
      const saved = listScroll.current;
      scrollTo(0, saved ?? 0);
      page.querySelector<HTMLElement>(`a[href="${hrefFor(from)}"]`)?.focus({ preventScroll: saved !== null });
    } else {
      scrollTo(0, 0);
      page.querySelector("h1")?.focus({ preventScroll: true });
    }
    fadeIn(el, slideFrom(slideBetween(from, to), DIMMED));
  }, []);

  useLayoutEffect(() => function showFirstPageWithoutMotionWhenRemounted() {
    shown.current = undefined;
  }, []);

  useEffect(() => {
    let replaying = false;
    let latest = 0;
    // Another navigation, from history or a link outside Progress, replaces a pending click or held Back.
    function abandonPending() {
      latest++;
      if (target.current !== null) returnToCommitted();
    }
    function onClickOutside(event: globalThis.MouseEvent) {
      const element = event.target as Element;
      if (isPlainClick(event) && element.closest("a") && !ref.current!.contains(element)) abandonPending();
    }
    function holdPopStateUntilFadedOut(event: PopStateEvent) {
      if (replaying) return;
      if (location.pathname !== "/progress") return abandonPending();
      if (hrefOf(location) === committed()) return returnToCommitted();
      const to = new URLSearchParams(location.search).get("week");
      target.current = hrefFor(to);
      const exit = leave(to);
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
    document.addEventListener("click", onClickOutside, { capture: true });
    return () => {
      removeEventListener("popstate", holdPopStateUntilFadedOut, { capture: true });
      document.removeEventListener("click", onClickOutside, { capture: true });
    };
  }, []);

  function onClickCapture(event: MouseEvent) {
    if (!isPlainClick(event)) return;
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
    const week = url.searchParams.get("week");
    const destination = (target.current = hrefFor(week));
    const exit = leave(week);
    if (exit) exit.finished.then(() => target.current === destination && navigate(), () => {});
    else navigate();
  }

  return (
    <PageShown.Provider value={pageShown}>
      <div ref={ref} onClickCapture={onClickCapture}>{children}</div>
    </PageShown.Provider>
  );
}
