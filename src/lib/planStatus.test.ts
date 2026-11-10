import { describe, expect, it } from "vitest";
import { freeWeekEnd, isHeldWeek, mayStartWeeklyUpload, planStatus, type BillingRecord, type PlanStatus } from "./planStatus";

const at = (iso: string) => new Date(iso);
const FREE_WEEK_ENDS = at("2026-11-23T06:00:00.000Z");

const inFreeWeek: BillingRecord = {
  plan: "weekly", stripeStatus: "trialing", freeWeekEndsAt: FREE_WEEK_ENDS,
  paidPeriodEndsAt: FREE_WEEK_ENDS, firstChargeSucceeded: false, renewalFailedAt: null, cancelAtPeriodEnd: false,
};
const paid: BillingRecord = {
  ...inFreeWeek, stripeStatus: "active", firstChargeSucceeded: true, paidPeriodEndsAt: at("2026-11-30T06:00:00.000Z"),
};

describe("free week end", () => {
  it.each([
    ["Monday", "2026-11-09T15:00:00.000Z", "2026-11-16T06:00:00.000Z", 7],
    ["Tuesday", "2026-11-10T15:00:00.000Z", "2026-11-23T06:00:00.000Z", 13],
    ["Wednesday", "2026-11-11T15:00:00.000Z", "2026-11-23T06:00:00.000Z", 12],
    ["Thursday", "2026-11-12T15:00:00.000Z", "2026-11-23T06:00:00.000Z", 11],
    ["Friday", "2026-11-13T15:00:00.000Z", "2026-11-23T06:00:00.000Z", 10],
    ["Saturday", "2026-11-14T15:00:00.000Z", "2026-11-23T06:00:00.000Z", 9],
    ["Sunday", "2026-11-15T15:00:00.000Z", "2026-11-23T06:00:00.000Z", 8],
  ])("onboarding on a %s ends the free week at the end of the Sunday that closes the first full week", (_day, finished, ends, days) => {
    const end = freeWeekEnd(at(finished));
    expect(end.toISOString()).toBe(ends);
    const firstDay = Date.parse(`${finished.slice(0, 10)}T00:00:00.000Z`);
    const lastDay = Date.parse(`${end.toISOString().slice(0, 10)}T00:00:00.000Z`);
    expect((lastDay - firstDay) / 86_400_000).toBe(days);
  });

  it("uses the schedule time zone: late Sunday night in Chicago is still Sunday", () => {
    expect(freeWeekEnd(at("2026-11-16T05:30:00.000Z")).toISOString()).toBe("2026-11-23T06:00:00.000Z");
  });

  it("ends at Chicago midnight across a daylight saving change", () => {
    expect(freeWeekEnd(at("2026-10-28T15:00:00.000Z")).toISOString()).toBe("2026-11-09T06:00:00.000Z");
    expect(freeWeekEnd(at("2027-03-03T15:00:00.000Z")).toISOString()).toBe("2027-03-15T05:00:00.000Z");
  });
});

