// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { arriveSections, dim, fadeFormThrough, handOff, riseIn, slideInFromServer, slideOutForServer, slideStep, stayAfterServer, swapsInside } from "./pageMotion";

type Running = { el: Element; keyframes: Keyframe[]; options: KeyframeAnimationOptions; finish: () => void };
let running: Running[] = [];
let reduced = false;
let width = 1280;

beforeEach(() => {
  running = [];
  reduced = false;
  width = 1280;
  const tokens = document.documentElement.style;
  tokens.setProperty("--duration-fast", "120ms");
  tokens.setProperty("--duration-base", "200ms");
  Element.prototype.animate = function (this: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => { finish = resolve; });
    running.push({ el: this, keyframes, options, finish });
    return { finished, cancel: () => {} } as unknown as Animation;
  } as Element["animate"];
  Element.prototype.getAnimations = () => [];
  Element.prototype.getClientRects = () => [new DOMRect()] as unknown as DOMRectList;
  window.matchMedia = ((query: string) => {
    const maxWidth = /max-width: (\d+)px/.exec(query)?.[1];
    return { matches: (reduced && query.includes("reduce")) || (maxWidth !== undefined && width <= Number(maxWidth)) };
  }) as typeof window.matchMedia;
});

afterEach(() => {
  document.body.innerHTML = "";
});

const finishExits = async () => {
  for (const exit of running.filter((a) => a.options.fill === "forwards")) exit.finish();
  await Promise.resolve();
  await Promise.resolve();
};

function page(html: string) {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.append(root);
  return root;
}

describe("page motion", () => {
  it("tells a page that leaves during a step slide that the slide holds part of it, until the slide ends", async () => {
    const root = page(`<div data-page-swap data-page-section><div data-step>Goal</div></div>`);
    const step = root.querySelector<HTMLElement>("[data-step]")!;
    const update = vi.fn();
    slideStep(step, 24, update);
    expect(swapsInside(root).map((swap) => swap.el)).toEqual([step]);
    expect(step.hasAttribute("inert")).toBe(true);
    expect(step.getAttribute("aria-busy")).toBe("true");
    await finishExits();
    expect(update).toHaveBeenCalledOnce();
    expect(swapsInside(root)).toEqual([]);
    expect(step.hasAttribute("inert")).toBe(false);
    expect(step.hasAttribute("aria-busy")).toBe(false);
  });

  it("leaves the sections a sign-in form fade holds to that fade, then swaps the form", async () => {
    const root = page(`<div data-page-swap><section data-page-section>Sign up</section></div><section data-page-section>Footer</section>`);
    const update = vi.fn();
    fadeFormThrough(update);
    arriveSections(root);
    expect(running.filter((a) => a.options.fill === "backwards").map((a) => a.el.textContent)).toEqual(["Footer"]);
    await finishExits();
    expect(update).toHaveBeenCalledOnce();
    expect(swapsInside(root)).toEqual([]);
  });

  it("runs a second form swap at once instead of fading a form that is already fading", () => {
    page(`<div data-page-swap>Sign up</div>`);
    fadeFormThrough(() => {});
    const second = vi.fn();
    fadeFormThrough(second);
    expect(second).toHaveBeenCalledOnce();
  });

  it("rises page regions and page sections the same distance: 4 px up to 767 px wide, 8 px from 768 px", () => {
    const root = page(`<div data-page-fade>Region</div><section data-page-section>Section</section>`);
    const rises = () => running.map((a) => a.keyframes[0].transform);
    for (const [at, y] of [[390, 4], [600, 4], [767, 4], [768, 8]]) {
      width = at;
      running = [];
      riseIn(root.querySelector("[data-page-fade]")!);
      arriveSections(root);
      expect(rises()).toEqual([`translateY(${y}px)`, `translateY(${y}px)`]);
    }
  });

  it("fades a tab's sections in place, together, for 120 ms, with or without reduced motion", () => {
    const root = page(`<section data-page-section>Week</section><section data-page-section>Today</section>`);
    for (const still of [false, true]) {
      reduced = still;
      running = [];
      arriveSections(root, "fade");
      expect(running.map((a) => a.keyframes)).toEqual([[{ opacity: 0 }, { opacity: 1 }], [{ opacity: 0 }, { opacity: 1 }]]);
      expect(running.map((a) => [a.options.duration, a.options.delay ?? 0, a.options.easing])).toEqual([[120, 0, "ease-out"], [120, 0, "ease-out"]]);
    }
  });

  it("keeps the Progress dim interactive, and hands its sections their rise when the next page arrives", () => {
    const area = page(`<section data-page-section>Week</section>`);
    dim(area, { to: 0.5 });
    expect(area.hasAttribute("inert")).toBe(false);
    expect(area.getAttribute("aria-busy")).toBe("true");
    expect(arriveSections(area)).toEqual([]);
    handOff(area, area);
    expect(area.hasAttribute("aria-busy")).toBe(false);
    expect(running.filter((a) => a.options.fill === "backwards").map((a) => a.el.textContent)).toEqual(["Week"]);
  });

  it("slides a screen out 8 px left while the server builds the next one, then slides the next one in from 8 px right", () => {
    const old = page(`<div>Week reveal</div>`);
    slideOutForServer(old, 8);
    expect(old.hasAttribute("inert")).toBe(true);
    expect(running.map((a) => a.keyframes.at(-1))).toEqual([{ opacity: 0, transform: "translateX(-8px)" }]);

    old.remove();
    const next = page(`<div>Plan choice</div>`);
    slideInFromServer(next);
    expect(old.hasAttribute("inert")).toBe(false);
    expect(running.at(-1)!.el).toBe(next);
    expect(running.at(-1)!.keyframes[0]).toEqual({ opacity: 0, transform: "translateX(8px)" });
  });

  it("fades the next screen in, with no slide, under reduced motion", () => {
    reduced = true;
    const old = page(`<div>Week reveal</div>`);
    slideOutForServer(old, 8);
    expect(running).toEqual([]);

    old.remove();
    const next = page(`<div>Plan choice</div>`);
    slideInFromServer(next);
    expect(running.map((a) => a.keyframes)).toEqual([[{ opacity: 0 }, { opacity: 1 }]]);
  });

  it("does not slide in a screen that opens without a slide out, and shows the old screen again when the server keeps it", () => {
    slideInFromServer(page(`<div>Plan choice</div>`));
    expect(running).toEqual([]);

    const old = page(`<div>Week reveal</div>`);
    slideOutForServer(old, 8);
    stayAfterServer(old);
    expect(old.hasAttribute("inert")).toBe(false);
    expect(running.at(-1)!.keyframes.at(-1)).toEqual({ opacity: 1, transform: "none" });
    slideInFromServer(page(`<div>Plan choice</div>`));
    expect(running.at(-1)!.el).toBe(old);
  });
});
