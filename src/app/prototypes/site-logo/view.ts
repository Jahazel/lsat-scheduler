export type FrameSize = "desktop" | "tablet" | "mobile";
export const WIDTHS: Record<FrameSize, number> = { desktop: 1440, tablet: 768, mobile: 390 };
export const HEIGHTS: Record<FrameSize, number> = { desktop: 900, tablet: 1024, mobile: 844 };

export type Scene = "bars" | "login" | "signup" | "footer" | "icons";
export const SCENES: Record<Scene, string> = { bars: "Top bars", login: "Log in", signup: "Sign up", footer: "Footer", icons: "Icons" };

export type View = { size: FrameSize; scene: Scene; reducedMotion: boolean; worst: boolean };

export const isScene = (value: unknown): value is Scene => typeof value === "string" && Object.hasOwn(SCENES, value);

type Param = string | string[] | undefined;
const one = (value: Param) => (Array.isArray(value) ? value[0] : value);

export function readView(params: Record<string, Param>): View {
  const size = one(params.size);
  const scene = one(params.scene);
  return {
    size: size === "tablet" || size === "mobile" ? size : "desktop",
    scene: isScene(scene) ? scene : "bars",
    reducedMotion: one(params.rm) === "1",
    worst: one(params.data) === "worst",
  };
}

export function viewQuery(view: View, withSize = true) {
  const query = new URLSearchParams({ scene: view.scene, rm: view.reducedMotion ? "1" : "0", data: view.worst ? "worst" : "demo" });
  if (withSize) query.set("size", view.size);
  return query.toString();
}
