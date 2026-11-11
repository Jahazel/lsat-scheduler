"use client";

import { useEffect, useState } from "react";
import { HEIGHTS, SCENES, WIDTHS, isScene, viewQuery, type FrameSize, type Scene, type View } from "./view";

const TOOL = "h-8 rounded-md px-3 text-[13px] text-fog hover:text-chalk data-on:bg-graphite-line data-on:text-chalk";

export default function Frame({ initial }: { initial: View }) {
  const [view, setView] = useState<View>(initial);
  const src = `/prototypes/site-logo/screen?${viewQuery(view, false)}`;

  useEffect(() => {
    history.replaceState(null, "", `?${viewQuery(view)}`);
  }, [view]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<{ type?: string; scene?: unknown }>) => {
      const scene = event.data?.scene;
      if (event.origin === location.origin && event.data?.type === "scene" && isScene(scene)) setView((v) => ({ ...v, scene }));
    };
    addEventListener("message", onMessage);
    return () => removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-graphite-raised font-sans">
      <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-graphite-line bg-graphite px-4 py-2">
        <span className="text-[13px] font-semibold text-chalk">Site logo</span>
        <div className="flex gap-1">
          {(Object.keys(SCENES) as Scene[]).map((scene) => (
            <button key={scene} type="button" data-on={view.scene === scene || undefined} className={TOOL} onClick={() => setView((v) => ({ ...v, scene }))}>
              {SCENES[scene]}
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
        <div className="flex gap-1">
          <button type="button" data-on={!view.worst || undefined} className={TOOL} onClick={() => setView((v) => ({ ...v, worst: false }))}>
            Demo data
          </button>
          <button type="button" data-on={view.worst || undefined} className={TOOL} onClick={() => setView((v) => ({ ...v, worst: true }))}>
            Worst case
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-6">
        <iframe
          key={src}
          title="Prototype screen"
          src={src}
          style={{ width: WIDTHS[view.size], height: view.size === "desktop" ? "calc(100dvh - 104px)" : HEIGHTS[view.size] }}
          className="mx-auto block rounded-sm bg-paper shadow-2xl"
        />
      </div>
    </div>
  );
}
