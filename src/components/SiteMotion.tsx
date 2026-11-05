"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { durationMs, fadeIn, fadeOut, isPlainClick, motionToken, reducedMotion, riseFrom, stopAtCurrentFrame } from "@/lib/motion";

const SIGN_IN = new Set(["/signup", "/login", "/forgot-password", "/reset-password", "/verify-email"]);
const UNDER_TOP_BAR = new Set(["/", "/legal/terms", "/legal/privacy", "/legal/ai-disclosure"]);
const ONBOARDING = "/onboarding";

type Motion = "whole-page" | "under-top-bar" | "swap";
function motionBetween(from: string, to: string, signedIn: boolean): Motion | null {
  if (signedIn || from === to) return null;
  if (SIGN_IN.has(from) && SIGN_IN.has(to)) return "swap";
  if (UNDER_TOP_BAR.has(from) && UNDER_TOP_BAR.has(to)) return "under-top-bar";
  return (UNDER_TOP_BAR.has(from) && SIGN_IN.has(to)) || (SIGN_IN.has(from) && UNDER_TOP_BAR.has(to)) ? "whole-page" : null;
}

type Target = { path: string; hash: string; fromHistory: boolean; motion: Motion };

const SCROLL_KEY = "drillmap:scroll:";
function storedScroll(path: string) {
  try {
    const stored = sessionStorage.getItem(SCROLL_KEY + path);
    return stored === null ? undefined : Number(stored);
  } catch {
    return undefined;
  }
}
function storeScroll(path: string, top: number) {
  try {
    sessionStorage.setItem(SCROLL_KEY + path, String(top));
  } catch {}
}

function regions(motion: Motion) {
  const found = [...document.querySelectorAll<HTMLElement>(motion === "swap" ? "[data-page-swap]" : "[data-page-fade], [data-page-swap]")]
    .filter((el) => el.getClientRects().length && !el.closest("[data-page-copy]") && (motion !== "under-top-bar" || !el.closest("header")));
  return found.filter((el) => !found.some((outer) => outer !== el && outer.contains(el)));
}
const visibleLogo = () => [...document.querySelectorAll<HTMLElement>("[data-page-logo]")].find((logo) => logo.getBoundingClientRect().width > 0);
const rise = () => (matchMedia("(max-width: 390px)").matches ? 4 : 8);

function setBusy(el: HTMLElement, busy: boolean) {
  el.toggleAttribute("inert", busy);
  if (busy) el.setAttribute("aria-busy", "true");
  else el.removeAttribute("aria-busy");
}

function glideLogo(from: DOMRect | null) {
  const logo = visibleLogo();
  if (!from || !logo || reducedMotion()) return;
  for (const animation of logo.getAnimations()) animation.cancel();
  const to = logo.getBoundingClientRect();
  const x = from.left - to.left;
  const y = from.top - to.top;
  if (Math.abs(x) + Math.abs(y) < 0.5) return;
  logo.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: "none" }], {
    duration: durationMs("--duration-base"),
    easing: motionToken("--ease-standard"),
  });
}

function fadeAway(old: HTMLElement[]) {
  if (old.some((el) => el.contains(document.activeElement))) document.querySelector("main")?.focus({ preventScroll: true });
  for (const el of old) setBusy(el, true);
  const exits = reducedMotion() ? [] : old.map((el) => fadeOut(el, { shorten: true }));
  return Promise.all(exits.map((exit) => exit.finished)).then(() => true, () => false);
}

function arrive(motion: Motion) {
  document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true });
  for (const el of regions(motion)) fadeIn(el, riseFrom(rise()));
}

export function fadeFormThrough(update: () => void) {
  const old = regions("swap");
  const leavingPage = old.some((el) => el.hasAttribute("inert"));
  if (!old.length || leavingPage || !("animate" in Element.prototype)) return update();
  fadeAway(old).then((ok) => {
    if (!ok) return;
    for (const el of old) {
      for (const animation of el.getAnimations()) animation.cancel();
      setBusy(el, false);
    }
    flushSync(update);
    arrive("swap");
  });
}

// A server change (a form action's redirect, or a loading placeholder giving way) replaces a page before it can fade.
// So the page that goes stays on screen as a still copy until the next page's PageCue reports, then the copy fades out.
type CuePage = "sign-in" | "placeholder" | "onboarding" | "this-week";
const LEADS_TO: Record<CuePage, { pages: CuePage[]; paths: string[] }> = {
  "sign-in": { pages: ["placeholder", "onboarding"], paths: [ONBOARDING] },
  placeholder: { pages: ["onboarding"], paths: [ONBOARDING] },
  // Back, or the logo, sends a student who has not finished onboarding through This week and back to onboarding.
  onboarding: { pages: ["this-week", "placeholder", "onboarding"], paths: ["/dashboard", "/dashboard/upload", ONBOARDING] },
  "this-week": { pages: [], paths: [] },
};
const GIVE_UP_MS = 5000;

