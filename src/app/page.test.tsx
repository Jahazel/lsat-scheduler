// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, isInaccessible, render, screen, within } from "@testing-library/react";

const prices = vi.hoisted(() => ({ PLAN_PRICES: { weeklyCents: 799, monthlyCents: 2500 } }));
vi.mock("@/lib/planPrices", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/planPrices")>()),
  get PLAN_PRICES() {
    return prices.PLAN_PRICES;
  },
}));
import LandingPage from "./page";

const HEADLINE = "Your practice results, turned into next week's plan";

beforeEach(() => {
  window.matchMedia = (() => ({ matches: false })) as unknown as typeof window.matchMedia;
  window.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
});
afterEach(() => {
  cleanup();
  prices.PLAN_PRICES = { weeklyCents: 799, monthlyCents: 2500 };
});

describe("Landing page", () => {
  it("leads with the promise and sends every Start free week to signup", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { level: 1, name: HEADLINE })).toBeTruthy();
    expect(screen.getByText(
      "Upload your analytics every weekend. DrillMap builds Monday to Sunday around the question types you miss most.",
    )).toBeTruthy();
    const starts = screen.getAllByRole("link", { name: "Start free week" });
    expect(starts.map((link) => link.getAttribute("href"))).toEqual(["/signup", "/signup", "/signup", "/signup"]);
    expect(screen.getAllByText("Your first full week free. No card needed.")).toHaveLength(4);
    const closing = screen.getByRole("region", { name: "Start" });
    expect(within(closing).getByText("Get next week's plan from your own analytics")).toBeTruthy();
    expect(within(closing).getByRole("link", { name: "Start free week" }).getAttribute("href")).toBe("/signup");
  });

  it("keeps the hero to the promise, the sample cards and the This week screen", () => {
    render(<LandingPage />);
    const hero = screen.getByRole("region", { name: HEADLINE });
    expect(hero.textContent).not.toMatch(/7Sage|178|Stanford|coached/);
    expect(within(hero).queryByRole("list")).toBeNull();
    expect(within(hero).queryByRole("tablist")).toBeNull();
    expect(within(hero).getByRole("group", { name: "Sample plan cards" })).toBeTruthy();
    const week = within(hero).getByRole("img", { name: "This week screen: your plan for this week, with Monday to Sunday drills" });
    expect(week.getAttribute("src")).toContain("hero-this-week.png");
    expect([week.getAttribute("width"), week.getAttribute("height")]).toEqual(["2880", "3094"]);
  });

  it("places How it works between the hero and Pricing, as the top bar's jump target", () => {
    render(<LandingPage />);
    const regions = screen.getAllByRole("region").map((region) => region.id || region.getAttribute("aria-labelledby"));
    expect(regions).toEqual(["landing-title", "how-it-works", "pricing", "questions-title", "closing-title"]);
  });

  it("opens each section below the hero with a numbered label whose name alone is the heading", () => {
    render(<LandingPage />);
    const labels = screen.getAllByRole("heading", { level: 2 });
    expect(labels.map((label) => label.textContent)).toEqual(["[02]How it works", "[03]Pricing", "[04]FAQ", "[05]Start"]);
    for (const name of ["How it works", "Pricing", "FAQ", "Start"]) {
      const section = screen.getByRole("region", { name });
      expect(within(section).getByRole("heading", { level: 2, name })).toBe(labels.find((label) => section.contains(label)));
    }
  });

  it("no longer shows the old sample card", () => {
    render(<LandingPage />);
    expect(screen.queryByText("Build my first plan")).toBeNull();
    expect(screen.queryByRole("region", { name: "Sample weekly study plan" })).toBeNull();
  });

  it("prices both plans in the Pricing section, with the cancel rules", () => {
    render(<LandingPage />);
    const pricing = screen.getByRole("region", { name: "Pricing" });
    expect(pricing.id).toBe("pricing");
    expect(within(pricing).getByText((_, el) => el?.textContent === "Your first full week is free")).toBeTruthy();
    expect(within(pricing).getByText("Pick a plan when your free week ends. Both plans get the same weekly schedule.")).toBeTruthy();

    const weekly = within(pricing).getByRole("article", { name: "Weekly" });
    expect(within(weekly).getByText("$7.99")).toBeTruthy();
    expect(within(weekly).getByText("a week")).toBeTruthy();
    expect(within(weekly).getByRole("link", { name: "Start free week" }).getAttribute("href")).toBe("/signup");

    const monthly = within(pricing).getByRole("article", { name: "Monthly" });
    expect(within(monthly).getByText("$25")).toBeTruthy();
    expect(within(monthly).getByText("a month")).toBeTruthy();
    expect(within(monthly).getByText("Best value · about 28% less")).toBeTruthy();
    expect(within(monthly).getByText("About $34.60 a month on Weekly. Good for a full prep cycle.")).toBeTruthy();
    expect(within(monthly).getByRole("link", { name: "Start free week" }).getAttribute("href")).toBe("/signup");

    expect(within(pricing).getByText(
      "Cancel anytime. You keep access until your paid week or month ends. No refunds for unused time.",
    )).toBeTruthy();
  });

  it("reads the plan cards from the prices module", () => {
    prices.PLAN_PRICES = { weeklyCents: 1299, monthlyCents: 3999 };
    render(<LandingPage />);
    const weekly = screen.getByRole("article", { name: "Weekly" });
    const monthly = screen.getByRole("article", { name: "Monthly" });
    expect(within(weekly).getByText("$12.99")).toBeTruthy();
    expect(within(monthly).getByText("$39.99")).toBeTruthy();
    expect(within(monthly).getByText("Best value · about 29% less")).toBeTruthy();
    expect(within(monthly).getByText("About $56.30 a month on Weekly. Good for a full prep cycle.")).toBeTruthy();
  });

  it("answers the five questions, with only the card question open", () => {
    render(<LandingPage />);
    const questions = screen.getByRole("region", { name: "FAQ" });
    const buttons = within(questions).getAllByRole("button");
    expect(buttons.map((b) => [b.textContent, b.getAttribute("aria-expanded")])).toEqual([
      ["Do I need a card to start?", "true"],
      ["What happens after the free week?", "false"],
      ["Can I cancel?", "false"],
      ["Do I need 7Sage?", "false"],
      ["Is the plan made by AI?", "false"],
    ]);
    expect(within(questions).getByText("No. Your first full week is free. You pick Weekly ($7.99) or Monthly ($25) only when it ends.")).toBeTruthy();
    expect(isInaccessible(within(questions).getByText("Yes for screenshots. You can also type your numbers by hand."))).toBe(true);

    for (const b of buttons.slice(1)) fireEvent.click(b);
    expect(within(questions).getAllByRole("button").every((b) => b.getAttribute("aria-expanded") === "true")).toBe(true);
    for (const answer of [
      "Pick Weekly ($7.99) or Monthly ($25) to keep getting weekly schedules.",
      "Any time. You keep access until your paid week or month ends. No refunds for unused time.",
      "Yes for screenshots. You can also type your numbers by hand.",
      "No. Fixed rules built from the tutor's coaching method make the plan. AI only reads your screenshots, and you check what it read.",
    ]) {
      expect(isInaccessible(within(questions).getByText(answer))).toBe(false);
    }
  });

  it("reads the card answer's prices from the prices module", () => {
    prices.PLAN_PRICES = { weeklyCents: 1299, monthlyCents: 3999 };
    render(<LandingPage />);
    const questions = screen.getByRole("region", { name: "FAQ" });
    expect(within(questions).getByText("No. Your first full week is free. You pick Weekly ($12.99) or Monthly ($39.99) only when it ends.")).toBeTruthy();
  });
});
