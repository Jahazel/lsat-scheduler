export type FrameSize = "desktop" | "tablet" | "mobile";
export const WIDTHS: Record<FrameSize, number> = { desktop: 1440, tablet: 768, mobile: 390 };
export const HEIGHTS: Record<FrameSize, number> = { desktop: 900, tablet: 1024, mobile: 844 };

export const VARIANT_NAMES: string[] = [];

export type ScreenPage = "landing" | "login" | "signup";
export const PAGES: Record<ScreenPage, string> = { landing: "Landing", login: "Log in", signup: "Sign up" };

export type View = { size: FrameSize; page: ScreenPage; reducedMotion: boolean; variant: number };

type Param = string | string[] | undefined;
const one = (value: Param) => (Array.isArray(value) ? value[0] : value);

export function readVariant(value: Param) {
  const index = Number(one(value)) - 1;
  return Number.isInteger(index) && index >= 0 && index < VARIANT_NAMES.length ? index : 0;
}

export function readView(params: Record<string, Param>): View {
  const size = one(params.size);
  const page = one(params.page);
  return {
    size: size === "tablet" || size === "mobile" ? size : "desktop",
    page: page === "login" || page === "signup" ? page : "landing",
    reducedMotion: one(params.rm) === "1",
    variant: readVariant(params.v),
  };
}

export function screenQuery(view: View) {
  return new URLSearchParams({ page: view.page, rm: view.reducedMotion ? "1" : "0", v: String(view.variant + 1) }).toString();
}
