"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { durationMs, motionToken, reducedMotion } from "@/lib/motion";

export const PLACEHOLDER_WAIT_MS = 150;
const STAGGER_MS = 40;

function fadeOutRemovedPlaceholder(placeholder: HTMLElement, at: DOMRect, opacity: string) {
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.inert = true;
  layer.style.cssText = `position: fixed; left: ${at.left}px; top: ${at.top}px; width: ${at.width}px; height: ${at.height}px; z-index: 30; pointer-events: none;`;
  placeholder.style.animationName = "none";
  layer.append(placeholder);
  document.body.append(layer);
  placeholder.animate([{ opacity }, { opacity: 0 }], {
    duration: durationMs("--duration-fast"),
    easing: motionToken("--ease-standard"),
    fill: "forwards",
  }).finished.then(() => layer.remove(), () => layer.remove());
}

export function PagePlaceholder({ wait = PLACEHOLDER_WAIT_MS, children }: { wait?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const placeholder = ref.current!;
    const mountedAt = Date.now();
    return () => {
      if (Date.now() - mountedAt < wait) return;
      const at = placeholder.getBoundingClientRect();
      const opacity = getComputedStyle(placeholder).opacity;
      queueMicrotask(() => {
        if (!placeholder.isConnected) fadeOutRemovedPlaceholder(placeholder, at, opacity);
      });
    };
  }, [wait]);
  // React does not hydrate a loading fallback streamed into a reload, so CSS runs the wait and the fade-in.
  return (
    <div
      ref={ref}
      aria-hidden
      className="relative min-h-screen overflow-hidden"
      style={{
        animationName: "page-placeholder-in",
        animationDuration: "var(--duration-base)",
        animationTimingFunction: "var(--ease-standard)",
        animationDelay: `${wait}ms`,
        animationFillMode: "backwards",
      }}
    >
      {children}
      <span className="page-placeholder-sweep" />
    </div>
  );
}

const heldBusyByOtherMotion = (section: HTMLElement) => section.closest("[aria-busy]") !== null;

export function arriveSections(page: Element) {
  const sections = [...page.querySelectorAll<HTMLElement>("[data-page-section]")].filter((section) => !heldBusyByOtherMotion(section));
  const still = reducedMotion();
  const rise = matchMedia("(max-width: 767px)").matches ? 4 : 8;
  return sections.map((section, index) => section.animate(
    still ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: `translateY(${rise}px)` }, { opacity: 1, transform: "none" }],
    {
      duration: durationMs(still ? "--duration-fast" : "--duration-base"),
      easing: motionToken("--ease-standard"),
      delay: still ? 0 : index * STAGGER_MS,
      fill: "backwards",
    },
  ));
}

const noChange = () => () => {};

// React has no hydration flag; useSyncExternalStore reads its server snapshot only while hydrating.
export function PageArrival({ page }: { page: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const hydrating = useSyncExternalStore(noChange, () => false, () => true);
  const [openedByApp] = useState(!hydrating);
  useLayoutEffect(() => {
    if (!openedByApp) return;
    const status = ref.current!;
    // Screen readers announce a status line only when its text changes after it is on the page.
    const announce = requestAnimationFrame(() => { status.textContent = `${page} loaded`; });
    const arrivals = arriveSections(status.parentElement!);
    return () => {
      cancelAnimationFrame(announce);
      arrivals.forEach((arrival) => arrival.cancel());
    };
  }, [openedByApp, page]);
  return <p ref={ref} role="status" className="sr-only" />;
}
