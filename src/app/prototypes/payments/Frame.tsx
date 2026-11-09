"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SCREENS, findScreen } from "./screens";
import { DATASETS, type DatasetName } from "./protoData";
import type { StageMessage } from "./screen/Stage";
import "./picker.css";

export type FrameSize = "desktop" | "tablet" | "mobile";
const WIDTHS: Record<FrameSize, number> = { desktop: 1440, tablet: 768, mobile: 390 };
const HEIGHTS: Record<FrameSize, number> = { desktop: 900, tablet: 1024, mobile: 844 };

type View = { size: FrameSize; reducedMotion: boolean; screen: string; variant: number; data: DatasetName };

const DATA_LABELS: Record<DatasetName, string> = { demo: "Demo data", worst: "Worst case", "no-saving": "No saving" };

const TOOL = "h-8 rounded-md px-3 text-[13px] text-fog hover:text-chalk data-on:bg-graphite-line data-on:text-chalk";

export default function Frame({ initial }: { initial: View }) {
  const [view, setView] = useState<View>({ ...initial, screen: findScreen(initial.screen).id });
  const [mount, setMount] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const screen = findScreen(view.screen);
  const variant = Math.min(Math.max(view.variant, 1), screen.variants.length);

  const [src] = useState(() => `/prototypes/payments/screen?screen=${view.screen}&v=${variant}&rm=${view.reducedMotion ? 1 : 0}&data=${view.data}`);

  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set("size", view.size);
    url.searchParams.set("rm", view.reducedMotion ? "1" : "0");
    url.searchParams.set("screen", screen.id);
    url.searchParams.set("v", String(variant));
    url.searchParams.set("data", view.data);
    history.replaceState(null, "", url);
    const message: StageMessage = { type: "stage", screen: screen.id, variant, reducedMotion: view.reducedMotion, data: view.data, mount };
    frame.current?.contentWindow?.postMessage(message, location.origin);
  }, [view, screen.id, variant, mount]);

  const pick = useCallback((index: number) => {
    if (index < 0 || index >= screen.variants.length) return;
    setView((current) => ({ ...current, variant: index + 1 }));
  }, [screen.variants.length]);

  const onKey = useCallback((key: string) => {
    const count = screen.variants.length;
    const number = parseInt(key, 10);
    if (number >= 1 && number <= count) pick(number - 1);
    else if (key === "ArrowRight") pick(variant % count);
    else if (key === "ArrowLeft") pick((variant - 2 + count) % count);
    else if (key === "r" || key === "R") setMount((value) => value + 1);
  }, [pick, screen.variants.length, variant]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      onKey(event.key);
    };
    const onMessage = (event: MessageEvent<{ type: string; key: string }>) => {
      if (event.origin === location.origin && event.data?.type === "key") onKey(event.data.key);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("message", onMessage);
    };
  }, [onKey]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-graphite-raised font-sans">
      <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-graphite-line bg-graphite px-4 py-2">
        <span className="text-[13px] font-semibold text-chalk">Payments prototype</span>
        <div className="flex gap-1">
          {(Object.keys(WIDTHS) as FrameSize[]).map((size) => (
            <button key={size} type="button" data-on={view.size === size || undefined} className={TOOL} onClick={() => setView((v) => ({ ...v, size }))}>
              {size[0].toUpperCase() + size.slice(1)} {WIDTHS[size]}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button type="button" data-on={!view.reducedMotion || undefined} className={TOOL} onClick={() => setView((v) => ({ ...v, reducedMotion: false }))}>
            Full motion
          </button>
          <button type="button" data-on={view.reducedMotion || undefined} className={TOOL} onClick={() => setView((v) => ({ ...v, reducedMotion: true }))}>
            Reduced motion
          </button>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-fog">
          Screen
          <select
            value={screen.id}
            onChange={(event) => setView((v) => ({ ...v, screen: event.target.value, variant: 1 }))}
            className="h-8 rounded-md bg-graphite-raised px-2 text-chalk"
          >
            {SCREENS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-6">
        <iframe
          ref={frame}
          title="Prototype screen"
          src={src}
          onLoad={() => setMount((value) => value + 1)}
          style={{ width: WIDTHS[view.size], height: view.size === "desktop" ? `max(${HEIGHTS.desktop}px, calc(100dvh - 104px))` : HEIGHTS[view.size] }}
          className="mx-auto block rounded-sm bg-paper shadow-2xl"
        />
      </div>
      <div role="radiogroup" aria-label="Data" className="fixed bottom-6 left-1/2 z-[61] flex -translate-x-1/2 gap-0.5 rounded-pill bg-vellum-line p-0.5 font-sans text-[13px] shadow-e1">
        {(Object.keys(DATASETS) as DatasetName[]).map((name) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={view.data === name}
            onClick={() => setView((v) => ({ ...v, data: name }))}
            className={view.data === name ? "rounded-pill bg-paper px-3 py-1 text-ink shadow-control" : "rounded-pill px-3 py-1 text-smoke hover:text-ink"}
          >
            {DATA_LABELS[name]}
          </button>
        ))}
      </div>
      {screen.variants.length > 1 && (
        <Picker names={screen.variants.map((v) => v.name)} active={variant - 1} onPick={pick} onReplay={() => setMount((value) => value + 1)} />
      )}
    </div>
  );
}

function Picker({ names, active, onPick, onReplay }: { names: string[]; active: number; onPick: (index: number) => void; onReplay: () => void }) {
  const nav = useRef<HTMLElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  useLayoutEffect(() => {
    const move = () => {
      const el = items.current[active];
      if (!el || !highlight.current) return;
      highlight.current.style.width = `${el.offsetWidth}px`;
      highlight.current.style.transform = `translateX(${el.offsetLeft}px)`;
    };
    move();
    window.addEventListener("resize", move);
    return () => window.removeEventListener("resize", move);
  }, [active, names]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => requestAnimationFrame(() => nav.current?.setAttribute("data-ready", "")));
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <nav ref={nav} className="proto-picker" aria-label="Prototype variants">
      <span ref={highlight} className="proto-picker-highlight" aria-hidden="true" />
      {names.map((name, index) => (
        <button
          key={name}
          ref={(el) => { items.current[index] = el; }}
          className="proto-picker-item"
          data-active={index === active || undefined}
          aria-current={index === active ? "true" : undefined}
          onClick={() => onPick(index)}
        >
          {name}
        </button>
      ))}
      <span className="proto-picker-divider" aria-hidden="true" />
      <button className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" onClick={onReplay}>
        ↻
      </button>
    </nav>
  );
}
