// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { act, cleanup, fireEvent, isInaccessible, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { HowItWorks } from "./HowItWorks";
import { PIN_MEDIA } from "./HowItWorksPin";

const TITLES = [
  "Tell us about your prep",
  "Upload your practice analytics",
  "Get your week",
  "Repeat every weekend",
];
const TRACK_TOP_IN_PAGE = 1000;
const TRACK_HEIGHT = 2600;
const PIN_HEIGHT = 600;
const PINNED_TOP = 150;

let reduced = false;
let viewport = { width: 1440, height: 900 };
let listTop = 0;
let observers: { callback: IntersectionObserverCallback; targets: Set<Element> }[] = [];

function matchesViewport(query: string) {
  return query.split(",").some((part) =>
    [...part.matchAll(/\(min-(width|height): (\d+)px\)/g)].every(([, side, px]) => viewport[side as "width" | "height"] >= Number(px)),
  );
}

function box(top: number, height: number) {
  return { top, height, bottom: top + height, left: 0, right: 0, width: 0, x: 0, y: top } as DOMRect;
}

function layout() {
  const trackTop = TRACK_TOP_IN_PAGE - window.scrollY;
  const pinTop = Math.min(Math.max(trackTop, PINNED_TOP), trackTop + TRACK_HEIGHT - PIN_HEIGHT);
  return { trackTop, pinTop };
}

