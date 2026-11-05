// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fadeIn, fadeOut, riseFrom, slideFrom } from "./motion";

const animate = vi.fn<(keyframes: Keyframe[], options: KeyframeAnimationOptions) => Animation>(() => ({}) as Animation);
let reduced = false;

beforeEach(() => {
  animate.mockClear();
  reduced = false;
  const tokens = document.documentElement.style;
  tokens.setProperty("--duration-fast", "120ms");
  tokens.setProperty("--duration-base", ".2s");
  tokens.setProperty("--ease-standard", "cubic-bezier(0.2, 0, 0, 1)");
  tokens.setProperty("--ease-exit", "cubic-bezier(0.4, 0, 1, 1)");
  Element.prototype.animate = animate as unknown as Element["animate"];
  Element.prototype.getAnimations = () => [];
  window.matchMedia = ((query: string) => ({ matches: reduced && query.includes("reduce") })) as typeof window.matchMedia;
});

describe("page motion", () => {
  it("fades out with the fast duration and exit easing, sliding sideways and marking the content busy", () => {
    const el = document.createElement("div");
    fadeOut(el, { x: 8 });
    expect(el.getAttribute("aria-busy")).toBe("true");
    expect(animate.mock.calls[0]).toEqual([
      [expect.anything(), { opacity: 0, transform: "translateX(-8px)" }],
      { duration: 120, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
    ]);
  });

  it("fades in with the base duration and standard easing from a rise or a slide", () => {
    const el = document.createElement("div");
    el.setAttribute("aria-busy", "true");
    fadeIn(el, riseFrom(4));
    fadeIn(el, slideFrom(-8));
    expect(el.hasAttribute("aria-busy")).toBe(false);
    const timing = { duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" };
    expect(animate.mock.calls[0]).toEqual([[{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], timing]);
    expect(animate.mock.calls[1]).toEqual([[{ opacity: 0, transform: "translateX(-8px)" }, { opacity: 1, transform: "none" }], timing]);
  });

  it("only fades in, over the fast duration, under reduced motion", () => {
    reduced = true;
    fadeIn(document.createElement("div"), riseFrom(8));
    expect(animate.mock.calls[0]).toEqual([[{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: "cubic-bezier(0.2, 0, 0, 1)" }]);
  });

  it.each([
    { opacity: "0.5", to: 0, duration: 60 },
    { opacity: "0.5", to: 1, duration: 0 },
    { opacity: "1", to: 1, duration: 0 },
    { opacity: "0.2", to: 0.5, duration: 0 },
  ])("shortens a fade out from opacity $opacity to $to into $duration ms", ({ opacity, to, duration }) => {
    const el = document.createElement("div");
    el.style.opacity = opacity;
    fadeOut(el, { to, shorten: true });
    expect(animate.mock.calls[0][1]).toMatchObject({ duration });
  });
});
