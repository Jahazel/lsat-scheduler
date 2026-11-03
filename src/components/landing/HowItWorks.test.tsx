// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Link from "next/link";
import { renderToString } from "react-dom/server";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { HowItWorks } from "./HowItWorks";

let reduced = false;
let observers: { callback: IntersectionObserverCallback; targets: Set<Element> }[] = [];
let screenTops: number[] = [];
const sectionTops: Record<string, number> = { "how-it-works": 900, pricing: 5000 };

beforeEach(() => {
  reduced = false;
  observers = [];
  screenTops = [400, 1400, 2400, 3400];
  window.history.replaceState(null, "", "/");
  window.innerHeight = 800;
  window.matchMedia = ((query: string) => ({ matches: reduced && query.includes("reduce") })) as typeof window.matchMedia;
  window.IntersectionObserver = class {
    targets = new Set<Element>();
    constructor(public callback: IntersectionObserverCallback) {
      observers.push(this);
    }
    observe(target: Element) { this.targets.add(target); }
    unobserve(target: Element) { this.targets.delete(target); }
    disconnect() { this.targets.clear(); }
  } as unknown as typeof IntersectionObserver;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const index = [...document.querySelectorAll("[data-testid='step-screen']")].indexOf(this);
    return { top: index >= 0 ? screenTops[index] : (sectionTops[this.id] ?? 0) } as DOMRect;
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Page() {
  return (
    <>
      <Link href="/#how-it-works">How it works</Link>
      <Link href="/#pricing">Pricing</Link>
      <HowItWorks />
      <section id="pricing" />
    </>
  );
}

const shots = () => screen.getAllByTestId("step-screen");
const hidden = () => shots().map((shot) => shot.style.clipPath.startsWith("inset(100%"));
const wiping = (shot: HTMLElement) => shot.style.transition.includes("var(--duration-reveal)");

function enterView(shot: Element) {
  act(() => {
    for (const o of observers.filter((o) => o.targets.has(shot))) {
      o.callback([{ target: shot, isIntersecting: true } as IntersectionObserverEntry], o as unknown as IntersectionObserver);
    }
  });
}

describe("HowItWorks", () => {
  it("shows the title, lead and four numbered steps, each with its app screen", () => {
    render(<HowItWorks />);
    const section = screen.getByRole("region", { name: "How it works" });
    expect(section.id).toBe("how-it-works");
    expect(within(section).getByText("Four steps. The last one repeats every weekend, so each new plan starts from your latest results.")).toBeTruthy();
    const steps = within(section).getAllByRole("listitem");
    expect(steps.map((step) => within(step).getByRole("heading", { level: 3 }).textContent)).toEqual([
      "1 Tell us about your prep",
      "2 Upload your 7Sage analytics",
      "3 Get your week",
      "4 Repeat every weekend",
    ]);
    expect(steps.map((step) => within(step).getAllByRole("img").map((img) => img.getAttribute("src")?.match(/step-[^.&]+/)?.[0]))).toEqual([
      ["step-1-prep", "step-1-prep-phone"],
      ["step-2-check", "step-2-check-phone"],
      ["step-3-week", "step-3-week-phone"],
      ["step-4-repeat", "step-4-repeat-phone"],
    ]);
    for (const img of within(section).getAllByRole("img")) expect(img.getAttribute("alt")).toMatch(/screen: /);
  });

  it("shows every screen in the server HTML, so they are visible without JavaScript", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<HowItWorks />);
    const shots = container.querySelectorAll<HTMLElement>("[data-testid='step-screen']");
    expect(shots).toHaveLength(4);
    for (const shot of shots) expect(shot.style.clipPath).toBe("");
  });

  it("hides screens below the fold and wipes each one up once when it scrolls into view", () => {
    render(<Page />);
    expect(hidden()).toEqual([false, true, true, true]);
    const [, second] = shots();
    enterView(second);
    expect(hidden()).toEqual([false, false, true, true]);
    expect(wiping(second)).toBe(true);
    expect(second.style.transition).toContain("var(--ease-out-strong)");
    second.style.transition = "";
    enterView(second);
    expect(second.style.transition).toBe("");
  });

  it("shows the screens a top-bar jump passes at once, with no wipe", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("link", { name: "Pricing" }));
    expect(hidden()).toEqual([false, false, false, false]);
    expect(shots().some(wiping)).toBe(false);
    for (const shot of shots()) enterView(shot);
    expect(shots().some(wiping)).toBe(false);
  });

  it("keeps the wipe for screens below a jump's target", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("link", { name: "How it works" }));
    expect(hidden()).toEqual([false, true, true, true]);
  });

  it("plays no wipe for screens above the section the page opened at", () => {
    window.history.replaceState(null, "", "/#pricing");
    render(<Page />);
    expect(hidden()).toEqual([false, false, false, false]);
  });

  it("never hides or wipes a screen with reduced motion", () => {
    reduced = true;
    render(<Page />);
    expect(hidden()).toEqual([false, false, false, false]);
    for (const shot of shots()) enterView(shot);
    expect(shots().some(wiping)).toBe(false);
    expect(observers).toHaveLength(0);
  });
});