describe("plan status", () => {
  it("gives no plan without a billing record", () => {
    expect(planStatus("student", null, at("2026-11-12T00:00:00.000Z"))).toEqual({ kind: "no_plan" });
  });

  it("gives the free week until its Sunday ends, with the student's plan", () => {
    expect(planStatus("student", inFreeWeek, at("2026-11-23T05:59:59.000Z")))
      .toEqual({ kind: "free_week", plan: "weekly", endsAt: FREE_WEEK_ENDS });
  });

  it("keeps a student who cancels in the free week until it ends, then lapses them", () => {
    const cancelled = { ...inFreeWeek, stripeStatus: "canceled" as const };
    expect(planStatus("student", cancelled, at("2026-11-20T12:00:00.000Z")).kind).toBe("free_week");
    expect(planStatus("student", cancelled, FREE_WEEK_ENDS)).toEqual({ kind: "lapsed" });
  });

  it("lapses a student at once when the first charge fails", () => {
    const failed = { ...inFreeWeek, stripeStatus: "past_due" as const };
    expect(planStatus("student", failed, at("2026-11-23T07:00:00.000Z"))).toEqual({ kind: "lapsed" });
  });

  it("does not lapse a student after the free week while the first charge is still being made", () => {
    const charging = { ...inFreeWeek, stripeStatus: "active" as const };
    expect(planStatus("student", charging, at("2026-11-23T06:30:00.000Z"))).toEqual({ kind: "paid", plan: "weekly" });
  });

  it("gives paid once the first charge succeeds", () => {
    expect(planStatus("student", paid, at("2026-11-25T12:00:00.000Z"))).toEqual({ kind: "paid", plan: "weekly" });
  });

  it("starts a plan for a reused email with no free week: no plan until the payment succeeds, then paid", () => {
    const reused = { ...paid, freeWeekEndsAt: null };
    expect(planStatus("student", { ...reused, stripeStatus: "incomplete", firstChargeSucceeded: false }, at("2026-11-12T00:00:00.000Z")))
      .toEqual({ kind: "no_plan" });
    expect(planStatus("student", reused, at("2026-11-12T00:00:00.000Z"))).toEqual({ kind: "paid", plan: "weekly" });
  });

  it("gives retrying for 7 days after a failed renewal, then lapsed", () => {
    const failed = { ...paid, stripeStatus: "past_due" as const, renewalFailedAt: at("2026-11-30T07:00:00.000Z") };
    expect(planStatus("student", failed, at("2026-12-07T06:59:59.000Z")))
      .toEqual({ kind: "retrying", plan: "weekly", lapsesAt: at("2026-12-07T07:00:00.000Z") });
    expect(planStatus("student", failed, at("2026-12-07T07:00:00.000Z"))).toEqual({ kind: "lapsed" });
  });

  it("gives paid again once Stripe's retry of a failed renewal succeeds", () => {
    const recovered = { ...paid, stripeStatus: "active" as const, renewalFailedAt: at("2026-11-30T07:00:00.000Z") };
    expect(planStatus("student", recovered, at("2026-12-10T00:00:00.000Z"))).toEqual({ kind: "paid", plan: "weekly" });
  });

  it("keeps a paid student who cancels until the paid period ends", () => {
    const cancelled = { ...paid, stripeStatus: "canceled" as const };
    expect(planStatus("student", cancelled, at("2026-11-29T12:00:00.000Z")).kind).toBe("paid");
    expect(planStatus("student", cancelled, at("2026-11-30T06:00:00.000Z"))).toEqual({ kind: "lapsed" });
  });

  it("reports the new plan after a plan switch and keeps the student paid", () => {
    expect(planStatus("student", { ...paid, plan: "monthly" }, at("2026-12-01T00:00:00.000Z"))).toEqual({ kind: "paid", plan: "monthly" });
  });

  it("gives admin to an admin, with or without a billing record", () => {
    expect(planStatus("admin", null, at("2026-11-12T00:00:00.000Z"))).toEqual({ kind: "admin" });
    expect(planStatus("admin", { ...paid, stripeStatus: "canceled" }, at("2027-06-01T00:00:00.000Z"))).toEqual({ kind: "admin" });
  });

  it("allows the weekly upload in the free week, paid, retrying, and admin, and refuses no plan and lapsed", () => {
    const statuses: PlanStatus[] = [
      { kind: "free_week", plan: "weekly", endsAt: FREE_WEEK_ENDS },
      { kind: "paid", plan: "monthly" },
      { kind: "retrying", plan: "weekly", lapsesAt: FREE_WEEK_ENDS },
      { kind: "admin" },
      { kind: "no_plan" },
      { kind: "lapsed" },
    ];
    expect(statuses.map(mayStartWeeklyUpload)).toEqual([true, true, true, true, false, false]);
  });
});

describe("held weekly schedule", () => {
  it("holds only the week after the free week, until the first charge succeeds", () => {
    expect(isHeldWeek(inFreeWeek, "2026-11-23")).toBe(true);
    expect(isHeldWeek({ ...inFreeWeek, stripeStatus: "past_due" }, "2026-11-23")).toBe(true);
    expect(isHeldWeek(inFreeWeek, "2026-11-16")).toBe(false);
    expect(isHeldWeek(inFreeWeek, "2026-11-30")).toBe(false);
    expect(isHeldWeek(paid, "2026-11-23")).toBe(false);
  });

  it("holds nothing without a free week or a billing record", () => {
    expect(isHeldWeek({ ...paid, freeWeekEndsAt: null, firstChargeSucceeded: false }, "2026-11-23")).toBe(false);
    expect(isHeldWeek(null, "2026-11-23")).toBe(false);
  });
});
