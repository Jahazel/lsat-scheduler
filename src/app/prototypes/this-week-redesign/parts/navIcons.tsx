import type { ReactNode } from "react";

export type NavName = "week" | "upload" | "progress" | "settings";
export type IconSet = "line" | "solid" | "fresh" | "duotone" | "hairline" | "current-only" | "none";

const BASE = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;
// Cut-out lines on a filled shape take the colour behind the current tab.
const CUT = "var(--color-vellum)";

/* 1. Line: the icons from the last round, thin and even. */
const LINE: Record<NavName, ReactNode> = {
  week: <><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  upload: <><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" /><path d="M4.5 14v3a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-3" /></>,
  progress: <><path d="M4 20h16" /><path d="M7 16v-4M12 16V7M17 16v-6" /></>,
  settings: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
};

/* 2. Solid when current: the same shapes, filled on the current tab only. */
const SOLID_ON: Record<NavName, ReactNode> = {
  week: <><rect x="3.5" y="5" width="17" height="15" rx="3" fill="currentColor" /><path d="M8 3v4M16 3v4" /><path d="M7.5 11h9M7.5 15h5" stroke={CUT} /></>,
  upload: <><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="currentColor" /><path d="M12 16V8M8.5 11.5 12 8l3.5 3.5" stroke={CUT} /></>,
  progress: <><rect x="4.5" y="12" width="3.2" height="8" rx="1" fill="currentColor" /><rect x="10.4" y="4.5" width="3.2" height="15.5" rx="1" fill="currentColor" /><rect x="16.3" y="8.5" width="3.2" height="11.5" rx="1" fill="currentColor" /></>,
  settings: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2.6" fill="currentColor" /><circle cx="9" cy="17" r="2.6" fill="currentColor" /></>,
};
const SOLID_OFF: Record<NavName, ReactNode> = {
  week: <><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M8 3v4M16 3v4M7.5 11h9M7.5 15h5" /></>,
  upload: <><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><path d="M12 16V8M8.5 11.5 12 8l3.5 3.5" /></>,
  progress: <><rect x="4.5" y="12" width="3.2" height="8" rx="1" /><rect x="10.4" y="4.5" width="3.2" height="15.5" rx="1" /><rect x="16.3" y="8.5" width="3.2" height="11.5" rx="1" /></>,
  settings: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2.6" /><circle cx="9" cy="17" r="2.6" /></>,
};

/* 3. New pictures: each icon shows what the page is for. A checklist, a screenshot being added, a score line going up, a gear. */
const FRESH: Record<NavName, ReactNode> = {
  week: <><path d="m4 6.5 1.5 1.5L8.5 5M4 12.5 5.5 14l3-3M4 18.5 5.5 20l3-3" /><path d="M12 6.5h8M12 12.5h8M12 18.5h5" /></>,
  upload: <><rect x="3" y="4" width="14" height="12" rx="2.5" /><path d="m3.5 13.5 3.5-3.5 3 3 2-2 4.5 4.5" /><circle cx="12.5" cy="7.8" r="1" /><path d="M19.5 15v6M16.5 18h6" /></>,
  progress: <><path d="M3.5 17.5 9 12l3.5 3.5 8-8" /><path d="M15.5 7.5h5v5" /></>,
  settings: <><path d="M10.3 3.5h3.4l.6 2.3 2 1.2 2.3-.7 1.7 3-1.7 1.6v2.2l1.7 1.6-1.7 3-2.3-.7-2 1.2-.6 2.3h-3.4l-.6-2.3-2-1.2-2.3.7-1.7-3 1.7-1.6v-2.2L3.7 9.3l1.7-3 2.3.7 2-1.2.6-2.3Z" /><circle cx="12" cy="12" r="2.8" /></>,
};

/* 4. Duotone: rounder, slightly heavier shapes with a soft tinted fill. */
const DUO: Record<NavName, ReactNode> = {
  week: <><rect x="3.5" y="4.5" width="17" height="16" rx="4" fill="currentColor" fillOpacity="0.14" /><path d="M3.5 9.5h17M8 2.8v3.4M16 2.8v3.4" /><circle cx="8.5" cy="14" r=".6" fill="currentColor" /><circle cx="12" cy="14" r=".6" fill="currentColor" /><circle cx="15.5" cy="14" r=".6" fill="currentColor" /></>,
  upload: <><path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5a4.5 4.5 0 0 1-.5 9H7Z" fill="currentColor" fillOpacity="0.14" /><path d="M12 16v-5.5M9.5 13 12 10.5l2.5 2.5" /></>,
  progress: <><circle cx="12" cy="12" r="8.5" fill="currentColor" fillOpacity="0.14" /><path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" /><circle cx="12" cy="12" r="3.5" /><path d="M12 12 17 7" /></>,
  settings: <><path d="M10.3 3.5h3.4l.6 2.3 2 1.2 2.3-.7 1.7 3-1.7 1.6v2.2l1.7 1.6-1.7 3-2.3-.7-2 1.2-.6 2.3h-3.4l-.6-2.3-2-1.2-2.3.7-1.7-3 1.7-1.6v-2.2L3.7 9.3l1.7-3 2.3.7 2-1.2.6-2.3Z" fill="currentColor" fillOpacity="0.14" /><circle cx="12" cy="12" r="2.8" /></>,
};

/* 5. Hairline: the fewest strokes that still read. A square with one rule, a bare arrow, one rising line, two rules with a stop each. */
const HAIR: Record<NavName, ReactNode> = {
  week: <><rect x="4.5" y="5.5" width="15" height="14" rx="2.5" /><path d="M4.5 10h15" /></>,
  upload: <path d="M12 18.5V6M7 11l5-5 5 5" />,
  progress: <path d="M4.5 17.5 10 12l3 3 6.5-6.5" />,
  settings: <><path d="M4.5 8.5h2.9M10.6 8.5h8.9M4.5 15.5h8.9M16.6 15.5h2.9" /><circle cx="9" cy="8.5" r="1.6" /><circle cx="15" cy="15.5" r="1.6" /></>,
};

export const ICON_SETS: { set: IconSet; name: string }[] = [
  { set: "line", name: "Line (last round)" },
  { set: "hairline", name: "Hairline" },
  { set: "current-only", name: "Icon on current tab" },
  { set: "none", name: "Words only" },
];

export function NavGlyph({ set, name, on, className = "size-4.5" }: { set: IconSet; name: NavName; on: boolean; className?: string }) {
  const paths = set === "hairline" || set === "current-only" || set === "none" ? HAIR[name] : set === "line" ? LINE[name] : set === "solid" ? (on ? SOLID_ON : SOLID_OFF)[name] : set === "fresh" ? FRESH[name] : DUO[name];
  const width = set === "duotone" ? 1.8 : set === "line" || set === "solid" || set === "fresh" ? 1.6 : 1.4;
  return <svg aria-hidden {...BASE} strokeWidth={width} className={className}>{paths}</svg>;
}
