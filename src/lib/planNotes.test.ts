import { describe, expect, it } from "vitest";
import { freeWeekEndingNote, hidesUploadReminder, planProblemNote } from "./planNotes";
import { planStatus, type BillingRecord } from "./planStatus";

const PRICES = { weeklyCents: 1000, monthlyCents: 2999 };
const FREE_WEEK_ENDS = new Date("2026-11-23T06:00:00.000Z");
const inFreeWeek: BillingRecord = {
  plan: "weekly", stripeStatus: "trialing", freeWeekEndsAt: FREE_WEEK_ENDS, paidPeriodEndsAt: FREE_WEEK_ENDS,
  firstChargeSucceeded: false, renewalFailedAt: null, cancelAtPeriodEnd: false,
};

function noteAt(iso: string, record: BillingRecord = inFreeWeek, nextWeekSaved = false) {
  const now = new Date(iso);
  return freeWeekEndingNote(planStatus("student", record, now), record, now, nextWeekSaved, PRICES);
}

describe("freeWeekEndingNote", () => {
  it("stays hidden until the free week's Friday starts in the schedule time zone", () => {
    expect(noteAt("2026-11-19T12:00:00.000Z")).toBeNull();
    expect(noteAt("2026-11-20T05:59:00.000Z")).toBeNull();
  });

  it("names the plan and its first charge from Friday to Saturday", () => {
    const note = { lead: "Your free week ends Sunday.", rest: "Your Weekly plan starts Monday at $10." };
    expect(noteAt("2026-11-20T06:00:00.000Z")).toEqual(note);
    expect(noteAt("2026-11-22T05:59:00.000Z")).toEqual(note);
  });

  it("says today and tomorrow on the free week's Sunday", () => {
    expect(noteAt("2026-11-22T06:00:00.000Z")).toEqual({
      lead: "Your free week ends today.", rest: "Your Weekly plan starts tomorrow at $10.",
    });
  });

  it("uses the Monthly amount from the prices", () => {
    expect(noteAt("2026-11-21T18:00:00.000Z", { ...inFreeWeek, plan: "monthly" })?.rest)
      .toBe("Your Monthly plan starts Monday at $29.99.");
  });

  it("says when next week's saved schedule appears", () => {
    expect(noteAt("2026-11-21T18:00:00.000Z", inFreeWeek, true)?.rest)
      .toBe("Your Weekly plan starts Monday at $10. Your plan for next week appears then.");
  });

  it("promises no charge after a cancel, saved schedule or not", () => {
    const cancelled = { ...inFreeWeek, cancelAtPeriodEnd: true };
    const note = { lead: "Your free week ends Sunday.", rest: "You won't be charged." };
    expect(noteAt("2026-11-20T18:00:00.000Z", cancelled)).toEqual(note);
    expect(noteAt("2026-11-20T18:00:00.000Z", cancelled, true)).toEqual(note);
    expect(noteAt("2026-11-22T18:00:00.000Z", cancelled)).toEqual({ lead: "Your free week ends today.", rest: "You won't be charged." });
  });

  it("is gone once the free week ends, and never shows outside a free week", () => {
    expect(noteAt("2026-11-23T06:00:00.000Z")).toBeNull();
    const now = new Date("2026-11-21T18:00:00.000Z");
    expect(freeWeekEndingNote({ kind: "admin" }, inFreeWeek, now, false, PRICES)).toBeNull();
    expect(freeWeekEndingNote({ kind: "paid", plan: "weekly" }, inFreeWeek, now, false, PRICES)).toBeNull();
  });
});

describe("planProblemNote", () => {
  const paid: BillingRecord = {
    ...inFreeWeek, stripeStatus: "active", firstChargeSucceeded: true, paidPeriodEndsAt: new Date("2026-12-28T06:00:00.000Z"),
  };
  const noteAt = (record: BillingRecord, iso: string) => planProblemNote(planStatus("student", record, new Date(iso)));

  it("asks a retrying student to update their card by a deadline that stays on one line", () => {
    const failing = { ...paid, stripeStatus: "past_due" as const, renewalFailedAt: new Date("2026-12-28T07:00:00.000Z") };
    expect(noteAt(failing, "2026-12-30T18:00:00.000Z")).toEqual({
      lead: "Your last payment didn't go through.",
      rest: "Update your card by Mon,\u00a0Jan\u00a04 to keep your plan.",
      action: "update_card",
    });
  });

  it("tells a student whose first charge failed that their payment didn't go through", () => {
    expect(noteAt({ ...inFreeWeek, stripeStatus: "past_due" }, "2026-11-23T18:00:00.000Z")).toEqual({
      lead: "Your payment didn't go through.", rest: "Pick a plan to get new weekly schedules.", action: "pick_plan",
    });
  });

  it("tells a student who cancelled that their plan has ended, after a free week or a paid period", () => {
    const ended = { lead: "Your plan has ended.", rest: "Pick a plan to get new weekly schedules.", action: "pick_plan" };
    expect(noteAt({ ...inFreeWeek, stripeStatus: "canceled", cancelAtPeriodEnd: true }, "2026-11-23T18:00:00.000Z")).toEqual(ended);
    expect(noteAt({ ...paid, stripeStatus: "canceled", cancelAtPeriodEnd: true }, "2026-12-29T18:00:00.000Z")).toEqual(ended);
  });

  it("shows no note to admins, paid students, free week students, or a student with no plan", () => {
    const now = "2026-11-21T18:00:00.000Z";
    expect(planProblemNote(planStatus("admin", { ...inFreeWeek, stripeStatus: "past_due" }, new Date(now)))).toBeNull();
    expect(noteAt(paid, now)).toBeNull();
    expect(noteAt(inFreeWeek, now)).toBeNull();
    expect(planProblemNote(planStatus("student", null, new Date(now)))).toBeNull();
  });
});

describe("hidesUploadReminder", () => {
  it("hides the Plan next week reminder from a lapsed student", () => {
    const failed = { ...inFreeWeek, stripeStatus: "past_due" as const };
    const saturday = new Date("2026-11-28T18:00:00.000Z");
    expect(hidesUploadReminder(planStatus("student", failed, saturday), failed, saturday)).toBe(true);
  });


  it("hides the Plan next week reminder on a cancelled free week's last weekend only", () => {
    const cancelled = { ...inFreeWeek, cancelAtPeriodEnd: true };
    const hides = (record: BillingRecord, iso: string) => hidesUploadReminder(planStatus("student", record, new Date(iso)), record, new Date(iso));
    expect(hides(cancelled, "2026-11-21T18:00:00.000Z")).toBe(true);
    expect(hides(cancelled, "2026-11-14T18:00:00.000Z")).toBe(false);
    expect(hides(inFreeWeek, "2026-11-21T18:00:00.000Z")).toBe(false);
    expect(hides({ ...cancelled, firstChargeSucceeded: true, stripeStatus: "active", paidPeriodEndsAt: new Date("2026-11-30T06:00:00.000Z") }, "2026-11-28T18:00:00.000Z")).toBe(false);
  });
});
