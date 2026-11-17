import { describe, expect, it } from "vitest";
import {
  STRIPE_STATUSES, firstChargeFailed, givesNoWeeklySchedules, mayStillBeStarting, neverPaidForThisPeriod, paidByLateRetry, stripeCannotCancel,
} from "./stripeStatus";

const predicates = { stripeCannotCancel, givesNoWeeklySchedules, neverPaidForThisPeriod, firstChargeFailed, mayStillBeStarting, paidByLateRetry };

describe("what each Stripe status means for a plan", () => {
  it.each([
    ["stripeCannotCancel", ["canceled", "incomplete_expired"]],
    ["givesNoWeeklySchedules", ["unpaid", "canceled", "incomplete_expired", "paused"]],
    ["neverPaidForThisPeriod", ["unpaid", "incomplete", "incomplete_expired", "paused"]],
    ["firstChargeFailed", ["past_due", "unpaid", "canceled", "incomplete_expired", "paused"]],
    ["mayStillBeStarting", ["trialing", "active", "past_due", "incomplete"]],
    ["paidByLateRetry", ["trialing", "active"]],
  ] as const)("%s holds for exactly %j", (name, statuses) => {
    expect(STRIPE_STATUSES.filter(predicates[name])).toEqual(statuses);
  });

  it.each(Object.entries(predicates))("%s holds for no status Stripe has not documented", (_name, predicate) => {
    expect(["", "ended", "constructor", "toString", "__proto__"].some(predicate)).toBe(false);
  });
});
