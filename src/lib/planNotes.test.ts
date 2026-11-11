import { describe, expect, it } from "vitest";
import { freeWeekEndingNote, hidesUploadReminder } from "./planNotes";
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

describe("hidesUploadReminder", () => {
  it("hides the Plan next week reminder for a cancelled free week only", () => {
    const now = new Date("2026-11-21T18:00:00.000Z");
    const cancelled = { ...inFreeWeek, cancelAtPeriodEnd: true };
    expect(hidesUploadReminder(planStatus("student", cancelled, now), cancelled)).toBe(true);
    expect(hidesUploadReminder(planStatus("student", inFreeWeek, now), inFreeWeek)).toBe(false);
    expect(hidesUploadReminder({ kind: "paid", plan: "weekly" }, cancelled)).toBe(false);
  });
});
