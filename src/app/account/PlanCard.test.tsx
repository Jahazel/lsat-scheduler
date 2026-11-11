// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { FailureToastProvider } from "@/components/FailureNotice";
import { planCardFacts } from "@/lib/planCard";
import { planStatus, type BillingRecord } from "@/lib/planStatus";
import type { FormState } from "@/lib/unexpectedFailure";

const actions = vi.hoisted(() => ({ openCustomerPortal: vi.fn<() => Promise<FormState>>() }));
vi.mock("./actions", () => actions);
import { PlanCard } from "./PlanCard";

afterEach(() => {
  cleanup();
  actions.openCustomerPortal.mockReset();
});

const at = (iso: string) => new Date(iso);
const PRICES = { weeklyCents: 1000, monthlyCents: 2999 };
const FREE_WEEK_ENDS = at("2026-11-23T06:00:00.000Z");
const inFreeWeek: BillingRecord = {
  plan: "weekly", stripeStatus: "trialing", freeWeekEndsAt: FREE_WEEK_ENDS, paidPeriodEndsAt: FREE_WEEK_ENDS,
  firstChargeSucceeded: false, renewalFailedAt: null, cancelAtPeriodEnd: false, cancellationReason: null,
};
const paid: BillingRecord = {
  ...inFreeWeek, stripeStatus: "active", firstChargeSucceeded: true, paidPeriodEndsAt: at("2026-11-30T06:00:00.000Z"),
};
const retrying: BillingRecord = { ...paid, stripeStatus: "past_due", renewalFailedAt: at("2026-12-07T15:00:00.000Z") };

function renderCard(record: BillingRecord, now: Date) {
  const facts = planCardFacts(planStatus("student", record, now), record, now, PRICES);
  if (!facts) throw new Error("A student with a plan has a Plan card");
  render(<PlanCard facts={facts} />, { wrapper: FailureToastProvider });
  return screen.getByRole("region", { name: "Plan" });
}

const NBSP = / /g;
const rows = (card: HTMLElement) =>
  within(card).getAllByRole("term").map((term) => [term.textContent, term.nextElementSibling?.textContent?.replace(NBSP, " ")]);

