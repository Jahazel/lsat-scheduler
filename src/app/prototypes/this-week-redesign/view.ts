export type FrameSize = "desktop" | "tablet" | "mobile";
export const WIDTHS: Record<FrameSize, number> = { desktop: 1440, tablet: 768, mobile: 390 };
export const HEIGHTS: Record<FrameSize, number> = { desktop: 900, tablet: 1024, mobile: 844 };

export type DataSet = "demo" | "worst" | "busy" | "neartest" | "empty" | "edge" | "near";
export const DATA_SETS: Record<DataSet, string> = { demo: "Demo data", worst: "Worst case", busy: "32 activities", neartest: "Week before the test", empty: "Light week · test day", edge: "One activity · test passed", near: "Test in 4 days · nothing planned" };

export type Today = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export const TODAYS: Record<Today, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

export type WeekState = "normal" | "upload" | "preview" | "held" | "heldpreview";
export const WEEK_STATES: Record<WeekState, string> = { normal: "Normal", upload: "Upload due", preview: "Next-week preview", held: "Held week", heldpreview: "Held next-week preview" };

export type PlanNote = "none" | "ending" | "retrying" | "lapsed";
export const PLAN_NOTES: Record<PlanNote, string> = { none: "No plan note", ending: "Free week ending", retrying: "Payment retrying", lapsed: "Lapsed" };

export type Ticks = "data" | "none" | "today" | "all";
export const TICKS: Record<Ticks, string> = { data: "As in data", none: "None done", today: "Today done", all: "Week done" };

export type Who = "data" | "noname" | "one" | "nonlatin" | "emoji";
export const WHOS: Record<Who, string> = { data: "As in data", noname: "No name", one: "One letter", nonlatin: "Non-Latin", emoji: "Emoji first" };

/* How the student reaches This week. The redirect rows of the brief's flow map start on the page they land on. */
export type Enter = "direct" | "login" | "drill" | "nodrill" | "history" | "noschedule" | "noprofile";
export const ENTERS: Record<Enter, string> = { direct: "Tab or link", login: "From Log in", drill: "Drill link", nodrill: "Drill link, not this week", history: "Old history link", noschedule: "No schedule yet", noprofile: "No profile yet" };

export type Load = "off" | "hold" | "cycle";
export const LOADS: Record<Load, string> = { off: "Loaded", hold: "Loading", cycle: "Arrives after 1.5 s" };

export type View = {
  size: FrameSize;
  reducedMotion: boolean;
  v: number;
  data: DataSet;
  today: Today;
  week: WeekState;
  note: PlanNote;
  admin: boolean;
  load: Load;
  ticks: Ticks;
  who: Who;
  enter: Enter;
  fail: boolean;
};

type Param = string | string[] | undefined;
const one = (value: Param) => (Array.isArray(value) ? value[0] : value);
const pick = <K extends string>(options: Record<K, string>, value: string | undefined, fallback: K): K =>
  value !== undefined && Object.hasOwn(options, value) ? (value as K) : fallback;

// A next-week preview saved in the free week is held until the first charge, as on the live page.
const heldWhenFreeWeekEnds = (week: WeekState, note: PlanNote): WeekState => (week === "preview" && note === "ending" ? "heldpreview" : week);

export function readView(params: Record<string, Param>): View {
  return {
    size: pick(WIDTHS as unknown as Record<FrameSize, string>, one(params.size), "desktop"),
    reducedMotion: one(params.rm) === "1",
    v: Math.max(1, parseInt(one(params.v) ?? "1", 10) || 1),
    data: pick(DATA_SETS, one(params.data), "demo"),
    today: pick(TODAYS, one(params.today), "thu"),
    week: heldWhenFreeWeekEnds(pick(WEEK_STATES, one(params.week), "normal"), pick(PLAN_NOTES, one(params.note), "none")),
    note: pick(PLAN_NOTES, one(params.note), "none"),
    admin: one(params.admin) === "1",
    load: pick(LOADS, one(params.load), "off"),
    ticks: pick(TICKS, one(params.ticks), "data"),
    who: pick(WHOS, one(params.who), "data"),
    enter: pick(ENTERS, one(params.enter), "direct"),
    fail: one(params.fail) === "1",
  };
}

export function viewQuery(view: View, withSize = true) {
  const query = new URLSearchParams({
    rm: view.reducedMotion ? "1" : "0",
    v: String(view.v),
    data: view.data,
    today: view.today,
    week: view.week,
    note: view.note,
    admin: view.admin ? "1" : "0",
    load: view.load,
    ticks: view.ticks,
    who: view.who,
    enter: view.enter,
    fail: view.fail ? "1" : "0",
  });
  if (withSize) query.set("size", view.size);
  return query.toString();
}