type Leaving = { page: CuePage; parts: { el: HTMLElement; rect: DOMRect; opacity: string }[]; logo: DOMRect | null };
type Copy = { from: CuePage; layer: HTMLElement; logo: DOMRect | null; giveUp: number };
type Arrival = { motion: Motion; pages: CuePage[]; ready: Promise<void>; logo: DOMRect | null; giveUp: number };

let leaving: Leaving | null = null;
let copy: Copy | null = null;
let arrival: Arrival | null = null;
const waiting = new Set<HTMLElement>();

function wait(el: HTMLElement) {
  waiting.add(el);
  setBusy(el, true);
  for (const animation of el.getAnimations()) animation.cancel();
  el.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 0, fill: "forwards" });
}

function stopWaiting() {
  for (const el of waiting) {
    setBusy(el, false);
    for (const animation of el.getAnimations()) animation.cancel();
  }
  waiting.clear();
}

function reveal(motion: Motion, logo: DOMRect | null) {
  for (const el of regions(motion)) {
    waiting.delete(el);
    setBusy(el, false);
    for (const animation of el.getAnimations()) animation.cancel();
    fadeIn(el, riseFrom(rise()));
  }
  stopWaiting();
  if (motion === "whole-page") glideLogo(logo);
  document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true });
}

function expectArrival(next: Omit<Arrival, "giveUp">) {
  clearTimeout(arrival?.giveUp);
  arrival = { ...next, giveUp: window.setTimeout(() => { arrival = null; stopWaiting(); }, GIVE_UP_MS) };
}

function pageLeft(page: CuePage, root: HTMLElement) {
  if (!LEADS_TO[page].pages.length || !("animate" in Element.prototype)) return;
  const els = page === "placeholder" ? [...root.querySelectorAll<HTMLElement>("[data-page-swap]")] : [root];
  if (els.some((el) => waiting.has(el) || el.closest("[inert]") || el.querySelector("[inert]"))) return;
  const logo = page === "placeholder" ? null : visibleLogo()?.getBoundingClientRect() ?? null;
  leaving = { page, logo, parts: els.map((el) => ({ el, rect: el.getBoundingClientRect(), opacity: getComputedStyle(el).opacity })) };
  queueMicrotask(keepLeavingPage);
}

function dropCopy() {
  if (!copy) return;
  clearTimeout(copy.giveUp);
  copy.layer.remove();
  copy = null;
  stopWaiting();
}

function keepLeavingPage() {
  const left = leaving;
  leaving = null;
  if (!left || left.parts.some(({ el }) => el.isConnected) || !document.querySelector("main")) return;
  if (left.page === "sign-in" && document.querySelector("[data-sign-in-page]")) return;
  dropCopy();
  const layer = document.createElement("div");
  layer.setAttribute("data-page-copy", "");
  layer.setAttribute("aria-hidden", "true");
  layer.setAttribute("aria-busy", "true");
  layer.inert = true;
  layer.style.cssText = "position: fixed; inset: 0; z-index: 50; pointer-events: none;";
  for (const { el, rect, opacity } of left.parts) {
    el.removeAttribute("data-sign-in-page");
    Object.assign(el.style, { position: "absolute", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, margin: "0", opacity });
    layer.append(el);
  }
  for (const logo of layer.querySelectorAll("[data-page-logo]")) {
    logo.removeAttribute("data-page-logo");
    logo.setAttribute("data-copy-logo", "");
  }
  document.body.append(layer);
  for (const el of regions(left.page === "placeholder" ? "swap" : "whole-page")) wait(el);
  copy = { from: left.page, layer, logo: left.logo, giveUp: window.setTimeout(dropCopy, GIVE_UP_MS) };
}

function fadeCopy({ layer, logo, giveUp }: Copy): Promise<void> {
  clearTimeout(giveUp);
  if (reducedMotion()) {
    layer.remove();
    return Promise.resolve();
  }
  for (const old of layer.querySelectorAll<HTMLElement>("[data-copy-logo]")) old.style.visibility = "hidden";
  const now = visibleLogo();
  if (logo && now) {
    const to = now.getBoundingClientRect();
    const at = { transform: `translate(${logo.left - to.left}px, ${logo.top - to.top}px)` };
    now.animate([at, at], { duration: 0, fill: "forwards" });
  }
  const exits = [...layer.children].map((el) => fadeOut(el as HTMLElement, { shorten: true }).finished);
  return Promise.all(exits).then(() => undefined, () => undefined).finally(() => layer.remove());
}

function dropCopyIfNoPageFollows(pathname: string) {
  keepLeavingPage();
  if (copy && !LEADS_TO[copy.from].paths.includes(pathname)) dropCopy();
}

function pageArrived(page: CuePage, root: HTMLElement) {
  keepLeavingPage();
  if (copy && !LEADS_TO[copy.from].pages.includes(page)) dropCopy();
  if (copy) {
    const held = copy;
    copy = null;
    expectArrival({ motion: held.from === "placeholder" ? "swap" : "whole-page", pages: LEADS_TO[held.from].pages, ready: fadeCopy(held), logo: held.logo });
  }
  const expected = arrival;
  if (!expected || !expected.pages.includes(page)) return;
  for (const el of regions(expected.motion)) wait(el);
  if (page === "placeholder") expectArrival({ ...expected, pages: LEADS_TO.placeholder.pages });
  else {
    clearTimeout(expected.giveUp);
    arrival = null;
  }
  expected.ready.then(() => {
    if (root.isConnected) reveal(expected.motion, expected.logo);
  });
}

