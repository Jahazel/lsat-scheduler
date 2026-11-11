"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";
import { durationMs, isPlainClick, motionToken, reducedMotion } from "@/lib/motion";
import { arrive, fadeAway, letGo, regions, type Motion } from "@/lib/pageMotion";
import type { ScreenPage } from "../view";

// SiteMotion picks page motion from real paths, and every prototype screen shares one path.
// So the prototype maps the real links onto its own screens and plays the same motion from the same helpers.
const SCREENS: Record<string, ScreenPage> = { "/": "landing", "/login": "login", "/signup": "signup" };

function motionBetween(from: ScreenPage, to: ScreenPage): Motion | null {
  if (from === to) return null;
  return from === "landing" || to === "landing" ? "whole-page" : "swap";
}

type Pending = { motion: Motion; hash: string; logo: DOMRect | null; left: HTMLElement[] };
let pending: Pending | null = null;

const visibleLogo = () => [...document.querySelectorAll<HTMLElement>("[data-page-logo]")].find((logo) => logo.getBoundingClientRect().width > 0);

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

export function ProtoLinks({ page, query }: { page: ScreenPage; query: string }) {
  const router = useRouter();

  useLayoutEffect(() => {
    window.parent.postMessage({ type: "page", page }, location.origin);
    const arriving = pending;
    pending = null;
    if (!arriving) return;
    for (const el of arriving.left) {
      for (const animation of el.getAnimations()) animation.cancel();
      letGo(el);
    }
    const section = arriving.hash && document.getElementById(arriving.hash.slice(1));
    if (section) section.scrollIntoView({ behavior: "instant" });
    else scrollTo({ top: 0, behavior: "instant" });
    glideLogo(arriving.logo);
    arrive(arriving.motion);
  }, [page]);

  useEffect(() => {
    const target = (href: string) => {
      const url = new URL(href, location.href);
      const to = url.origin === location.origin ? SCREENS[url.pathname] : undefined;
      return to ? { to, href: `?${new URLSearchParams({ page: to, rm: new URLSearchParams(query).get("rm") ?? "0" })}${url.hash}` } : null;
    };
    const mark = () => {
      for (const link of document.querySelectorAll<HTMLAnchorElement>("a[href]")) {
        const real = link.dataset.protoReal ?? link.getAttribute("href")!;
        const mapped = target(real);
        if (!mapped) continue;
        link.dataset.protoReal = real;
        const hash = new URL(real, location.href).hash;
        const href = mapped.to !== page ? mapped.href : hash || location.search;
        if (link.getAttribute("href") !== href) link.setAttribute("href", href);
      }
    };
    function onClick(event: MouseEvent) {
      const link = isPlainClick(event) && (event.target as Element).closest<HTMLAnchorElement>("a[data-proto-real]");
      if (!link) return;
      const mapped = target(link.dataset.protoReal!)!;
      event.preventDefault();
      const motion = motionBetween(page, mapped.to);
      if (!motion) {
        const hash = new URL(link.dataset.protoReal!, location.href).hash;
        history.pushState(history.state, "", hash || location.pathname + location.search);
        if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
        else scrollTo({ top: 0 });
        return;
      }
      const left = regions(motion);
      const logo = motion === "whole-page" ? visibleLogo()?.getBoundingClientRect() ?? null : null;
      fadeAway(left, "leave").then((ok) => {
        if (!ok) return;
        pending = { motion, hash: new URL(link.href).hash, logo, left };
        router.push(mapped.href, { scroll: false });
      });
    }
    mark();
    const watcher = new MutationObserver(mark);
    watcher.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["href"] });
    document.addEventListener("click", onClick, { capture: true });
    return () => {
      watcher.disconnect();
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, [page, query, router]);

  return null;
}
