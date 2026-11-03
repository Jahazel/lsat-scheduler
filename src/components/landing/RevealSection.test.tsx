// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { act, cleanup, render, screen } from "@testing-library/react";
import { RevealSection } from "./RevealSection";

let observers: { callback: IntersectionObserverCallback; options?: IntersectionObserverInit; targets: Set<Element> }[] = [];
let sectionTop = 0;

beforeEach(() => {
  observers = [];
  sectionTop = 2000;
  window.innerHeight = 800;
  window.IntersectionObserver = class {
    targets = new Set<Element>();
    constructor(public callback: IntersectionObserverCallback, public options?: IntersectionObserverInit) {
      observers.push(this);
    }
    observe(target: Element) { this.targets.add(target); }
    unobserve(target: Element) { this.targets.delete(target); }
    disconnect() { this.targets.clear(); }
  } as unknown as typeof IntersectionObserver;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(() => ({ top: sectionTop }) as DOMRect);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Section() {
  return (
    <RevealSection threshold={0.25} aria-label="Pricing">
      <p>Plans</p>
    </RevealSection>
  );
}

function scrollIn(isIntersecting: boolean) {
  act(() => {
    for (const observer of [...observers]) {
      const entries = [...observer.targets].map((target) => ({ target, isIntersecting }) as IntersectionObserverEntry);
      if (entries.length) observer.callback(entries, observer as unknown as IntersectionObserver);
    }
  });
}

describe("RevealSection", () => {
  it("renders its content shown when JavaScript has not run", () => {
    const html = renderToString(<Section />);
    expect(html).toContain("Plans");
    expect(html).not.toContain("data-reveal");
  });

  it("waits below the fold, then reveals once when a quarter is in view", () => {
    render(<Section />);
    const section = screen.getByRole("region", { name: "Pricing" });
    expect(section.dataset.reveal).toBe("waiting");
    expect(observers.every((observer) => observer.options?.threshold === 0.25)).toBe(true);

    scrollIn(false);
    expect(section.dataset.reveal).toBe("waiting");

    scrollIn(true);
    expect(section.dataset.reveal).toBe("shown");
    expect(observers.every((observer) => observer.targets.size === 0)).toBe(true);
  });

  it("leaves a section already on screen at load as it is", () => {
    sectionTop = 300;
    render(<Section />);
    expect(screen.getByRole("region", { name: "Pricing" }).dataset.reveal).toBeUndefined();
    expect(observers).toHaveLength(0);
  });
});
