export type FrameSize = "desktop" | "tablet" | "mobile";
export const WIDTHS: Record<FrameSize, number> = { desktop: 1440, tablet: 768, mobile: 390 };
export const HEIGHTS: Record<FrameSize, number> = { desktop: 900, tablet: 1024, mobile: 844 };

export type Scene = "prototype" | "today";
export const SCENES: Record<Scene, string> = { prototype: "Prototype", today: "Today's onboarding" };

export type PlanState = "first" | "had" | "nocard";
export const PLAN_STATES: Record<PlanState, string> = { first: "Free week", had: "Had a free week", nocard: "No card added" };

export type DataSet = "demo" | "worst" | "empty";
export const DATA_SETS: Record<DataSet, string> = { demo: "Demo data", worst: "Worst case", empty: "Empty" };

export type RevealState = "drills" | "skipped" | "admin";
export const REVEALS: Record<RevealState, string> = { drills: "With drills", skipped: "Skipped analytics", admin: "Admin" };

export type SaveOutcome = "saves" | "fails" | "refused";
export const SAVE_OUTCOMES: Record<SaveOutcome, string> = { saves: "Save works", fails: "Save fails once", refused: "Save refused" };

export type ReadOutcome = "reads" | "cannot" | "timeout" | "refused";
export const READ_OUTCOMES: Record<ReadOutcome, string> = { reads: "Read works", cannot: "Can't read", timeout: "Read times out", refused: "Read refused" };

export type NameCase = "data" | "none" | "one" | "nonlatin";
export const NAME_CASES: Record<NameCase, string> = { data: "Name from data", none: "No name", one: "One letter", nonlatin: "Non-Latin" };

export type Page = "onboarding" | "signup" | "login" | "stripe" | "thisweek";
export const PAGES: Record<Page, string> = { onboarding: "Onboarding", signup: "Sign-up", login: "Log in", stripe: "Stripe", thisweek: "This week" };

export type View = {
  size: FrameSize;
  scene: Scene;
  reducedMotion: boolean;
  v: number;
  data: DataSet;
  step: number;
  reveal: RevealState;
  plan: PlanState;
  save: SaveOutcome;
  read: ReadOutcome;
  scanOff: boolean;
  name: NameCase;
  page: Page;
};

const pick = <K extends string>(options: Record<K, string>, value: string | undefined, fallback: K): K => (value !== undefined && Object.hasOwn(options, value) ? (value as K) : fallback);

export const isScene = (value: unknown): value is Scene => typeof value === "string" && Object.hasOwn(SCENES, value);

type Param = string | string[] | undefined;
const one = (value: Param) => (Array.isArray(value) ? value[0] : value);

export function readView(params: Record<string, Param>): View {
  const size = one(params.size);
  const scene = one(params.scene);
  const reveal = one(params.reveal);
  const plan = one(params.plan);
  return {
    size: size === "tablet" || size === "mobile" ? size : "desktop",
    scene: isScene(scene) ? scene : "prototype",
    reducedMotion: one(params.rm) === "1",
    v: Math.max(1, parseInt(one(params.v) ?? "1", 10) || 1),
    data: one(params.data) === "worst" ? "worst" : one(params.data) === "empty" ? "empty" : "demo",
    step: Math.min(6, Math.max(1, parseInt(one(params.step) ?? "1", 10) || 1)),
    reveal: reveal === "skipped" || reveal === "admin" ? reveal : "drills",
    plan: plan === "had" || plan === "nocard" ? plan : "first",
    save: pick(SAVE_OUTCOMES, one(params.save), "saves"),
    read: pick(READ_OUTCOMES, one(params.read), "reads"),
    scanOff: one(params.scan) === "off",
    name: pick(NAME_CASES, one(params.name), "data"),
    page: pick(PAGES, one(params.page), "onboarding"),
  };
}

export function viewQuery(view: View, withSize = true) {
  const query = new URLSearchParams({
    scene: view.scene,
    rm: view.reducedMotion ? "1" : "0",
    v: String(view.v),
    data: view.data,
    step: String(view.step),
    reveal: view.reveal,
    plan: view.plan,
    save: view.save,
    read: view.read,
    scan: view.scanOff ? "off" : "on",
    name: view.name,
    page: view.page,
  });
  if (withSize) query.set("size", view.size);
  return query.toString();
}
