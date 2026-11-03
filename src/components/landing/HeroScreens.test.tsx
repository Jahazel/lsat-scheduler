// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HeroScreens } from "./HeroScreens";

let reduced = false;

beforeEach(() => {
  reduced = false;
  window.matchMedia = ((query: string) => ({ matches: reduced && query.includes("reduce") })) as typeof window.matchMedia;
});
afterEach(cleanup);

const tab = (name: string) => screen.getByRole("tab", { name });
const selected = () => screen.getAllByRole("tab").filter((t) => t.getAttribute("aria-selected") === "true").map((t) => t.textContent);
const shownScreen = () => screen.getAllByRole("img").map((img) => img.getAttribute("alt"));
const pill = () => screen.getByTestId("hero-tab-pill");
const panel = (name: string) => document.getElementById(tab(name).getAttribute("aria-controls")!)!;

describe("HeroScreens", () => {
  it("starts on This week with one panel per tab", () => {
    render(<HeroScreens />);
    expect(screen.getByRole("tablist", { name: "Inside the app" })).toBeTruthy();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["This week", "Progress"]);
    expect(selected()).toEqual(["This week"]);
    expect(screen.getByRole("tabpanel", { name: "This week" }).getAttribute("aria-labelledby")).toBe(tab("This week").id);
    expect(panel("Progress").getAttribute("role")).toBe("tabpanel");
    expect(shownScreen()).toEqual(["This week screen: Saturday and Sunday drills with check boxes"]);
  });

  it("switches screens with a click", () => {
    render(<HeroScreens />);
    fireEvent.click(tab("Progress"));
    expect(selected()).toEqual(["Progress"]);
    expect(screen.getByRole("tabpanel", { name: "Progress" })).toBeTruthy();
    expect(shownScreen()).toEqual(["Progress screen: past weekly schedules by month, each with a done count"]);
    fireEvent.click(tab("This week"));
    expect(selected()).toEqual(["This week"]);
  });

  it("moves and selects with the arrow keys, Home and End, and keeps one tab in the Tab order", () => {
    render(<HeroScreens />);
    tab("This week").focus();

    fireEvent.keyDown(tab("This week"), { key: "ArrowRight" });
    expect(selected()).toEqual(["Progress"]);
    expect(document.activeElement).toBe(tab("Progress"));
    expect(screen.getAllByRole("tab").map((t) => t.tabIndex)).toEqual([-1, 0]);

    fireEvent.keyDown(tab("Progress"), { key: "ArrowRight" });
    expect(selected()).toEqual(["This week"]);
    fireEvent.keyDown(tab("This week"), { key: "ArrowLeft" });
    expect(selected()).toEqual(["Progress"]);
    fireEvent.keyDown(tab("Progress"), { key: "Home" });
    expect(selected()).toEqual(["This week"]);
    expect(document.activeElement).toBe(tab("This week"));
    fireEvent.keyDown(tab("This week"), { key: "End" });
    expect(selected()).toEqual(["Progress"]);
    expect(document.activeElement).toBe(tab("Progress"));

    fireEvent.keyDown(tab("Progress"), { key: "Enter" });
    expect(selected()).toEqual(["Progress"]);
  });

  it("slides the pill and crossfades the screens at the base duration", () => {
    render(<HeroScreens />);
    fireEvent.click(tab("Progress"));
    expect(pill().style.transition).toBe("clip-path var(--duration-base) var(--ease-in-out-strong)");
    expect(panel("Progress").style.transition).toContain("opacity var(--duration-base) var(--ease-out-strong)");
    expect(panel("This week").style.transition).toContain("opacity var(--duration-base) var(--ease-out-strong)");
  });

  it("under reduced motion moves the pill at once and keeps a short fade", () => {
    reduced = true;
    render(<HeroScreens />);
    fireEvent.click(tab("Progress"));
    expect(selected()).toEqual(["Progress"]);
    expect(pill().style.transition).toBe("none");
    expect(panel("Progress").style.transition).toContain("opacity var(--duration-fast) var(--ease-out-strong)");
    expect(panel("This week").style.transition).toContain("opacity var(--duration-fast) var(--ease-out-strong)");
  });
});
