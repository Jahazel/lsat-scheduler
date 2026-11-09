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
import { RouterContext } from "next/dist/shared/lib/router-context.shared-runtime";
import type { NextRouter } from "next/router";
import LandingPage from "./page";

const HEADLINE = "Your practice results, turned into next week's plan";

beforeEach(() => {
  window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  window.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
  window.ResizeObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
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

  it("walks through How it works as one ordered list of four steps, with a progress button for each", () => {
    render(<LandingPage />);
    const how = screen.getByRole("region", { name: "How it works" });
    const [steps] = within(how).getAllByRole("list");
    expect(within(how).getAllByRole("list")).toHaveLength(1);
    expect(within(steps).getAllByRole("heading", { level: 3 }).map((title) => title.textContent)).toEqual([
      "1 Tell us about your prep",
      "2 Upload your practice analytics",
      "3 Get your week",
      "4 Repeat every weekend",
    ]);
    expect(within(how).getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
      "Go to step 1: Tell us about your prep",
      "Go to step 2: Upload your practice analytics",
      "Go to step 3: Get your week",
      "Go to step 4: Repeat every weekend",
    ]);
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

  it("reads the FAQ and Pricing section names once, from their labels", () => {
    render(<LandingPage />);
    for (const name of ["Pricing", "FAQ"]) {
      const section = screen.getByRole("region", { name });
      const read = within(section).getAllByText(name).filter((element) => !isInaccessible(element));
      expect(read).toEqual([within(section).getByRole("heading", { level: 2, name })]);
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

  it("answers the nine questions in order, all closed, opening one at a time", () => {
    render(<LandingPage />);
    const questions = screen.getByRole("region", { name: "FAQ" });
    const buttons = within(questions).getAllByRole("button");
    const rows = [
      ["How is the study schedule made?", "false"],
      ["Does this replace a tutor or a course?", "false"],
      ["Will this raise my score?", "false"],
      ["Is the plan only for students at a certain score level?", "false"],
      ["Which test prep programs is DrillMap compatible with?", "false"],
      ["Can I cancel?", "false"],
      ["Do I need a card to start?", "false"],
      ["What happens after the free week?", "false"],
      ["Is the plan made by AI?", "false"],
    ];
    expect(buttons).toHaveLength(rows.length);
    rows.forEach(([name, expanded], index) => {
      expect(within(questions).getByRole("button", { name })).toBe(buttons[index]);
      expect(buttons[index].getAttribute("aria-expanded")).toBe(expanded);
    });
    expect(isInaccessible(within(questions).getByText("Any time. You keep access until your paid week or month ends. No refunds for any unused time."))).toBe(true);

    const tutorSecondParagraph =
      "DrillMap gives you the kind of weekly structure a tutor would. It reads your results, finds your weakest question types, and builds a plan so every hour of practice counts. Your course or books still teach the concepts. DrillMap makes sure you're drilling the right ones.";
    const answers = [
      ["How is the study schedule made?", "Fixed rules built from the former 7Sage tutor's tutoring method use your individual analytics to make the most personalized study schedule on the market."],
      ["Does this replace a tutor or a course?", "No, it works alongside them. Most self-guided students know they should study but not what to focus on, so they default to taking practice test after practice test."],
      ["Which test prep programs is DrillMap compatible with?", "7Sage today, with more sites coming soon! DrillMap is independent and simply reads the analytics 7Sage already shows you."],
      ["Can I cancel?", "Any time. You keep access until your paid week or month ends. No refunds for any unused time."],
      ["Do I need a card to start?", "No. Your first full week is free. You pick Weekly ($7.99) or Monthly ($25) only when it ends."],
      ["What happens after the free week?", "Pick Weekly ($7.99) or Monthly ($25) to keep getting weekly schedules."],
      ["Is the plan made by AI?", "No. Fixed rules built from the tutor's coaching method make the plan. AI only reads your screenshots, and you check what it read."],
    ];
    const shown = (text: string) => !isInaccessible(within(questions).getByText(text));
    for (const [question, answer] of answers) {
      const opened = within(questions).getByRole("button", { name: question });
      fireEvent.click(opened);
      expect(buttons.map((b) => b.getAttribute("aria-expanded") === "true")).toEqual(buttons.map((b) => b === opened));
      expect(answers.filter(([, text]) => shown(text)).map(([, text]) => text)).toEqual([answer]);
      expect(shown(tutorSecondParagraph)).toBe(question === "Does this replace a tutor or a course?");
    }
  });

  it("closes with the ask and two signposts back to Pricing and How it works", () => {
    render(<LandingPage />);
    const closing = screen.getByRole("region", { name: "Start" });
    expect(within(closing).getByRole("link", { name: "Start free week" }).getAttribute("href")).toBe("/signup");
    expect(within(closing).getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/login");
    expect(within(closing).getByText("Your first full week free. No card needed.")).toBeTruthy();

    const signposts = within(closing).getAllByRole("heading", { level: 3 });
    expect(signposts.map((title) => title.textContent)).toEqual(["See what you'll pay", "See how it works"]);
    expect(within(closing).getByText("Weekly ($7.99) or Monthly ($25). Pick one when your free week ends.")).toBeTruthy();
    expect(within(closing).getByText("Four steps. The last one repeats every weekend.")).toBeTruthy();

    const pricing = within(closing).getByRole("link", { name: "Pricing" });
    const how = within(closing).getByRole("link", { name: "How it works" });
    expect(pricing.getAttribute("href")).toBe("#pricing");
    expect(how.getAttribute("href")).toBe("#how-it-works");
    expect(document.getElementById("pricing")).toBe(screen.getByRole("region", { name: "Pricing" }));
    expect(document.getElementById("how-it-works")).toBe(screen.getByRole("region", { name: "How it works" }));
  });

  it("sends the signpost links through the site router, not the browser", () => {
    const push = vi.fn();
    render(
      <RouterContext.Provider value={{ push, prefetch: () => Promise.resolve(), pathname: "/", asPath: "/" } as unknown as NextRouter}>
        <LandingPage />
      </RouterContext.Provider>,
    );
    const closing = screen.getByRole("region", { name: "Start" });
    for (const [name, hash] of [["Pricing", "#pricing"], ["How it works", "#how-it-works"]]) {
      push.mockClear();
      const defaultPrevented = !fireEvent.click(within(closing).getByRole("link", { name }));
      expect(defaultPrevented).toBe(true);
      expect(push).toHaveBeenCalledWith(`/${hash}`, expect.anything());
    }
  });

  it("reads the Pricing signpost's prices from the prices module", () => {
    prices.PLAN_PRICES = { weeklyCents: 1299, monthlyCents: 3999 };
    render(<LandingPage />);
    const closing = screen.getByRole("region", { name: "Start" });
    expect(within(closing).getByText("Weekly ($12.99) or Monthly ($39.99). Pick one when your free week ends.")).toBeTruthy();
  });

  it("reads the card answer's prices from the prices module", () => {
    prices.PLAN_PRICES = { weeklyCents: 1299, monthlyCents: 3999 };
    render(<LandingPage />);
    const questions = screen.getByRole("region", { name: "FAQ" });
    expect(within(questions).getByText("No. Your first full week is free. You pick Weekly ($12.99) or Monthly ($39.99) only when it ends.")).toBeTruthy();
  });
});
