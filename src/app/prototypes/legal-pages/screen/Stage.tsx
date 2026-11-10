"use client";
import "../proto.css";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { arriveSections } from "@/lib/pageMotion";
import { durationMs, motionToken } from "@/lib/motion";
import { cx } from "@/components/ui/classes";
import { SiteChrome } from "../chrome";
import { legalPages } from "../content";
import type { AuthState, DatasetName, LegalPageId } from "../pages";
import { ProtoViewContext } from "../protoContext";
import { VARIANTS, clampVariant } from "../variants";
import { markSection } from "../sections/list/sectionNav";

export type StageMessage = { type: "stage"; page: LegalPageId; variant: number; reducedMotion: boolean; data: DatasetName; auth: AuthState; mount: number; arrive: boolean; section?: string };

type View = Omit<StageMessage, "type" | "arrive"> & { arrival: number };

export default function Stage(initial: { page: LegalPageId; variant: number; reducedMotion: boolean; data: DatasetName; auth: AuthState; section?: string }) {
  const [view, setView] = useState<View>({ ...initial, mount: 0, arrival: initial.section ? 1 : 0 });
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent<StageMessage>) => {
      if (event.origin !== location.origin || event.data?.type !== "stage") return;
      const { page, variant, reducedMotion, data, auth, mount, arrive, section } = event.data;
      setView((current) => ({ page, variant, reducedMotion, data, auth, mount, section: arrive ? section : current.section, arrival: current.arrival + (arrive ? 1 : 0) }));
    };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      parent.postMessage({ type: "key", key: event.key }, location.origin);
    };
    window.addEventListener("message", onMessage);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useLayoutEffect(() => {
    const el = stage.current;
    if (!view.arrival || !el) return;
    el.scrollTop = 0;
    const target = view.section ? document.getElementById(view.section) : null;
    target?.scrollIntoView({ block: "start" });
    (target?.querySelector("h2") ?? el.querySelector<HTMLElement>("h1"))?.focus({ preventScroll: true });
    const mark = target && requestAnimationFrame(() => markSection(target.id));
    const arrivals = view.reducedMotion ? fadeSections(el) : arriveSections(el);
    return () => {
      if (mark) cancelAnimationFrame(mark);
      arrivals.forEach((arrival) => arrival.cancel());
    };
  }, [view.arrival, view.section, view.reducedMotion]);

  const pages = useMemo(() => legalPages(view.data), [view.data]);
  const page = pages.find((item) => item.id === view.page) ?? pages[0];
  const { Component } = VARIANTS[clampVariant(view.variant) - 1];
  return (
    <div
      ref={stage}
      data-stage
      data-rm={view.reducedMotion || undefined}
      className={cx("fixed inset-0 z-[60] overflow-auto bg-paper [-webkit-tap-highlight-color:transparent]", "data-rm:**:transition-none! data-rm:**:animate-none!")}
    >
      <ProtoViewContext value={{ page, pages }}>
        <SiteChrome signedIn={view.auth === "in"}>
          <Component key={`${view.variant}:${view.data}:${view.mount}`} />
        </SiteChrome>
      </ProtoViewContext>
    </div>
  );
}

function fadeSections(el: HTMLElement) {
  return [...el.querySelectorAll<HTMLElement>("[data-page-section]")].map((section) =>
    section.animate([{ opacity: 0 }, { opacity: 1 }], { duration: durationMs("--duration-fast"), easing: motionToken("--ease-standard"), fill: "backwards" }));
}
