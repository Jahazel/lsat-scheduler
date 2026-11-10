// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { arriveSections, dim, fadeFormThrough, handOff, motionInside, slideStep } from "./pageMotion";

type Running = { el: Element; options: KeyframeAnimationOptions; finish: () => void };
let running: Running[] = [];
let reduced = false;

beforeEach(() => {
  running = [];
  reduced = false;
  const tokens = document.documentElement.style;
  tokens.setProperty("--duration-fast", "120ms");
  tokens.setProperty("--duration-base", "200ms");
  Element.prototype.animate = function (this: Element, _keyframes: Keyframe[], options: KeyframeAnimationOptions) {
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => { finish = resolve; });
    running.push({ el: this, options, finish });
    return { finished, cancel: () => {} } as unknown as Animation;
  } as Element["animate"];
  Element.prototype.getAnimations = () => [];
  Element.prototype.getClientRects = () => [new DOMRect()] as unknown as DOMRectList;
  window.matchMedia = ((query: string) => ({ matches: reduced && query.includes("reduce") })) as typeof window.matchMedia;
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
    expect(motionInside(root)).toBe(true);
    expect(step.hasAttribute("inert")).toBe(true);
    expect(step.getAttribute("aria-busy")).toBe("true");
    await finishExits();
    expect(update).toHaveBeenCalledOnce();
    expect(motionInside(root)).toBe(false);
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
    expect(motionInside(root)).toBe(false);
  });

  it("runs a second form swap at once instead of fading a form that is already fading", () => {
    page(`<div data-page-swap>Sign up</div>`);
    fadeFormThrough(() => {});
    const second = vi.fn();
    fadeFormThrough(second);
    expect(second).toHaveBeenCalledOnce();
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
});
