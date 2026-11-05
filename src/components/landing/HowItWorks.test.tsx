// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { act, cleanup, fireEvent, isInaccessible, render, screen, within } from "@testing-library/react";
import { HowItWorks } from "./HowItWorks";

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
  window.scrollY = 0;
  window.matchMedia = ((query: string) => ({ matches: reduced && query.includes("reduce") })) as typeof window.matchMedia;
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
    return box(0, 0);
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
    expect(within(section).getByText("Four steps. The last one repeats every weekend.")).toBeTruthy();
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
    expect(read).toEqual([within(section).getByRole("heading", { level: 2, name: "How it works" })]);
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
});
