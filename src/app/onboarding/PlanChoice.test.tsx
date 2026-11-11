// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FailureToastProvider } from "@/components/FailureNotice";
import { planChoiceOffer, type PlanName } from "@/lib/planChoice";
import type { Answer, FailureCode } from "@/lib/unexpectedFailure";
import PlanChoice from "./PlanChoice";

vi.mock("next/navigation", () => ({ usePathname: () => "/onboarding" }));

const PRICES = { weeklyCents: 1000, monthlyCents: 2999 };
const WEDNESDAY = new Date("2026-11-11T15:00:00Z");
const FREE_WEEK_ENDS = new Date("2026-11-23T06:00:00Z");
const CHECKOUT_URL = "https://checkout.stripe.com/c/pay/cs_test_1";

const assign = vi.fn();
beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.stubGlobal("location", { ...window.location, assign });
});
afterEach(() => {
  cleanup();
  assign.mockReset();
  vi.unstubAllGlobals();
});

function renderPlanChoice({
  freeWeekEndsAt = FREE_WEEK_ENDS as Date | null,
  prices = PRICES,
  cameBackWithoutCard = false,
  initialPlan = "weekly" as PlanName,
  openCheckout = vi.fn(async (): Promise<Answer<{ checkoutUrl: string }>> => ({ checkoutUrl: CHECKOUT_URL })),
} = {}) {
  render(
    <PlanChoice
      offer={planChoiceOffer(prices, freeWeekEndsAt, WEDNESDAY)}
      cameBackWithoutCard={cameBackWithoutCard}
      initialPlan={initialPlan}
      openCheckout={openCheckout}
    />,
    { wrapper: FailureToastProvider },
  );
  return { user: userEvent.setup(), openCheckout };
}

const facts = () => Object.fromEntries(
  Array.from(document.querySelectorAll("dl > div"), (row) => [row.querySelector("dt")?.textContent, row.querySelector("dd")?.textContent]),
);
const card = (name: string) => screen.getByRole("radio", { name: new RegExp(name) });

it("shows both plans with prices, the free week end, the first charge, and the renewal terms, with Weekly picked", () => {
  renderPlanChoice();

  expect(screen.getByText("Step 5 of 5 · Plan")).toBeDefined();
  expect(screen.getByRole("heading", { level: 1, name: "Pick your plan" })).toBeDefined();
  expect(screen.getByText(/Your free week runs until/).textContent).toBe("Your free week runs until Sunday, Nov 22. You pay nothing before then.");
  expect((card("Weekly") as HTMLInputElement).checked).toBe(true);
  expect(within(card("Weekly").closest("label")!).getByText("$10")).toBeDefined();
  expect(within(card("Monthly").closest("label")!).getByText("$29.99")).toBeDefined();
  expect(within(card("Monthly").closest("label")!).getByText("about 31% less")).toBeDefined();
  expect(facts()).toEqual({ "Today": "$0", "Free week ends": "Sun, Nov 22", "First charge": "Mon, Nov 23 · $10" });
  expect(screen.getByText("Cancel anytime. You keep access until your paid week or month ends. No refunds for unused time.")).toBeDefined();
  expect(screen.getByText("By continuing, you agree your plan renews each week until you cancel.")).toBeDefined();
  expect(screen.getByRole("button", { name: "Add card on Stripe" })).toBeDefined();
});

it("changes the first charge, the agreement line, and the Stripe preview when Monthly is picked", async () => {
  const { user } = renderPlanChoice();

  await user.click(card("Monthly"));

  expect(facts()["First charge"]).toBe("Mon, Nov 23 · $29.99");
  expect(screen.getByText("By continuing, you agree your plan renews each month until you cancel.")).toBeDefined();
  const preview = within(screen.getByRole("complementary", { name: "What happens next" }));
  expect(preview.getByText("DrillMap Monthly")).toBeDefined();
  expect(preview.getByText("Free until Sun, Nov 22")).toBeDefined();
  expect(preview.getByText("Then $29.99 a month starting Mon, Nov 23")).toBeDefined();
});

it("says the plan starts today, with today's charge and the renewal date, for an email that already had a free week", async () => {
  const { user } = renderPlanChoice({ freeWeekEndsAt: null });

  expect(screen.getByText("Your plan starts today. This email already had a free week.")).toBeDefined();
  expect(facts()).toEqual({ "Today": "$10", "Renews": "Wed, Nov 18" });
  await user.click(card("Monthly"));
  expect(facts()).toEqual({ "Today": "$29.99", "Renews": "Fri, Dec 11" });
  expect(screen.getByText("Then $29.99 a month starting Fri, Dec 11")).toBeDefined();
});

it("shows no saving line when Monthly saves less than 1%", () => {
  renderPlanChoice({ prices: { weeklyCents: 1000, monthlyCents: 4500 } });

  expect(screen.queryByText(/% less/)).toBeNull();
});

it("tells a student back from Stripe without a card to pick a plan, keeping the plan they picked", () => {
  renderPlanChoice({ cameBackWithoutCard: true, initialPlan: "monthly" });

  const note = within(screen.getByRole("region", { name: "Checkout" }));
  expect(note.getByText("You didn’t add a card.")).toBeDefined();
  expect(note.getByText("Pick a plan to continue.")).toBeDefined();
  expect((card("Monthly") as HTMLInputElement).checked).toBe(true);
});

it("opens Stripe Checkout for the picked plan, with the button waiting as Opening Stripe…", async () => {
  let answer: (value: { checkoutUrl: string }) => void = () => {};
  const openCheckout = vi.fn(() => new Promise<{ checkoutUrl: string }>((resolve) => { answer = resolve; }));
  const { user } = renderPlanChoice({ openCheckout });

  await user.click(card("Monthly"));
  await user.click(screen.getByRole("button", { name: "Add card on Stripe" }));

  expect(openCheckout).toHaveBeenCalledWith("monthly");
  const waiting = screen.getByRole("button", { name: "Opening Stripe…" });
  expect(waiting.getAttribute("aria-disabled")).toBe("true");
  await user.click(waiting);
  expect(openCheckout).toHaveBeenCalledTimes(1);
  answer({ checkoutUrl: CHECKOUT_URL });
  await vi.waitFor(() => expect(assign).toHaveBeenCalledWith(CHECKOUT_URL));
});

it("shows the failure toast and keeps the picked plan when the server cannot start Checkout", async () => {
  const openCheckout = vi.fn(async () => ({ unexpectedFailure: "7f3a91c2" as FailureCode }));
  const { user } = renderPlanChoice({ openCheckout });

  await user.click(card("Monthly"));
  await user.click(screen.getByRole("button", { name: "Add card on Stripe" }));

  expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong. Try again.Error code 7f3a91c2");
  expect(screen.getByRole("button", { name: "Add card on Stripe" })).toBeDefined();
  expect((card("Monthly") as HTMLInputElement).checked).toBe(true);
  expect(assign).not.toHaveBeenCalled();
});
