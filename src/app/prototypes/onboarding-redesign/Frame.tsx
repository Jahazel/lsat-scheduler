"use client";

import { useEffect, useRef, useState } from "react";
import {
  DATA_SETS,
  HEIGHTS,
  NAME_CASES,
  PLAN_STATES,
  READ_OUTCOMES,
  REVEALS,
  SAVE_OUTCOMES,
  SCENES,
  WIDTHS,
  isScene,
  viewQuery,
  type DataSet,
  type FrameSize,
  type NameCase,
  type Page,
  type PlanState,
  type ReadOutcome,
  type RevealState,
  type SaveOutcome,
  type Scene,
  type View,
} from "./view";

const TOOL = "h-8 rounded-md px-3 text-[13px] text-fog hover:text-chalk data-on:bg-graphite-line data-on:text-chalk";
const LABEL = "text-[12px] text-fog/70";

export type Where = { page: Page; step: number; admin: boolean };

// A reload follows the brief's flow map: answers on the steps are lost, the Week reveal opens Plan choice
// (or This week for an admin), and every other page opens itself again.
function reloaded(view: View, at: Where | null): View {
  if (!at || at.page !== "onboarding") return { ...view, page: at?.page ?? view.page };
  if (at.step <= 4) return { ...view, page: "onboarding", step: 1, data: "empty" };
  if (at.step === 5 && at.admin) return { ...view, page: "thisweek" };
  return { ...view, page: "onboarding", step: 6 };
}

function Choices<K extends string>({ label, options, value, onPick }: { label: string; options: Record<K, string>; value: K; onPick: (value: K) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className={LABEL}>{label}</span>
      {(Object.keys(options) as K[]).map((key) => (
        <button key={key} type="button" data-on={value === key || undefined} className={TOOL} onClick={() => onPick(key)}>
          {options[key]}
        </button>
      ))}
    </div>
  );
}

const OPEN: { label: string; page: Page; step: number }[] = [
  { label: "Sign-up", page: "signup", step: 1 },
  { label: "Steps", page: "onboarding", step: 1 },
  { label: "Week reveal", page: "onboarding", step: 5 },
  { label: "Plan choice", page: "onboarding", step: 6 },
];

export default function Frame({ initial }: { initial: View }) {
  const [view, setView] = useState<View>(initial);
  const [loads, setLoads] = useState(0);
  const at = useRef<Where | null>(null);
  const set = (change: Partial<View>) => setView((v) => ({ ...v, ...change }));
  // The frame's address leaves out the size and the variant the screen reports back, so changing them never reloads it.
  const src = `/prototypes/onboarding-redesign/screen?${viewQuery({ ...view, v: initial.v }, false)}`;

  useEffect(() => {
    history.replaceState(null, "", `?${viewQuery(view)}`);
  }, [view]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<{ type?: string; scene?: unknown; v?: unknown; at?: Where }>) => {
      if (event.origin !== location.origin) return;
      const scene = event.data?.scene;
      if (event.data?.type === "scene" && isScene(scene)) setView((v) => ({ ...v, scene }));
      if (event.data?.type === "at" && event.data.at) at.current = event.data.at;
      if (event.data?.type === "variant" && typeof event.data.v === "number") {
        const next = event.data.v;
        setView((v) => (v.v === next ? v : { ...v, v: next }));
      }
    };
    addEventListener("message", onMessage);
    return () => removeEventListener("message", onMessage);
  }, []);

  const reload = () => {
    setView((v) => reloaded(v, at.current));
    setLoads((n) => n + 1);
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-graphite-raised font-sans">
      <div className="flex shrink-0 flex-col gap-1.5 border-b border-graphite-line bg-graphite px-4 py-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-[13px] font-semibold text-chalk">Onboarding redesign</span>
          <Choices label="" options={SCENES} value={view.scene} onPick={(scene: Scene) => set({ scene, v: 1 })} />
          <Choices label="" options={Object.fromEntries((Object.keys(WIDTHS) as FrameSize[]).map((s) => [s, `${s[0].toUpperCase()}${s.slice(1)} ${WIDTHS[s]}`])) as Record<FrameSize, string>} value={view.size} onPick={(size) => set({ size })} />
          <Choices label="" options={{ full: "Full motion", reduced: "Reduced motion" }} value={view.reducedMotion ? "reduced" : "full"} onPick={(m) => set({ reducedMotion: m === "reduced" })} />
          <div className="flex items-center gap-1">
            <span className={LABEL}>Open</span>
            {OPEN.map((o) => (
              <button key={o.label} type="button" data-on={(view.page === o.page && (o.page !== "onboarding" || (o.step === 1 ? view.step <= 4 : view.step === o.step))) || undefined} className={TOOL} onClick={() => set({ page: o.page, step: o.step })}>
                {o.label}
              </button>
            ))}
            <button type="button" className={TOOL} onClick={reload}>Reload page ↻</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <Choices label="Data" options={DATA_SETS} value={view.data} onPick={(data: DataSet) => set({ data })} />
          <Choices label="" options={NAME_CASES} value={view.name} onPick={(name: NameCase) => set({ name })} />
          <Choices label="Scanning" options={{ on: "On", off: "Off" }} value={view.scanOff ? "off" : "on"} onPick={(s) => set({ scanOff: s === "off" })} />
          <Choices label="" options={READ_OUTCOMES} value={view.read} onPick={(read: ReadOutcome) => set({ read })} />
          <Choices label="" options={SAVE_OUTCOMES} value={view.save} onPick={(save: SaveOutcome) => set({ save })} />
          <Choices label="Reveal" options={REVEALS} value={view.reveal} onPick={(reveal: RevealState) => set({ reveal })} />
          <Choices label="Plan" options={PLAN_STATES} value={view.plan} onPick={(plan: PlanState) => set({ plan })} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-6">
        <iframe
          key={`${src}#${loads}`}
          title="Prototype screen"
          src={src}
          style={{ width: WIDTHS[view.size], height: view.size === "desktop" ? "calc(100dvh - 132px)" : HEIGHTS[view.size] }}
          className="mx-auto block rounded-sm bg-paper shadow-2xl"
        />
      </div>
    </div>
  );
}
