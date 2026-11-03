// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const prices = vi.hoisted(() => ({ PLAN_PRICES: { weeklyCents: 799, monthlyCents: 2500 } }));
vi.mock("@/lib/planPrices", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/planPrices")>()),
  get PLAN_PRICES() {
    return prices.PLAN_PRICES;
  },
}));
import LandingPage from "./page";

afterEach(() => {
  cleanup();
  prices.PLAN_PRICES = { weeklyCents: 799, monthlyCents: 2500 };
});

describe("Landing page", () => {
  it("leads with the promise and sends every Start free week to signup", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Your LSAT week, planned before Monday" })).toBeTruthy();
    const starts = screen.getAllByRole("link", { name: "Start free week" });
    expect(starts.map((link) => link.getAttribute("href"))).toEqual(["/signup", "/signup", "/signup", "/signup"]);
    expect(screen.getAllByText("Your first full week free. No card needed.")).toHaveLength(4);
    expect(screen.getByRole("heading", { level: 2, name: "Get next week's plan from your own analytics" })).toBeTruthy();
  });

  it("shows the four proof numbers", () => {
    render(<LandingPage />);
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "178Tutor's LSAT score",
      "Stanford LawTutor's law school",
      "200+Students coached",
      "3,000+Hours coached",
    ]);
  });

  it("no longer shows the old sample card", () => {
    render(<LandingPage />);
    expect(screen.queryByText("Build my first plan")).toBeNull();
    expect(screen.queryByRole("region", { name: "Sample weekly study plan" })).toBeNull();
  });

  it("prices both plans in the Pricing section, with the cancel rules", () => {
    render(<LandingPage />);
    const pricing = screen.getByRole("region", { name: "Your first full week is free" });
    expect(pricing.id).toBe("pricing");

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

  it("switches the hero screen between This week and Progress", () => {
    window.matchMedia = (() => ({ matches: false })) as unknown as typeof window.matchMedia;
    render(<LandingPage />);
    const tabs = screen.getByRole("tablist", { name: "Inside the app" });
    expect(screen.getByRole("tabpanel", { name: "This week" })).toBeTruthy();

    fireEvent.click(within(tabs).getByRole("tab", { name: "Progress" }));
    expect(within(tabs).getByRole("tab", { name: "Progress" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel", { name: "Progress" })).toBeTruthy();
    expect(screen.queryByRole("tabpanel", { name: "This week" })).toBeNull();

    fireEvent.keyDown(within(tabs).getByRole("tab", { name: "Progress" }), { key: "Home" });
    expect(screen.getByRole("tabpanel", { name: "This week" })).toBeTruthy();
  });
});
