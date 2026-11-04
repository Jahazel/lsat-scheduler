"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { durationMs, fadeIn, fadeOut, isPlainClick, motionToken, reducedMotion, riseFrom, stopAtCurrentFrame } from "@/lib/motion";

const SIGN_IN = new Set(["/signup", "/login", "/forgot-password", "/reset-password", "/verify-email"]);

type Motion = "page" | "form";
function motionBetween(from: string, to: string): Motion | null {
  if (SIGN_IN.has(from) && SIGN_IN.has(to)) return from === to ? null : "form";
  return (from === "/" && SIGN_IN.has(to)) || (SIGN_IN.has(from) && to === "/") ? "page" : null;
}

type Target = { path: string; fromHistory: boolean; motion: Motion };

function regions(motion: Motion) {
  const found = [...document.querySelectorAll<HTMLElement>(motion === "page" ? "[data-page-fade], [data-page-swap]" : "[data-page-swap]")];
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
  const old = regions("form");
  const leavingPage = old.some((el) => el.hasAttribute("inert"));
  if (!old.length || leavingPage || !("animate" in Element.prototype)) return update();
  fadeAway(old).then((ok) => {
    if (!ok) return;
    for (const el of old) {
      for (const animation of el.getAnimations()) animation.cancel();
      setBusy(el, false);
    }
    flushSync(update);
    arrive("form");
  });
}

export default function SiteMotion() {
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef<string | null>(null);
  const target = useRef<Target | null>(null);
  const leaving = useRef<HTMLElement[]>([]);
  const logoFrom = useRef<DOMRect | null>(null);
  const scrolls = useRef(new Map<string, number>());
  const heldAt = useRef<number | null>(null);

  useLayoutEffect(() => {
    const from = shown.current;
    shown.current = pathname;
    const arriving = target.current;
    if (from === pathname) return;
    if (!arriving) {
      if (from && motionBetween(from, pathname) === "form") arrive("form");
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

    const top = arriving.fromHistory ? scrolls.current.get(pathname) ?? 0 : 0;
    scrollTo({ top, behavior: "instant" });
    scrolls.current.set(pathname, top);
    glideLogo(logoFrom.current);
    logoFrom.current = null;
    arrive(arriving.motion);
  }, [pathname]);

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
        logoFrom.current = next.motion === "page" ? visibleLogo()?.getBoundingClientRect() ?? null : null;
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
      const motion = shown.current && motionBetween(shown.current, to);
      if (!shown.current || !motion) return;
      event.preventDefault();
      scrolls.current.set(shown.current, scrollY);
      leave({ path: to, fromHistory: false, motion }).then((ok) => ok && router.push(url.pathname + url.search + url.hash, { scroll: false }));
    }

    function holdPopStateUntilFadedOut(event: PopStateEvent) {
      if (replaying) return;
      if (target.current) comeBack();
      const to = location.pathname;
      const motion = shown.current && motionBetween(shown.current, to);
      if (!shown.current || !motion) return;
      const from = shown.current;
      const left = leave({ path: to, fromHistory: true, motion });
      if (reducedMotion()) return;
      event.stopImmediatePropagation();
      // Chrome restores the new entry's scroll after popstate; the old page keeps its spot until it has faded out.
      heldAt.current = scrolls.current.get(from) ?? scrollY;
      left.then((ok) => {
        if (!ok) return;
        heldAt.current = null;
        replaying = true;
        dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
        replaying = false;
      });
    }

    function onScroll() {
      const pin = heldAt.current;
      if (pin !== null && scrollY !== pin) scrollTo({ top: pin, behavior: "instant" });
      else if (!target.current && shown.current) scrolls.current.set(shown.current, scrollY);
    }

    addEventListener("click", onClick, { capture: true });
    addEventListener("popstate", holdPopStateUntilFadedOut, { capture: true });
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      removeEventListener("click", onClick, { capture: true });
      removeEventListener("popstate", holdPopStateUntilFadedOut, { capture: true });
      removeEventListener("scroll", onScroll);
    };
  }, [router]);

  return null;
}