export function PageCue({ page }: { page: CuePage }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const root = ref.current!.parentElement!;
    pageArrived(page, root);
    return () => pageLeft(page, root);
  }, [page]);
  return <span ref={ref} hidden />;
}

export default function SiteMotion({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef<string | null>(null);
  const target = useRef<Target | null>(null);
  const leaving = useRef<HTMLElement[]>([]);
  const logoFrom = useRef<DOMRect | null>(null);
  const scrolls = useRef(new Map<string, number>());
  const savedScroll = (path: string) => scrolls.current.get(path) ?? storedScroll(path);
  const saveScroll = (path: string, top: number) => {
    scrolls.current.set(path, top);
    storeScroll(path, top);
  };
  const heldAt = useRef<number | null>(null);

  useLayoutEffect(() => {
    const from = shown.current;
    shown.current = pathname;
    const arriving = target.current;
    if (from === pathname) return;
    if (from) dropCopyIfNoPageFollows(pathname);
    if (!arriving) {
      if (from && motionBetween(from, pathname, signedIn) === "swap") arrive("swap");
      return;
    }
    target.current = null;
    heldAt.current = null;
    for (const el of leaving.current) {
      for (const animation of el.getAnimations()) animation.cancel();
      setBusy(el, false);
    }
    leaving.current = [];
    const redirected = arriving.path !== pathname;
    if (redirected) return;

    const section = arriving.hash && document.getElementById(arriving.hash.slice(1));
    if (section) section.scrollIntoView({ behavior: "instant" });
    else scrollTo({ top: arriving.fromHistory ? savedScroll(pathname) ?? 0 : 0, behavior: "instant" });
    saveScroll(pathname, scrollY);
    glideLogo(logoFrom.current);
    logoFrom.current = null;
    arrive(arriving.motion);
  }, [pathname, signedIn]);

  useEffect(() => {
    let replaying = false;

    function comeBack() {
      target.current = null;
      heldAt.current = null;
      for (const el of leaving.current) {
        setBusy(el, false);
        fadeIn(el, stopAtCurrentFrame(el));
      }
      leaving.current = [];
    }

    function leave(next: Target) {
      target.current = next;
      const old = regions(next.motion);
      leaving.current = old;
      return fadeAway(old).then((ok) => {
        if (!ok || target.current !== next) return false;
        logoFrom.current = next.motion === "whole-page" ? visibleLogo()?.getBoundingClientRect() ?? null : null;
        return true;
      });
    }

    function onClick(event: MouseEvent) {
      if (!isPlainClick(event) || event.defaultPrevented) return;
      const link = (event.target as Element).closest("a");
      if (!link) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin) return;
      const to = url.pathname;
      if (target.current) {
        if (to === target.current.path) return event.preventDefault();
        if (to === shown.current && url.href === location.href) {
          event.preventDefault();
          return comeBack();
        }
        comeBack();
      }
      const motion = shown.current && motionBetween(shown.current, to, signedIn);
      if (!shown.current || !motion) return;
      event.preventDefault();
      saveScroll(shown.current, scrollY);
      leave({ path: to, hash: url.hash, fromHistory: false, motion }).then((ok) => ok && router.push(url.pathname + url.search + url.hash, { scroll: false }));
    }

    function holdPopStateUntilFadedOut(event: PopStateEvent) {
      if (replaying) return;
      if (target.current) comeBack();
      const to = location.pathname;
      const motion = shown.current && motionBetween(shown.current, to, signedIn);
      if (!shown.current || !motion) return;
      const from = shown.current;
      const left = leave({ path: to, hash: "", fromHistory: true, motion });
      // Next's router does not render a popstate for an entry it did not write, such as a hash the browser added.
      const routerEntry = Boolean(history.state?.__NA);
      if (reducedMotion() && routerEntry) return;
      event.stopImmediatePropagation();
      // Chrome restores the new entry's scroll after popstate; the old page keeps its spot until it has faded out.
      heldAt.current = savedScroll(from) ?? scrollY;
      left.then((ok) => {
        if (!ok) return;
        heldAt.current = null;
        if (!routerEntry) return router.replace(location.pathname + location.search + location.hash, { scroll: false });
        replaying = true;
        dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
        replaying = false;
      });
    }

    function onScroll() {
      const pin = heldAt.current;
      if (pin !== null && scrollY !== pin) scrollTo({ top: pin, behavior: "instant" });
      else if (!target.current && shown.current) saveScroll(shown.current, scrollY);
    }

    addEventListener("click", onClick, { capture: true });
    addEventListener("popstate", holdPopStateUntilFadedOut, { capture: true });
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      removeEventListener("click", onClick, { capture: true });
      removeEventListener("popstate", holdPopStateUntilFadedOut, { capture: true });
      removeEventListener("scroll", onScroll);
    };
  }, [router, signedIn]);

  return null;
}
