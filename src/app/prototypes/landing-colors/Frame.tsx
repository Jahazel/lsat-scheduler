"use client";

import "./picker.css";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { HEIGHTS, PAGES, VARIANT_NAMES, WIDTHS, screenQuery, type FrameSize, type ScreenPage, type View } from "./view";

const TOOL = "h-8 rounded-md px-3 text-[13px] text-fog hover:text-chalk data-on:bg-graphite-line data-on:text-chalk";

export default function Frame({ initial }: { initial: View }) {
  const [view, setView] = useState<View>(initial);
  const [mount, setMount] = useState(0);
  const picker = useRef<HTMLElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const [framePage, setFramePage] = useState(initial.page);
  const src = `/prototypes/landing-colors/screen?${screenQuery({ ...view, page: framePage })}`;

  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set("size", view.size);
    url.searchParams.set("page", view.page);
    url.searchParams.set("rm", view.reducedMotion ? "1" : "0");
    url.searchParams.set("v", String(view.variant + 1));
    history.replaceState(null, "", url);
  }, [view]);

  useLayoutEffect(() => {
    const move = () => {
      const item = items.current[view.variant];
      if (!item || !highlight.current) return;
      highlight.current.style.width = `${item.offsetWidth}px`;
      highlight.current.style.transform = `translateX(${item.offsetLeft}px)`;
    };
    move();
    addEventListener("resize", move);
    return () => removeEventListener("resize", move);
  }, [view.variant]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => picker.current?.setAttribute("data-ready", "")));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const onKey = (key: string) => {
      const count = VARIANT_NAMES.length;
      const number = parseInt(key, 10);
      if (!count) return;
      if (number >= 1 && number <= count) setView((v) => ({ ...v, variant: number - 1 }));
      else if (key === "ArrowRight") setView((v) => ({ ...v, variant: (v.variant + 1) % count }));
      else if (key === "ArrowLeft") setView((v) => ({ ...v, variant: (v.variant - 1 + count) % count }));
      else if (key === "r" || key === "R") setMount((value) => value + 1);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      onKey(event.key);
    };
    const onMessage = (event: MessageEvent<{ type?: string; key?: string; page?: ScreenPage }>) => {
      if (event.origin !== location.origin) return;
      if (event.data?.type === "key" && event.data.key) onKey(event.data.key);
      const page = event.data?.page;
      if (event.data?.type === "page" && page) setView((v) => (v.page === page ? v : { ...v, page }));
    };
    addEventListener("keydown", onKeyDown);
    addEventListener("message", onMessage);
    return () => {
      removeEventListener("keydown", onKeyDown);
      removeEventListener("message", onMessage);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-graphite-raised font-sans">
      <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-graphite-line bg-graphite px-4 py-2">
        <span className="text-[13px] font-semibold text-chalk">Landing colors and scroll</span>
        <div className="flex gap-1">
          {(Object.keys(PAGES) as ScreenPage[]).map((page) => (
            <button key={page} type="button" data-on={view.page === page || undefined} className={TOOL} onClick={() => {
              setFramePage(page);
              setView((v) => ({ ...v, page }));
            }}>
              {PAGES[page]}
            </button>
          ))}
        </div>
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
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-6">
        <iframe
          key={`${src}:${mount}`}
          title="Prototype screen"
          src={src}
          style={{ width: WIDTHS[view.size], height: view.size === "desktop" ? "calc(100dvh - 104px)" : HEIGHTS[view.size] }}
          className="mx-auto block rounded-sm bg-paper shadow-2xl"
        />
      </div>
      {VARIANT_NAMES.length > 0 && view.page !== "landing" && (
      <nav ref={picker} className="proto-picker" aria-label="Prototype variants">
        <span ref={highlight} className="proto-picker-highlight" aria-hidden="true" />
        {VARIANT_NAMES.map((name, index) => (
          <button
            key={name}
            ref={(item) => {
              items.current[index] = item;
            }}
            type="button"
            className="proto-picker-item"
            data-active={view.variant === index || undefined}
            aria-current={view.variant === index ? "true" : undefined}
            onClick={() => setView((v) => ({ ...v, variant: index }))}
          >
            {name}
          </button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true" />
        <button type="button" className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" onClick={() => setMount((value) => value + 1)}>
          ↻
        </button>
      </nav>
      )}
    </div>
  );
}
