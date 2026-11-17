"use client";

import { useEffect, useState } from "react";
import { DATA_SETS, HEIGHTS, LOADS, PAGES, WHOS, WIDTHS, readView, viewQuery, type FrameSize, type View } from "./view";

const STATES: { group: string; name: string; query: string; look: string }[] = [
  { group: "Admin", name: "Students", query: "page=students", look: "Look at the top bar. Tap each tab." },
  { group: "Admin", name: "Student detail", query: "page=detail", look: "Look at the top bar. Students stays current." },
  { group: "Admin", name: "Schedule lab", query: "page=lab", look: "Look at the top bar and the current tab." },
  { group: "Student side", name: "Real pages", query: "page=side", look: "Use the real onboarding and Weekly upload. Tap the date in the top bar to open the Walkthrough." },
  { group: "Student side", name: "Walkthrough open", query: "page=side&walk=1", look: "Tap Next day, Saturday, or Monday. The real page reloads on the new date." },
  { group: "Data", name: "No students", query: "data=none", look: "Look at the empty list." },
  { group: "Data", name: "One student", query: "data=one", look: "Look at the list." },
  { group: "Data", name: "60 students", query: "data=many", look: "Scroll. The top bar stays." },
  { group: "Data", name: "Worst case names", query: "data=worst", look: "Look at the long names and emails." },
  { group: "Data", name: "All on one plan", query: "data=same", look: "Look at the plan badges." },
  { group: "Account", name: "Admin with no name", query: "who=noname", look: "Open the avatar menu." },
  { group: "Account", name: "Long name and email", query: "who=long", look: "Open the avatar menu." },
  { group: "Loading", name: "Students loading", query: "load=hold", look: "Look at the whole page." },
];
const stateView = (query: string, keep: View) => ({ ...readView(Object.fromEntries(new URLSearchParams(query))), size: keep.size, reducedMotion: keep.reducedMotion, v: keep.v });
const GROUPS = [...new Set(STATES.map((s) => s.group))];

const TOOL = "h-8 rounded-md px-3 text-[13px] text-fog hover:text-chalk data-on:bg-graphite-line data-on:text-chalk";
const LABEL = "text-[12px] text-fog/70";

function Choices<K extends string>({ label, options, value, onPick }: { label: string; options: Record<K, string>; value: K; onPick: (value: K) => void }) {
  return (
    <div className="flex items-center gap-1">
      {label && <span className={LABEL}>{label}</span>}
      {(Object.keys(options) as K[]).map((key) => (
        <button key={key} type="button" data-on={value === key || undefined} className={TOOL} onClick={() => onPick(key)}>
          {options[key]}
        </button>
      ))}
    </div>
  );
}

const SIZES = Object.fromEntries((Object.keys(WIDTHS) as FrameSize[]).map((s) => [s, `${s[0]!.toUpperCase()}${s.slice(1)} ${WIDTHS[s]}`])) as Record<FrameSize, string>;

export default function Frame({ initial }: { initial: View }) {
  const [view, setView] = useState<View>(initial);
  const [loads, setLoads] = useState(0);
  const [screenV, setScreenV] = useState(initial.v);
  const [screen, setScreen] = useState(initial);
  const set = (change: Partial<View>) => {
    setView((v) => ({ ...v, ...change }));
    setScreen((v) => ({ ...v, ...change }));
    if (!("size" in change)) setScreenV(view.v);
  };
  const [more, setMore] = useState(false);
  const current = STATES.findIndex((s) => viewQuery(stateView(s.query, view)) === viewQuery(view));
  const src = `/prototypes/admin-dashboard/screen?${viewQuery({ ...screen, v: screenV }, false)}`;

  useEffect(() => {
    history.replaceState(null, "", `?${viewQuery(view)}`);
  }, [view]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<{ type?: string; v?: unknown; change?: Partial<View> }>) => {
      if (event.origin !== location.origin) return;
      if (event.data?.type === "variant" && typeof event.data.v === "number") {
        const next = event.data.v;
        setView((v) => (v.v === next ? v : { ...v, v: next }));
      }
      if (event.data?.type === "view" && event.data.change) {
        const change = event.data.change;
        setView((v) => ({ ...v, ...change }));
      }
    };
    addEventListener("message", onMessage);
    return () => removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-graphite font-sans">
      <div className="flex shrink-0 flex-col gap-1.5 border-b border-graphite-line bg-graphite px-4 py-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-[13px] font-semibold text-chalk">Admin dashboard</span>
          <label className="flex items-center gap-2">
            <span className={LABEL}>State</span>
            <select
              value={current}
              onChange={(e) => {
                const next = STATES[Number(e.target.value)];
                if (next) set(stateView(next.query, view));
              }}
              className="h-8 rounded-md border border-graphite-line bg-graphite px-2 text-[13px] text-chalk"
            >
              {current === -1 && <option value={-1}>Custom settings</option>}
              {GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {STATES.map((s, i) => s.group === g && <option key={s.name} value={i}>{s.name}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <span className="text-[13px] text-fog">{STATES[current]?.look ?? "Settings changed under More settings, or by a tap in the screen."}</span>
          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <Choices label="" options={SIZES} value={view.size} onPick={(size) => set({ size })} />
            <Choices label="" options={{ full: "Full motion", reduced: "Reduced motion" }} value={view.reducedMotion ? "reduced" : "full"} onPick={(m) => set({ reducedMotion: m === "reduced" })} />
            <button type="button" className={TOOL} onClick={() => { setScreen(view); setScreenV(view.v); setLoads((n) => n + 1); }}>Reload ↻</button>
            <button type="button" aria-expanded={more} data-on={more || undefined} className={TOOL} onClick={() => setMore((m) => !m)}>More settings {more ? "▴" : "▾"}</button>
          </div>
        </div>
        {more && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <Choices label="Page" options={PAGES} value={view.page} onPick={(page) => set({ page })} />
            <Choices label="Data" options={DATA_SETS} value={view.data} onPick={(data) => set({ data })} />
            <Choices label="Admin" options={WHOS} value={view.who} onPick={(who) => set({ who })} />
            <Choices label="Load" options={LOADS} value={view.load} onPick={(load) => set({ load })} />
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-6">
        <iframe
          key={`${src}#${loads}`}
          title="Prototype screen"
          src={src}
          style={{ width: WIDTHS[view.size], height: view.size === "desktop" ? `calc(100dvh - ${more ? 132 : 96}px)` : HEIGHTS[view.size] }}
          className="mx-auto block rounded-sm bg-paper shadow-2xl"
        />
      </div>
    </div>
  );
}