describe("Account Plan card", () => {
  it.each([
    {
      name: "free week", record: inFreeWeek, now: at("2026-11-12T15:00:00.000Z"), chip: "Free week",
      rows: [["Plan", "Weekly · $10 a week"], ["First charge", "Mon, Nov 23"]], sentence: "Free week ends Sun, Nov 22.",
    },
    {
      name: "free week, cancelled", record: { ...inFreeWeek, cancelAtPeriodEnd: true }, now: at("2026-11-12T15:00:00.000Z"),
      chip: "Cancelled", rows: [["Plan", "Weekly · $10 a week"], ["Ends", "Sun, Nov 22"]], sentence: "It won't renew.",
    },
    {
      name: "paid", record: { ...paid, plan: "monthly" as const }, now: at("2026-11-25T15:00:00.000Z"), chip: "Active",
      rows: [["Plan", "Monthly · $29.99 a month"], ["Renews", "Mon, Nov 30"]], sentence: null,
    },
    {
      name: "paid, cancelled", record: { ...paid, cancelAtPeriodEnd: true }, now: at("2026-11-25T15:00:00.000Z"),
      chip: "Cancelled", rows: [["Plan", "Weekly · $10 a week"], ["Ends", "Sun, Nov 29"]], sentence: "It won't renew.",
    },
    {
      name: "paid, ended on Stripe before its period ends", record: { ...paid, stripeStatus: "canceled" as const },
      now: at("2026-11-25T15:00:00.000Z"),
      chip: "Cancelled", rows: [["Plan", "Weekly · $10 a week"], ["Ends", "Sun, Nov 29"]], sentence: "It won't renew.",
    },
    {
      name: "paid, cancelled, with the period just ended while Stripe still says active",
      record: { ...paid, cancelAtPeriodEnd: true, cancellationReason: "cancellation_requested" as const }, now: at("2026-11-30T06:05:00.000Z"),
      chip: "Cancelled", rows: [["Plan", "Weekly · $10 a week"]], sentence: "It won't renew.",
    },
    {
      name: "free week just ended while Stripe still says trialing", record: inFreeWeek, now: at("2026-11-23T06:05:00.000Z"),
      chip: "Active", rows: [["Plan", "Weekly · $10 a week"]], sentence: null,
    },
    {
      name: "retrying", record: retrying, now: at("2026-12-09T15:00:00.000Z"), chip: "Retrying",
      rows: [["Plan", "Weekly · $10 a week"], ["Update card by", "Mon, Dec 14"]], sentence: "Payment failed.",
    },
  ])("shows the $name plan, its next date, and the Customer Portal button", ({ record, now, chip, rows: expected, sentence }) => {
    const card = renderCard(record, now);
    expect(within(card).getByText(chip, { selector: "span" })).toBeTruthy();
    expect(rows(card)).toEqual(expected);
    if (sentence) expect(within(card).getByText(sentence)).toBeTruthy();
    else expect(card.querySelector("p")).toBeNull();
    expect(within(card).getByRole("button", { name: "Manage plan on Stripe" })).toBeTruthy();
    expect(within(card).queryByRole("link")).toBeNull();
  });

  it("shows a lapsed student paused weekly schedules and a link to plan choice, with no Customer Portal", () => {
    const card = renderCard({ ...paid, stripeStatus: "canceled" }, at("2026-12-02T15:00:00.000Z"));
    expect(within(card).getByText("Lapsed", { selector: "span" })).toBeTruthy();
    expect(rows(card)).toEqual([["Plan", "No plan"], ["Weekly schedules", "Paused"]]);
    expect(within(card).getByText("Pick a plan to get new weekly schedules.")).toBeTruthy();
    expect(within(card).getByRole("link", { name: "Pick a plan" }).getAttribute("href")).toBe("/dashboard/upload");
    expect(within(card).queryByRole("button")).toBeNull();
  });

  it("shows a free week cancelled at once in the Stripe Dashboard as cancelled", () => {
    const record = { ...inFreeWeek, stripeStatus: "canceled" as const, cancellationReason: "cancellation_requested" as const };
    const card = renderCard(record, at("2026-11-12T15:00:00.000Z"));
    expect(within(card).getByText("Cancelled", { selector: "span" })).toBeTruthy();
    expect(rows(card)).toEqual([["Plan", "Weekly · $10 a week"], ["Ends", "Sun, Nov 22"]]);
  });

  it("shows a free week cancelled in the Customer Portal as lapsed once it ends, with no past end date", () => {
    const record = { ...inFreeWeek, cancelAtPeriodEnd: true, cancellationReason: "cancellation_requested" as const };
    const card = renderCard(record, at("2026-11-23T06:05:00.000Z"));
    expect(within(card).getByText("Lapsed", { selector: "span" })).toBeTruthy();
    expect(within(card).queryByText(/Nov/)).toBeNull();
  });

  it("is not shown to an admin or to a student who has not picked a plan", () => {
    const now = at("2026-11-25T15:00:00.000Z");
    expect(planCardFacts(planStatus("admin", paid, now), paid, now, PRICES)).toBeNull();
    expect(planCardFacts(planStatus("student", null, now), null, now, PRICES)).toBeNull();
  });

  it("keeps each date on one line", () => {
    const card = renderCard(inFreeWeek, at("2026-11-12T15:00:00.000Z"));
    expect(within(card).getByText("Mon, Nov 23").textContent).toBe("Mon, Nov 23");
    expect(within(card).getByText("Free week ends Sun, Nov 22.").textContent).toBe("Free week ends Sun, Nov 22.");
  });

  it("says Opening Stripe… while the Customer Portal opens, and shows the failure toast when it cannot", async () => {
    let answer: (state: FormState) => void = () => {};
    actions.openCustomerPortal.mockReturnValue(new Promise((resolve) => { answer = resolve; }));
    const card = renderCard(paid, at("2026-11-25T15:00:00.000Z"));
    fireEvent.click(within(card).getByRole("button", { name: "Manage plan on Stripe" }));
    expect((await within(card).findByRole("button", { name: "Opening Stripe…" })).getAttribute("aria-disabled")).toBe("true");
    answer({ unexpectedFailure: "3f9a01c2" } as FormState);
    expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong. Try again.Error code 3f9a01c2");
    expect(within(card).getByRole("button", { name: "Manage plan on Stripe" })).toBeTruthy();
  });
});
