// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fadeIn, fadeOut, riseFrom, slideFrom } from "./motion";

const animate = vi.fn(() => ({}) as Animation);
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

  it("only fades in, over the fast duration with the standard easing, under reduced motion", () => {
    reduced = true;
    fadeIn(document.createElement("div"), riseFrom(8));
    expect(animate.mock.calls[0]).toEqual([[{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: "cubic-bezier(0.2, 0, 0, 1)" }]);
  });

  describe("a shortened fade-out from the current frame", () => {
    const durationFrom = (opacity: string, to: number) => {
      const el = document.createElement("div");
      el.style.opacity = opacity;
      fadeOut(el, { to, shorten: true });
      return (animate.mock.calls.at(-1) as unknown as [Keyframe[], KeyframeAnimationOptions])[1].duration;
    };

    it("takes the share of the fast duration that is left", () => {
      expect(durationFrom("1", 0)).toBe(120);
      expect(durationFrom("0.5", 0)).toBe(60);
      expect(durationFrom("0.7", 0.4)).toBeCloseTo(60);
    });

    it("takes no time when it is already at its end, even fading to full opacity", () => {
      expect(durationFrom("1", 1)).toBe(0);
      expect(durationFrom("0.4", 0.4)).toBe(0);
    });

    it("never takes a negative or endless time when the content is fainter than the end", () => {
      expect(durationFrom("0.5", 1)).toBe(120);
      expect(durationFrom("0.2", 0.4)).toBeCloseTo(40);
      expect(durationFrom("1", 1.5)).toBe(120);
    });
  });
});
