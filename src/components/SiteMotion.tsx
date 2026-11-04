"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { durationMs, fadeIn, fadeOut, isPlainClick, motionToken, reducedMotion, riseFrom, stopAtCurrentFrame } from "@/lib/motion";

const SIGN_IN = new Set(["/signup", "/login"]);
const IN_SCOPE = new Set(["/", ...SIGN_IN]);
export const movesBetween = (from: string, to: string) => (from === "/" && SIGN_IN.has(to)) || (SIGN_IN.has(from) && to === "/");

type Target = { path: string; fromHistory: boolean };

const regions = () => [...document.querySelectorAll<HTMLElement>("[data-page-fade]")];
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

export default function SiteMotion() {
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef<string | null>(null);
  const target = useRef<Target | null>(null);
  const leaving = useRef<HTMLElement[]>([]);
  const logoFrom = useRef<DOMRect | null>(null);
  const scrolls = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const from = shown.current;
    shown.current = pathname;
    if (!IN_SCOPE.has(pathname)) history.scrollRestoration = "auto";
    const arriving = target.current;
    if (from === pathname || !arriving) return;
    target.current = null;
    for (const el of leaving.current) {
      for (const animation of el.getAnimations()) animation.cancel();
      setBusy(el, false);
    }
    leaving.current = [];
    const redirected = arriving.path !== pathname;
    if (redirected) return;

    scrollTo({ top: arriving.fromHistory ? scrolls.current.get(pathname) ?? 0 : 0, behavior: "instant" });
    glideLogo(logoFrom.current);
    logoFrom.current = null;
    document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true });
    for (const el of regions()) fadeIn(el, riseFrom(rise()));
  }, [pathname]);

  useEffect(() => {
    let replaying = false;

    function comeBack() {
      target.current = null;
      for (const el of leaving.current) {
        setBusy(el, false);
        fadeIn(el, stopAtCurrentFrame(el));
      }
      leaving.current = [];
    }

    function leave(next: Target) {
      // The browser restores scroll before popstate, which would move the old page before it fades out. This entry and the pushed one take their spot from `scrolls`.
      history.scrollRestoration = "manual";
      target.current = next;
      const old = regions();
      leaving.current = old;
      if (old.some((el) => el.contains(document.activeElement))) document.querySelector("main")?.focus({ preventScroll: true });
      for (const el of old) setBusy(el, true);
      const exits = reducedMotion() ? [] : old.map((el) => fadeOut(el, { shorten: true }));
      return Promise.all(exits.map((exit) => exit.finished)).then(() => {
        if (target.current !== next) return false;
        logoFrom.current = visibleLogo()?.getBoundingClientRect() ?? null;
        return true;
      }, () => false);
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
      if (!shown.current || !movesBetween(shown.current, to)) return;
      event.preventDefault();
      scrolls.current.set(shown.current, scrollY);
      leave({ path: to, fromHistory: false }).then((ok) => ok && router.push(url.pathname + url.search + url.hash, { scroll: false }));
    }

    function holdPopStateUntilFadedOut(event: PopStateEvent) {
      if (replaying) return;
      if (target.current) comeBack();
      const to = location.pathname;
      if (!shown.current || !movesBetween(shown.current, to)) return;
      const left = leave({ path: to, fromHistory: true });
      if (reducedMotion()) return;
      event.stopImmediatePropagation();
      left.then((ok) => {
        if (!ok) return;
        replaying = true;
        dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
        replaying = false;
      });
    }

    function recordSettledScroll() {
      if (!target.current && shown.current) scrolls.current.set(shown.current, scrollY);
    }

    addEventListener("click", onClick, { capture: true });
    addEventListener("popstate", holdPopStateUntilFadedOut, { capture: true });
    addEventListener("scroll", recordSettledScroll, { passive: true });
    return () => {
      removeEventListener("click", onClick, { capture: true });
      removeEventListener("popstate", holdPopStateUntilFadedOut, { capture: true });
      removeEventListener("scroll", recordSettledScroll);
    };
  }, [router]);

  return null;
}
