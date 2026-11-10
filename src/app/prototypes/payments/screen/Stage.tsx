"use client";
import "../proto.css";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { arriveSections } from "@/lib/pageMotion";
import { durationMs, motionToken } from "@/lib/motion";
import { cx } from "@/components/ui/classes";
import { findScreen, findState } from "../screens";
import { DATASETS, isDatasetName, type DatasetName } from "../protoData";
import { ProtoDataContext, ProtoStateContext } from "../protoContext";

export type StageMessage = { type: "stage"; screen: string; variant: number; reducedMotion: boolean; data: DatasetName; state: string; mount: number; arrive: boolean };

export default function Stage({ screen, variant, reducedMotion, data, state }: { screen: string; variant: number; reducedMotion: boolean; data: string; state: string }) {
  const [view, setView] = useState({ screen, variant, reducedMotion, data: isDatasetName(data) ? data : ("demo" as DatasetName), state, mount: 0, arrival: 0 });
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent<StageMessage>) => {
      if (event.origin !== location.origin || event.data?.type !== "stage") return;
      const { screen, variant, reducedMotion, data, state, mount, arrive } = event.data;
      setView((current) => ({ screen, variant, reducedMotion, data, state, mount, arrival: current.arrival + (arrive ? 1 : 0) }));
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

  // A flow-map path opens the next page as the app does: from the top, its sections fading and rising in.
  useLayoutEffect(() => {
    const el = stage.current;
    if (!view.arrival || !el) return;
    el.scrollTop = 0;
    const heading = el.querySelector<HTMLElement>("h1");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus({ preventScroll: true });
    const arrivals = view.reducedMotion ? fadeSections(el) : arriveSections(el);
    return () => arrivals.forEach((arrival) => arrival.cancel());
  }, [view.arrival, view.reducedMotion]);

  const current = findScreen(view.screen);
  const { Component } = current.variants[view.variant - 1] ?? current.variants[0];
  const shownState = findState(current, view.state);
  return (
    <div
      ref={stage}
      data-rm={view.reducedMotion || undefined}
      className={cx(
        "fixed inset-0 z-[60] overflow-auto bg-paper",
        "data-rm:**:transition-none! data-rm:**:animate-none!",
      )}
    >
      <ProtoDataContext value={DATASETS[view.data]}>
        <ProtoStateContext value={shownState}>
          <Component key={`${view.screen}:${view.variant}:${view.data}:${shownState}:${view.mount}`} />
        </ProtoStateContext>
      </ProtoDataContext>
    </div>
  );
}

// The frame's reduced-motion switch, which `arriveSections` cannot see: the app's 120 ms fade with no movement.
function fadeSections(el: HTMLElement) {
  return [...el.querySelectorAll<HTMLElement>("[data-page-section]")].map((section) =>
    section.animate([{ opacity: 0 }, { opacity: 1 }], { duration: durationMs("--duration-fast"), easing: motionToken("--ease-standard"), fill: "backwards" }));
}