beforeEach(() => {
  reduced = false;
  viewport = { width: 1440, height: 900 };
  listTop = 0;
  observers = [];
  window.scrollY = 0;
  window.innerHeight = 900;
  window.matchMedia = ((query: string) => ({
    matches: query.includes("reduce") ? reduced : matchesViewport(query),
  })) as typeof window.matchMedia;
  window.IntersectionObserver = class {
    targets = new Set<Element>();
    constructor(public callback: IntersectionObserverCallback) {
      observers.push(this);
    }
    observe(target: Element) { this.targets.add(target); }
    disconnect() { this.targets.clear(); }
  } as unknown as typeof IntersectionObserver;
  window.ResizeObserver = class {
    constructor(private callback: ResizeObserverCallback) {}
    observe() { this.callback([], this as unknown as ResizeObserver); }
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const { trackTop, pinTop } = layout();
    if (this.getAttribute("data-testid") === "how-track") return box(trackTop, TRACK_HEIGHT);
    if (this.getAttribute("data-testid") === "how-pin") return box(pinTop, PIN_HEIGHT);
    return box(listTop, 600);
  });
  const realStyle = window.getComputedStyle;
  vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
    if (element.getAttribute("data-testid") === "how-pin") return { top: `${PINNED_TOP}px` } as CSSStyleDeclaration;
    return realStyle(element);
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function scrollPageTo(y: number) {
  act(() => {
    window.scrollY = y;
    window.dispatchEvent(new Event("scroll"));
  });
}

function scrollIntoView(element: Element) {
  act(() => {
    for (const observer of [...observers]) {
      if (observer.targets.has(element)) observer.callback([{ target: element, isIntersecting: true } as IntersectionObserverEntry], observer as unknown as IntersectionObserver);
    }
  });
}

const listSteps = () => within(screen.getByRole("list")).getAllByRole("listitem");
const intro = () => screen.getAllByText("Four steps. The last one repeats every weekend.")[0].parentElement!;
const hidden = (element: HTMLElement) => element.dataset.reveal === "waiting";

const progressButtons = () => screen.getAllByRole("button", { name: /^Go to step/ });
const currentStep = () => progressButtons().findIndex((b) => b.getAttribute("aria-current") === "step") + 1;
const stepCount = () => screen.getByText(/^Step \d\d \/ 04$/).textContent;

describe("HowItWorks", () => {
  it("gives the four steps as one ordered list, each with its app screen", () => {
    render(<HowItWorks />);
    const section = screen.getByRole("region", { name: "How it works" });
    expect(section.id).toBe("how-it-works");
    const [list] = within(section).getAllByRole("list");
    expect(within(section).getAllByRole("list")).toHaveLength(1);
    expect(list.tagName).toBe("OL");
    const steps = within(list).getAllByRole("listitem");
    expect(steps.map((step) => within(step).getByRole("heading", { level: 3 }).textContent)).toEqual(
      TITLES.map((title, index) => `${index + 1} ${title}`),
    );
    expect(steps.map((step) => within(step).getAllByRole("img").map((img) => img.getAttribute("src")?.match(/step-[^.&]+/)?.[0]))).toEqual([
      ["step-1-prep", "step-1-prep-phone"],
      ["step-2-check", "step-2-check-phone"],
      ["step-3-week", "step-3-week-phone"],
      ["step-4-repeat", "step-4-repeat-phone"],
    ]);
    expect(within(section).getAllByText("Four steps. The last one repeats every weekend.")).toHaveLength(2);
  });

  it("shows the 2x desktop step screens at their export size", () => {
    render(<HowItWorks />);
    const list = screen.getByRole("list");
    const desktop = within(list).getAllByRole("img").filter((img) => !img.getAttribute("src")?.includes("-phone"));
    expect(desktop.map((img) => [img.getAttribute("width"), img.getAttribute("height")])).toEqual([
      ["1356", "870"],
      ["1356", "870"],
      ["1560", "1000"],
      ["1356", "870"],
    ]);
  });

  it("loads every step screen eagerly, so a scrolled reload never paints a lazy one first", () => {
    render(<HowItWorks />);
    const screens = [...screen.getByRole("region", { name: "How it works" }).querySelectorAll("img")];
    expect(screens).toHaveLength(12);
    expect(screens.every((img) => img.getAttribute("loading") === "eager")).toBe(true);
  });

  it("downloads each step screen only at the widths that show it", () => {
    render(<HowItWorks />);
    const blankWhen = (img: Element) => {
      const source = img.closest("picture")?.querySelector("source");
      expect(source?.getAttribute("srcset")).toMatch(/^data:image\//);
      return source?.getAttribute("media");
    };
    const listScreens = within(screen.getByRole("list")).getAllByRole("img");
    const phone = listScreens.filter((img) => img.getAttribute("src")?.includes("-phone"));
    const desktop = listScreens.filter((img) => !img.getAttribute("src")?.includes("-phone"));
    const pin = [...screen.getByTestId("how-pin").querySelectorAll("img")];
    expect(phone.map(blankWhen)).toEqual(Array(4).fill("(min-width: 768px)"));
    expect([...desktop, ...pin].map(blankWhen)).toEqual(Array(8).fill("not all and (min-width: 768px)"));
    expect(desktop.map((img) => img.getAttribute("srcset"))).toEqual(pin.map((img) => img.getAttribute("srcset")));
    expect(desktop.map((img) => img.getAttribute("sizes"))).toEqual(pin.map((img) => img.getAttribute("sizes")));
  });

  it("reads the section name once, from its label", () => {
    render(<HowItWorks />);
    const section = screen.getByRole("region", { name: "How it works" });
    const read = within(section).getAllByText("How it works").filter((element) => !isInaccessible(element));
    expect(read).toHaveLength(1);
    expect(within(section).getByRole("heading", { level: 2, name: "How it works" }).contains(read[0])).toBe(true);
  });

  it("hides the swapping step copy and screens from screen readers", () => {
    render(<HowItWorks />);
    const pinTitles = screen.getAllByText((_, element) => element?.tagName === "P" && TITLES.includes(element.textContent ?? ""));
    expect(pinTitles).toHaveLength(4);
    for (const title of pinTitles) expect(isInaccessible(title)).toBe(true);
    expect(isInaccessible(screen.getByText(/^Step 01 \/ 04$/))).toBe(true);
  });

  it("names a progress button for each step", () => {
    render(<HowItWorks />);
    expect(progressButtons().map((b) => b.getAttribute("aria-label"))).toEqual(
      TITLES.map((title, index) => `Go to step ${index + 1}: ${title}`),
    );
    expect(currentStep()).toBe(1);
  });

  it("follows the scroll through the steps in quarters, and back", () => {
    render(<HowItWorks />);
    const runPerStep = (TRACK_HEIGHT - PIN_HEIGHT) / 4;
    const pinnedAt = TRACK_TOP_IN_PAGE - PINNED_TOP;

    scrollPageTo(pinnedAt + runPerStep * 0.5);
    expect([currentStep(), stepCount()]).toEqual([1, "Step 01 / 04"]);
    scrollPageTo(pinnedAt + runPerStep * 2.25);
    expect([currentStep(), stepCount()]).toEqual([3, "Step 03 / 04"]);
    scrollPageTo(pinnedAt + runPerStep * 10);
    expect([currentStep(), stepCount()]).toEqual([4, "Step 04 / 04"]);
    scrollPageTo(pinnedAt + runPerStep * 1.5);
    expect([currentStep(), stepCount()]).toEqual([2, "Step 02 / 04"]);
    scrollPageTo(0);
    expect(currentStep()).toBe(1);
  });

  it("scrolls smoothly to the start of a step when its progress button is pressed", () => {
    render(<HowItWorks />);
    fireEvent.click(progressButtons()[2]);
    const pinnedAt = TRACK_TOP_IN_PAGE - PINNED_TOP;
    expect(window.scrollTo).toHaveBeenCalledWith({ top: pinnedAt + ((TRACK_HEIGHT - PIN_HEIGHT) * 2) / 4 + 2, behavior: "smooth" });
  });

  it("jumps at once with reduced motion, and still swaps the steps", () => {
    reduced = true;
    render(<HowItWorks />);
    fireEvent.click(progressButtons()[1]);
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: "instant" }));
    scrollPageTo(TRACK_TOP_IN_PAGE - PINNED_TOP + (TRACK_HEIGHT - PIN_HEIGHT) * 0.3);
    expect(currentStep()).toBe(2);
  });

  it("puts every step and screen in the server HTML, so they read without JavaScript", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<HowItWorks />);
    const items = container.querySelectorAll("ol > li");
    expect([...items].map((item) => item.querySelector("h3")?.textContent)).toEqual(TITLES.map((title, index) => `${index + 1} ${title}`));
    for (const item of items) expect(item.querySelectorAll("img")).toHaveLength(2);
  });

  it.each([
    ["a desktop window", 1440, 900],
    ["a short desktop window", 1024, 600],
    ["a tall tablet window", 768, 1024],
    ["a tablet window exactly 800 px tall", 768, 800],
  ])("keeps the stacked list shown in %s, where the pin takes over", (_, width, height) => {
    viewport = { width, height };
    listTop = 3000;
    render(<HowItWorks />);
    expect([intro(), ...listSteps()].some(hidden)).toBe(false);
  });

  it.each([
    ["a phone", 390, 844],
    ["a short tablet window", 768, 799],
    ["a window narrower than a tablet", 767, 1200],
  ])("stacks the steps on %s, each revealed as it scrolls into view", (_, width, height) => {
    viewport = { width, height };
    listTop = 3000;
    render(<HowItWorks />);
    const steps = listSteps();
    expect([intro(), ...steps].every(hidden)).toBe(true);
    scrollIntoView(steps[1]);
    expect(steps.map(hidden)).toEqual([true, false, true, true]);
  });

  it("shows the stacked list's first step at once when a How it works link is followed", () => {
    viewport = { width: 390, height: 844 };
    listTop = 3000;
    render(
      <>
        <a href="#how-it-works">How it works</a>
        <HowItWorks />
      </>,
    );
    fireEvent.click(screen.getByRole("link", { name: "How it works" }));
    expect([intro(), ...listSteps()].map(hidden)).toEqual([false, false, true, true, true]);
  });

  it("keeps each step's underlined words to 18 characters, so the underline never wraps", () => {
    render(<HowItWorks />);
    const keys = listSteps().map((step) => within(step).getByRole("heading", { level: 3 }).lastElementChild?.textContent ?? "");
    expect(keys).toEqual(["your prep", "practice analytics", "your week", "every weekend"]);
    expect(keys.every((key) => key.length <= 18)).toBe(true);
  });

  it("pins at the same window sizes in the stylesheet as in the script", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const variant = css.match(/@custom-variant pin \{\s*@media ([^{]+)\{/)?.[1].trim();
    expect(variant?.replaceAll("(scripting: enabled) and ", "")).toBe(PIN_MEDIA);
  });
});
