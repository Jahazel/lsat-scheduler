// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { HeroCards } from "./HeroCards";

let reduced = false;
let finePointer = true;
let phone = false;
let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  reduced = false;
  finePointer = true;
  phone = false;
  frames = [];
  window.innerWidth = 1440;
  window.matchMedia = ((query: string) => ({
    matches: query.includes("reduce") ? reduced : query.includes("pointer: fine") ? finePointer : query.includes("min-width: 48rem") ? !phone : false,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
  window.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => frames.push(callback));
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const box = this.textContent?.startsWith("Monday") ? { left: 100, top: 100 } : { left: 2000, top: 2000 };
    return { ...box, width: 200, height: 100, right: box.left + 200, bottom: box.top + 100 } as DOMRect;
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Hero() {
  return (
    <section aria-label="Hero">
      <HeroCards />
    </section>
  );
}

function runFrames(count: number) {
  for (let i = 0; i < count; i++) {
    const pending = frames;
    frames = [];
    act(() => pending.forEach((callback) => callback(0)));
  }
}

const mondayCard = () => screen.getByText("Sufficient assumption").closest("[data-face]") as HTMLElement;

function pointNearMonday(pointerType = "mouse") {
  fireEvent.pointerMove(screen.getByRole("region", { name: "Hero" }), { clientX: 330, clientY: 150, pointerType });
  runFrames(20);
}

describe("HeroCards", () => {
  it("shows the six sample cards in one group named Sample plan cards", () => {
    render(<Hero />);
    const group = screen.getByRole("group", { name: "Sample plan cards" });
    const text = [...group.querySelectorAll("[data-face]")].map((card) => card.textContent);
    expect(text).toEqual([
      "MondaySufficient assumption3 drills · 45 min",
      "PT score158 → 165Goal by the January test",
      "Weaken · 12 questionsDone Tuesday",
      "SaturdayTimed section21 of 35 min",
      "125days to test",
      "Weakest typeFlawMissed 4 of 10 on your last PT",
    ]);
    expect(within(group).queryByText(/7Sage/)).toBeNull();
  });

  it("on scroll moves each card up by 35% of its rise", () => {
    render(<Hero />);
    const cards = [...screen.getByRole("group", { name: "Sample plan cards" }).querySelectorAll<HTMLElement>("[data-card]")];
    expect(cards.map((card) => card.style.getPropertyValue("--scroll-rise"))).toEqual(["-21px", "-38.5px", "-52.5px", "-28px", "-45.5px", "-56px"]);
  });

  it("lets a keyboard reach the phone swipe row, and only below 768 px", () => {
    phone = true;
    render(<Hero />);
    expect(screen.getByRole("group", { name: "Sample plan cards" }).tabIndex).toBe(0);
    cleanup();
    phone = false;
    render(<Hero />);
    expect(screen.getByRole("group", { name: "Sample plan cards" }).hasAttribute("tabindex")).toBe(false);
  });

  it("leans a card toward a nearby mouse pointer and settles back when the pointer leaves", () => {
    render(<Hero />);
    pointNearMonday();
    const pulled = mondayCard().style.transform;
    expect(pulled).toMatch(/^translate\(/);
    expect(pulled).not.toBe("translate(0.00px, 0.00px) rotate(0.00deg) scale(1.0000)");

    fireEvent.pointerLeave(screen.getByRole("region", { name: "Hero" }));
    runFrames(200);
    expect(mondayCard().style.transform).toBe("translate(0.00px, 0.00px) rotate(0.00deg) scale(1.0000)");
  });

  it("leaves cards far from the pointer alone", () => {
    render(<Hero />);
    pointNearMonday();
    const flaw = screen.getByText("Flaw").closest("[data-face]") as HTMLElement;
    expect(flaw.style.transform).toBe("translate(0.00px, 0.00px) rotate(0.00deg) scale(1.0000)");
  });

  it("has no cursor pull on touch screens", () => {
    finePointer = false;
    render(<Hero />);
    pointNearMonday();
    expect(mondayCard().style.transform).toBe("");
  });

  it("ignores a finger drag on a touchscreen laptop", () => {
    render(<Hero />);
    pointNearMonday("touch");
    expect(mondayCard().style.transform).toBe("");
  });

  it("has no cursor pull below 768 px", () => {
    window.innerWidth = 390;
    render(<Hero />);
    pointNearMonday();
    expect(mondayCard().style.transform).toBe("");
  });

  it("keeps the cards still with reduced motion", () => {
    reduced = true;
    render(<Hero />);
    pointNearMonday();
    expect(mondayCard().style.transform).toBe("");
  });
});
