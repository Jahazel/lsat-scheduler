"use client";
import "../proto.css";

import { useEffect, useState } from "react";
import { cx } from "@/components/ui/classes";
import { findScreen } from "../screens";

export type StageMessage = { type: "stage"; screen: string; variant: number; reducedMotion: boolean; mount: number };

export default function Stage({ screen, variant, reducedMotion }: { screen: string; variant: number; reducedMotion: boolean }) {
  const [view, setView] = useState({ screen, variant, reducedMotion, mount: 0 });

  useEffect(() => {
    const onMessage = (event: MessageEvent<StageMessage>) => {
      if (event.origin !== location.origin || event.data?.type !== "stage") return;
      const { screen, variant, reducedMotion, mount } = event.data;
      setView({ screen, variant, reducedMotion, mount });
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

  const current = findScreen(view.screen);
  const { Component } = current.variants[view.variant - 1] ?? current.variants[0];
  return (
    <div
      data-rm={view.reducedMotion || undefined}
      className={cx(
        "fixed inset-0 z-[60] overflow-auto bg-paper",
        "data-rm:**:transition-none! data-rm:**:animate-none!",
      )}
    >
      <Component key={`${view.screen}:${view.variant}:${view.mount}`} />
    </div>
  );
}
