"use client";

import { useEffect, useState } from "react";
import { DATA_SETS, ENTERS, HEIGHTS, LOADS, PLAN_NOTES, TICKS, TODAYS, WEEK_STATES, WHOS, WIDTHS, readView, viewQuery, type FrameSize, type View } from "./view";

// One entry per brief state or data case: what it is, its settings, and where on the page to look.
const STATES: { group: string; name: string; query: string; look: string }[] = [
  { group: "Week", name: "Normal week, midweek", query: "data=demo&today=thu", look: "Look at the whole first screen." },
  { group: "Week", name: "Week started late", query: "data=worst&today=wed", look: "Look at Monday under Rest of the week." },
  { group: "Week", name: "Rest day today", query: "data=demo&today=wed", look: "Look at the Today card." },
  { group: "Week", name: "Practice-test day", query: "data=demo&today=sat", look: "Look at the Today card." },
  { group: "Week", name: "Review day", query: "data=demo&today=sun", look: "Look at the Today card." },
  { group: "Week", name: "All done today", query: "data=demo&today=thu&ticks=today", look: "Look at the Today card." },
  { group: "Week", name: "Whole week done", query: "data=demo&today=thu&ticks=all", look: "Look at the summary card." },
  { group: "Week", name: "Behind pace", query: "data=demo&today=fri&ticks=none", look: "Look at the amber behind pill." },
  { group: "Week", name: "Weekend, upload due", query: "data=demo&today=sat&week=upload", look: "Look at the top card and the dot on Upload." },
  { group: "Week", name: "Next-week preview", query: "data=demo&today=sat&week=preview", look: "Look at the title and the summary card." },
  { group: "Week", name: "Held week", query: "data=demo&today=thu&week=held", look: "Look at the clock card." },
  { group: "Week", name: "Test day", query: "data=empty&today=thu", look: "Look at the Test day chip and the summary card." },
  { group: "Week", name: "Week before the test", query: "data=neartest&today=thu", look: "Look at the week note and Tuesday's rest-day note." },
  { group: "Week", name: "Loading", query: "data=demo&today=thu&load=hold", look: "Look at the whole page." },
  { group: "Plan", name: "Free week ending", query: "data=demo&today=fri&note=ending", look: "Look at the plan note card at the top." },
  { group: "Plan", name: "Payment retrying", query: "data=demo&today=sat&week=upload&note=retrying", look: "Look at the two top cards." },
  { group: "Plan", name: "Lapsed", query: "data=demo&today=thu&week=held&note=lapsed", look: "Tap Pick a plan, then Pay with Stripe Checkout." },
  { group: "Actions", name: "Check-in save fails", query: "data=demo&today=thu&fail=1", look: "Tick any row. Look at the message at the bottom." },
  { group: "Actions", name: "Admin date", query: "data=demo&today=thu&admin=1", look: "Tap Change in the dashed chip at the top." },
  { group: "Arrive", name: "From Log in", query: "data=demo&today=thu&enter=login", look: "Tap Log in with Google. Watch This week rise in." },
  { group: "Arrive", name: "Drill link", query: "data=demo&today=thu&enter=drill", look: "The setup guide opens. Press Esc: focus goes back to Set up." },
  { group: "Arrive", name: "Drill link, not this week", query: "data=demo&today=thu&enter=nodrill", look: "Look above the Today card." },
  { group: "Arrive", name: "Old history link", query: "data=demo&enter=history", look: "Look at the page you land on." },
  { group: "Arrive", name: "No schedule yet", query: "data=demo&enter=noschedule", look: "Look at the page you land on." },
  { group: "Arrive", name: "No profile yet", query: "data=demo&enter=noprofile", look: "Look at the page you land on." },
  { group: "Test data", name: "Worst case", query: "data=worst&today=thu", look: "Look at the long name, the notes, and the long labels." },
  { group: "Test data", name: "32 activities", query: "data=busy&today=thu", look: "Look at the six-row day cards." },
  { group: "Test data", name: "One activity, test passed", query: "data=edge&today=thu", look: "Look at the summary card." },
  { group: "Test data", name: "Light week", query: "data=empty&today=tue", look: "Look at the day note in the Today card." },
  { group: "Test data", name: "Test in 4 days, nothing planned", query: "data=near&today=thu", look: "Look at the summary card." },
  { group: "Test data", name: "No name", query: "data=demo&who=noname", look: "Open the avatar menu." },
  { group: "Test data", name: "One-letter name", query: "data=demo&who=one", look: "Open the avatar menu." },
  { group: "Test data", name: "Non-Latin name", query: "data=demo&who=nonlatin", look: "Open the avatar menu." },
  { group: "Test data", name: "Emoji-first name", query: "data=demo&who=emoji", look: "Open the avatar menu." },
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
  // The variant the screen loads with. A pick inside the screen changes only view.v, so picking never reloads it;
  // any other setting reloads the screen and carries the current pick along.
  const [screenV, setScreenV] = useState(initial.v);
  // The view the screen loaded with. A change made inside the screen (the Admin date) updates the toolbar and URL only.
  const [screen, setScreen] = useState(initial);
  const set = (change: Partial<View>) => {
    setView((v) => ({ ...v, ...change }));
    setScreen((v) => ({ ...v, ...change }));
    if (!("size" in change)) setScreenV(view.v);
  };
  const [more, setMore] = useState(false);
  const current = STATES.findIndex((s) => viewQuery(stateView(s.query, view)) === viewQuery(view));
  const src = `/prototypes/this-week-redesign/screen?${viewQuery({ ...screen, v: screenV }, false)}`;

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
    <div className="fixed inset-0 z-[60] flex flex-col bg-graphite-raised font-sans">
      <div className="flex shrink-0 flex-col gap-1.5 border-b border-graphite-line bg-graphite px-4 py-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-[13px] font-semibold text-chalk">This week redesign</span>
          <label className="flex items-center gap-2">
            <span className={LABEL}>State</span>
            <select
              value={current}
              onChange={(e) => {
                const next = STATES[Number(e.target.value)];
                if (next) set(stateView(next.query, view));
              }}
              className="h-8 rounded-md border border-graphite-line bg-graphite-raised px-2 text-[13px] text-chalk"
            >
              {current === -1 && <option value={-1}>Custom settings</option>}
              {GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {STATES.map((s, i) => s.group === g && <option key={s.name} value={i}>{s.name}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <span className="text-[13px] text-fog">{STATES[current]?.look ?? "Settings changed under More settings."}</span>
          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <Choices label="" options={SIZES} value={view.size} onPick={(size) => set({ size })} />
            <Choices label="" options={{ full: "Full motion", reduced: "Reduced motion" }} value={view.reducedMotion ? "reduced" : "full"} onPick={(m) => set({ reducedMotion: m === "reduced" })} />
            <button type="button" className={TOOL} onClick={() => { setScreen(view); setScreenV(view.v); setLoads((n) => n + 1); }}>Reload ↻</button>
            <button type="button" aria-expanded={more} data-on={more || undefined} className={TOOL} onClick={() => setMore((m) => !m)}>More settings {more ? "▴" : "▾"}</button>
          </div>
        </div>
        {more && (<>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <Choices label="Data" options={DATA_SETS} value={view.data} onPick={(data) => set({ data })} />
          <Choices label="Today" options={TODAYS} value={view.today} onPick={(today) => set({ today })} />
          <Choices label="Week" options={WEEK_STATES} value={view.week} onPick={(week) => set({ week })} />
          <Choices label="Plan" options={PLAN_NOTES} value={view.note} onPick={(note) => set({ note })} />
          <Choices label="Load" options={LOADS} value={view.load} onPick={(load) => set({ load })} />
          <Choices label="Account" options={{ student: "Student", admin: "Admin" }} value={view.admin ? "admin" : "student"} onPick={(a) => set({ admin: a === "admin" })} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <Choices label="Ticks" options={TICKS} value={view.ticks} onPick={(ticks) => set({ ticks })} />
          <Choices label="Name" options={WHOS} value={view.who} onPick={(who) => set({ who })} />
          <Choices label="Arrive" options={ENTERS} value={view.enter} onPick={(enter) => set({ enter })} />
          <Choices label="Saves" options={{ ok: "Work", fail: "Fail" }} value={view.fail ? "fail" : "ok"} onPick={(f) => set({ fail: f === "fail" })} />
        </div>
        </>)}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-6">
        <iframe
          key={`${src}#${loads}`}
          title="Prototype screen"
          src={src}
          style={{ width: WIDTHS[view.size], height: view.size === "desktop" ? `calc(100dvh - ${more ? 168 : 96}px)` : HEIGHTS[view.size] }}
          className="mx-auto block rounded-sm bg-paper shadow-2xl"
        />
      </div>
    </div>
  );
}
