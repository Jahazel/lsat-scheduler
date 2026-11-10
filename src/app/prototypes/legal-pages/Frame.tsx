"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PAGE_IDS, PAGE_LABELS, isPageId, type AuthState, type DatasetName, type LegalPageId } from "./pages";
import type { StageMessage } from "./screen/Stage";

export type FrameSize = "desktop" | "tablet" | "mobile";
const WIDTHS: Record<FrameSize, number> = { desktop: 1440, tablet: 768, mobile: 390 };
const HEIGHTS: Record<FrameSize, number> = { desktop: 900, tablet: 1024, mobile: 844 };

type View = { size: FrameSize; reducedMotion: boolean; page: LegalPageId; data: DatasetName; auth: AuthState; at: string | null };

const SHARED_LINK: Record<LegalPageId, string | null> = { terms: "cancelling-and-refunds", privacy: "deleting-your-account", "ai-disclosure": null };
const ENTRIES = { top: "Footer or sign-up link (top)", shared: "Shared section link", unknown: "Unknown link (#unknown)" } as const;
type Entry = keyof typeof ENTRIES;

const TOOL = "h-8 rounded-md px-3 text-[13px] text-fog hover:text-chalk data-on:bg-graphite-line data-on:text-chalk";
const SELECT = "h-8 rounded-md bg-graphite-raised px-2 text-chalk";

export default function Frame({ initial }: { initial: View }) {
  const [view, setView] = useState<View>(initial);
  const [mount, setMount] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const arriving = useRef<{ section?: string } | null>(null);

  const [src] = useState(() => `/prototypes/legal-pages/screen?page=${view.page}&rm=${view.reducedMotion ? 1 : 0}&data=${view.data}&auth=${view.auth}${view.at ? `&at=${view.at}` : ""}`);

  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set("size", view.size);
    url.searchParams.set("rm", view.reducedMotion ? "1" : "0");
    url.searchParams.set("page", view.page);
    url.searchParams.set("data", view.data);
    url.searchParams.set("auth", view.auth);
    if (view.at) url.searchParams.set("at", view.at);
    else url.searchParams.delete("at");
    url.searchParams.delete("v");
    history.replaceState(null, "", url);
    const message: StageMessage = { type: "stage", page: view.page, reducedMotion: view.reducedMotion, data: view.data, auth: view.auth, mount, arrive: !!arriving.current, section: arriving.current?.section };
    arriving.current = null;
    frame.current?.contentWindow?.postMessage(message, location.origin);
  }, [view, mount]);

  const open = (entry: Entry) => {
    const at = entry === "shared" ? SHARED_LINK[view.page] : entry === "unknown" ? "unknown" : null;
    arriving.current = { section: at ?? undefined };
    setView((v) => ({ ...v, at }));
  };

  const onKey = useCallback((key: string) => {
    if (key === "r" || key === "R") setMount((value) => value + 1);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      onKey(event.key);
    };
    const onMessage = (event: MessageEvent<{ type: string; key?: string; page?: string; section?: string | null }>) => {
      if (event.origin !== location.origin) return;
      if (event.data?.type === "key" && event.data.key) onKey(event.data.key);
      const page = event.data?.page;
      if (event.data?.type === "go" && isPageId(page)) {
        const section = event.data.section ?? undefined;
        arriving.current = { section };
        const url = new URL(location.href);
        url.searchParams.set("page", page);
        if (section) url.searchParams.set("at", section);
        else url.searchParams.delete("at");
        history.pushState(null, "", url);
        setView((v) => ({ ...v, page, at: section ?? null }));
      }
      if (event.data?.type === "address") setView((v) => ({ ...v, at: event.data.section ?? null }));
    };
    const onPop = () => {
      const params = new URL(location.href).searchParams;
      const page = params.get("page") ?? undefined;
      const at = params.get("at");
      if (!isPageId(page)) return;
      arriving.current = { section: at ?? undefined };
      setView((v) => ({ ...v, page, at }));
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("message", onMessage);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("message", onMessage);
      window.removeEventListener("popstate", onPop);
    };
  }, [onKey]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-graphite-raised font-sans">
      <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-graphite-line bg-graphite px-4 py-2">
        <span className="text-[13px] font-semibold text-chalk">Legal pages prototype · approved design</span>
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
          {(["out", "in"] as const).map((auth) => (
            <button key={auth} type="button" data-on={view.auth === auth || undefined} className={TOOL} onClick={() => setView((v) => ({ ...v, auth }))}>
              {auth === "out" ? "Signed out" : "Signed in"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[13px] text-fog">
          Page
          <select value={view.page} onChange={(event) => isPageId(event.target.value) && setView((v) => ({ ...v, page: event.target.value as LegalPageId, at: null }))} className={SELECT}>
            {PAGE_IDS.map((id) => (
              <option key={id} value={id}>{PAGE_LABELS[id]}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-[13px] text-fog">
          Open from
          <select value="" onChange={(event) => open(event.target.value as Entry)} className={SELECT}>
            <option value="" disabled>Choose…</option>
            {(Object.keys(ENTRIES) as Entry[]).filter((entry) => entry !== "shared" || SHARED_LINK[view.page]).map((entry) => (
              <option key={entry} value={entry}>{ENTRIES[entry]}</option>
            ))}
          </select>
        </label>
        <span className="ml-auto truncate font-mono text-[12px] text-fog">drillmap.xyz/legal/{view.page}{view.at ? `#${view.at}` : ""}</span>
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
        {(["demo", "worst"] as const).map((name) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={view.data === name}
            onClick={() => setView((v) => ({ ...v, data: name }))}
            className={view.data === name ? "rounded-pill bg-paper px-3 py-1 text-ink shadow-control" : "rounded-pill px-3 py-1 text-smoke hover:text-ink"}
          >
            {name === "demo" ? "Demo data" : "Worst case"}
          </button>
        ))}
      </div>
    </div>
  );
}
