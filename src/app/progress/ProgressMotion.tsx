"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { PLACEHOLDER_WAIT_MS, PageArrival, PagePlaceholder } from "@/components/PagePlaceholder";
import { isPlainClick, reducedMotion, slideFrom, stopAtCurrentFrame } from "@/lib/motion";
import { dim, handOff, showAgain } from "@/lib/pageMotion";
import { ListShapes, WeekShapes } from "./ProgressPlaceholder";

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
  return <div ref={ref} className="min-h-screen"><PageArrival page="Progress" />{children}</div>;
}

export default function ProgressMotion({ children }: { children: ReactNode }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const shown = useRef<WeekOrList | undefined>(undefined);
  const target = useRef<string | null>(null);
  const listScroll = useRef<number | null>(null);
  const pageArea = useRef<HTMLDivElement>(null);
  const placeholderTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scrollUnderPlaceholder = useRef(0);
  const [placeholder, setPlaceholder] = useState<"list" | "week" | null>(null);
  const committed = () => (shown.current === undefined ? null : hrefFor(shown.current));

  function leave(to: WeekOrList) {
    const el = pageArea.current!;
    const from = shown.current ?? null;
    if (from === null) listScroll.current = scrollY;
    // Next keeps the old page on screen until a same-route navigation's page arrives, so it dims instead of fading out.
    if (reducedMotion()) dim(el, { to: DIMMED });
    else return dim(el, { to: DIMMED, x: slideBetween(from, to) });
  }

  function showPlaceholderIfSlow(to: WeekOrList) {
    clearTimeout(placeholderTimer.current);
    placeholderTimer.current = setTimeout(() => {
      pageArea.current!.style.visibility = "hidden";
      scrollUnderPlaceholder.current = scrollY;
      scrollTo(0, 0);
      setPlaceholder(to === null ? "list" : "week");
    }, PLACEHOLDER_WAIT_MS);
  }

  const endPlaceholder = useCallback(() => {
    clearTimeout(placeholderTimer.current);
    const wasShown = pageArea.current!.style.visibility === "hidden";
    pageArea.current!.style.visibility = "";
    setPlaceholder(null);
    return wasShown;
  }, []);

  const returnToCommitted = useCallback(() => {
    target.current = null;
    if (endPlaceholder()) scrollTo(0, scrollUnderPlaceholder.current);
    const el = pageArea.current!;
    showAgain(el, stopAtCurrentFrame(el));
  }, [endPlaceholder]);

  const pageShown = useCallback((to: WeekOrList, requested: string | null, page: HTMLElement) => {
    const from = shown.current;
    shown.current = to;
    if (target.current !== null && target.current !== hrefFor(requested)) return;
    target.current = null;
    if (from === undefined) return;
    const tookOver = endPlaceholder();

    const el = pageArea.current!;
    // Back to an unknown-week bookmark dimmed a list that comes back unchanged.
    if (from === to) {
      if (tookOver) handOff(el, page);
      else if (el.getAnimations().some((animation) => animation.effect?.getTiming().fill === "forwards")) showAgain(el, stopAtCurrentFrame(el));
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
    if (tookOver) handOff(el, page);
    else showAgain(el, slideFrom(slideBetween(from, to), DIMMED));
  }, [endPlaceholder]);

  useLayoutEffect(() => function showFirstPageWithoutMotionWhenRemounted() {
    shown.current = undefined;
    clearTimeout(placeholderTimer.current);
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
      const link = element.closest("a");
      if (!isPlainClick(event) || !link || ref.current!.contains(element)) return;
      // Next scrolls a link's page to the top when it lands after another pending navigation.
      if (target.current !== null && link.href === new URL(committed()!, location.origin).href) {
        event.preventDefault();
        router.push(committed()!, { scroll: false });
      }
      abandonPending();
    }
    function holdPopStateUntilFadedOut(event: PopStateEvent) {
      if (replaying) return;
      if (location.pathname !== "/progress") return abandonPending();
      if (hrefOf(location) === committed()) return returnToCommitted();
      const to = new URLSearchParams(location.search).get("week");
      target.current = hrefFor(to);
      clearTimeout(placeholderTimer.current);
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
  }, [returnToCommitted, router]);

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
    clearTimeout(placeholderTimer.current);
    const destination = (target.current = hrefFor(week));
    const request = () => {
      navigate();
      showPlaceholderIfSlow(week);
    };
    const exit = leave(week);
    if (exit) exit.finished.then(() => target.current === destination && request(), () => {});
    else request();
  }

  return (
    <PageShown.Provider value={pageShown}>
      <div ref={ref} onClickCapture={onClickCapture} className="grid grid-cols-1">
        <div ref={pageArea} className="[grid-area:1/1]" style={placeholder ? { visibility: "hidden" } : undefined}>{children}</div>
        {placeholder && (
          <div className="[grid-area:1/1]">
            <PagePlaceholder wait={0}>{placeholder === "week" ? <WeekShapes /> : <ListShapes />}</PagePlaceholder>
          </div>
        )}
      </div>
    </PageShown.Provider>
  );
}
