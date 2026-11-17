export type FrameSize = "desktop" | "tablet" | "mobile";
export const WIDTHS: Record<FrameSize, number> = { desktop: 1440, tablet: 768, mobile: 390 };
export const HEIGHTS: Record<FrameSize, number> = { desktop: 900, tablet: 1024, mobile: 844 };

export type DataSet = "demo" | "one" | "none" | "many" | "worst" | "same";
export const DATA_SETS: Record<DataSet, string> = { demo: "5 students", one: "1 student", none: "No students", many: "60 students", worst: "Worst case names", same: "All on one plan" };

export type Page = "students" | "detail" | "lab" | "side";
export const PAGES: Record<Page, string> = { students: "Students", detail: "Student detail", lab: "Schedule lab", side: "Student side" };

export type Who = "data" | "noname" | "long";
export const WHOS: Record<Who, string> = { data: "Jordan Reyes", noname: "No name", long: "Long name and email" };


export type Load = "off" | "hold";
export const LOADS: Record<Load, string> = { off: "Loaded", hold: "Loading" };

export type DetailTab = "week" | "weeks" | "progress" | "settings";
export const DETAIL_TABS: Record<DetailTab, string> = { week: "This week", weeks: "Past weeks", progress: "Progress", settings: "Settings & tests" };

export type View = {
  size: FrameSize;
  reducedMotion: boolean;
  v: number;
  data: DataSet;
  page: Page;
  who: Who;
  load: Load;
  tab: DetailTab;
  lab: string;
  walk: boolean;
};

type Param = string | string[] | undefined;
const one = (value: Param) => (Array.isArray(value) ? value[0] : value);
const pick = <K extends string>(options: Record<K, unknown>, value: string | undefined, fallback: K): K =>
  value !== undefined && Object.hasOwn(options, value) ? (value as K) : fallback;

export function readView(params: Record<string, Param>): View {
  return {
    size: pick(WIDTHS, one(params.size), "desktop"),
    reducedMotion: one(params.rm) === "1",
    v: Math.max(1, parseInt(one(params.v) ?? "1", 10) || 1),
    data: pick(DATA_SETS, one(params.data), "demo"),
    page: pick(PAGES, one(params.page), "students"),
    who: pick(WHOS, one(params.who), "data"),
    load: pick(LOADS, one(params.load), "off"),
    tab: pick(DETAIL_TABS, one(params.tab), "week"),
    lab: one(params.lab) ?? "",
    walk: one(params.walk) === "1",
  };
}

export function viewQuery(view: View, withSize = true) {
  const query = new URLSearchParams({
    rm: view.reducedMotion ? "1" : "0",
    v: String(view.v),
    data: view.data,
    page: view.page,
    who: view.who,
    load: view.load,
    tab: view.tab,
  });
  if (view.lab) query.set("lab", view.lab);
  if (view.walk) query.set("walk", "1");
  if (withSize) query.set("size", view.size);
  return query.toString();
}
