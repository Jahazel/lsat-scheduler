// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { generateWeek } from "@/lib/engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "@/lib/mockData";
import { freeWeekEndingNote, hidesUploadReminder, planProblemNote } from "@/lib/planNotes";
import { planStatus, type BillingRecord } from "@/lib/planStatus";

vi.mock("@/app/dashboard/actions", () => ({ saveActivityCheckIn: vi.fn() }));
const accountActions = vi.hoisted(() => ({ openCustomerPortalFromThisWeek: vi.fn(() => new Promise<null>(() => {})) }));
vi.mock("@/app/account/actions", () => accountActions);

import { HeldWeek, PlanNotice, PlanNotices } from "./PlanNotes";
import ScheduleCheckInView from "./ScheduleCheckInView";

afterEach(cleanup);

const FREE_WEEK_ENDS = new Date("2026-11-23T06:00:00.000Z");
const inFreeWeek: BillingRecord = {
  plan: "weekly", stripeStatus: "trialing", freeWeekEndsAt: FREE_WEEK_ENDS, paidPeriodEndsAt: FREE_WEEK_ENDS,
  firstChargeSucceeded: false, renewalFailedAt: null, cancelAtPeriodEnd: false, cancellationReason: null,
};

describe("free week ending note", () => {
  it("sits above Monday as a card titled with its first sentence", () => {
    const friday = new Date("2026-11-20T18:00:00.000Z");
    const note = freeWeekEndingNote(planStatus("student", inFreeWeek, friday), inFreeWeek, friday, false, { weeklyCents: 1000, monthlyCents: 2999 });
    if (!note) throw new Error("The free week's Friday has a note");
    render(<ScheduleCheckInView scheduleId="schedule-1" schedule={generateWeek(mockStudent, mockAnalytics, mockRules, mockStudentName)}
      student={mockStudent} checkIns={[]} notice={<PlanNotice note={note} />} />);

    const notice = screen.getByRole("region", { name: "Your plan" });
    expect(within(notice).getByRole("heading", { level: 2 }).textContent).toBe("Your free week ends Sunday.");
    expect(within(notice).getByText("Your Weekly plan starts Monday at $10.")).toBeTruthy();
    const [first] = screen.getAllByRole("heading", { level: 2 });
    expect(first.textContent).toBe("Your free week ends Sunday.");
    expect(screen.getByRole("heading", { level: 2, name: /^Monday/ })).toBeTruthy();
  });
});

describe("retrying and lapsed notes", () => {
  const paid: BillingRecord = {
    ...inFreeWeek, stripeStatus: "active", firstChargeSucceeded: true, paidPeriodEndsAt: new Date("2026-12-28T06:00:00.000Z"),
  };
  function renderNote(record: BillingRecord, iso: string) {
    const note = planProblemNote(planStatus("student", record, new Date(iso)));
    if (!note) throw new Error("This plan has a problem note");
    render(<PlanNotice note={note} />);
    return screen.getByRole("region", { name: "Your plan" });
  }

  it("shows the retrying note with its card deadline on one line, and Update card opens Stripe with the Ring", async () => {
    const notice = renderNote({ ...paid, stripeStatus: "past_due", renewalFailedAt: new Date("2026-12-28T07:00:00.000Z") }, "2026-12-30T18:00:00.000Z");
    expect(within(notice).getByRole("heading", { level: 2 }).textContent).toBe("Your last payment didn't go through.");
    expect(within(notice).getByText(/^Update your card by/).textContent).toBe("Update your card by Mon,\u00a0Jan\u00a04 to keep your plan.");

    fireEvent.click(within(notice).getByRole("button", { name: "Update card" }));
    expect((await within(notice).findByRole("button", { name: "Opening Stripe…" })).getAttribute("aria-disabled")).toBe("true");
    expect(accountActions.openCustomerPortalFromThisWeek).toHaveBeenCalledOnce();
  });

  it.each([
    ["first charge failed", { ...inFreeWeek, stripeStatus: "past_due" as const }, "2026-11-23T18:00:00.000Z", "Your payment didn't go through."],
    ["plan ended", { ...paid, stripeStatus: "canceled" as const, cancelAtPeriodEnd: true }, "2026-12-29T18:00:00.000Z", "Your plan has ended."],
  ])("shows the lapsed note after a %s, with Pick a plan opening plan choice on the weekly upload page", (_case, record, iso, lead) => {
    const notice = renderNote(record, iso);
    expect(within(notice).getByRole("heading", { level: 2 }).textContent).toBe(lead);
    expect(within(notice).getByText("Pick a plan to get new weekly schedules.")).toBeTruthy();
    expect(within(notice).getByRole("link", { name: "Pick a plan" }).getAttribute("href")).toBe("/dashboard/upload");
    expect(within(notice).queryByRole("button")).toBeNull();
  });

  it("puts the lapsed note above the last weekly schedule's Monday", () => {
    const record = { ...paid, stripeStatus: "canceled" as const, cancelAtPeriodEnd: true };
    const note = planProblemNote(planStatus("student", record, new Date("2026-12-29T18:00:00.000Z")));
    if (!note) throw new Error("A lapsed student has a note");
    render(<ScheduleCheckInView scheduleId="schedule-1" schedule={generateWeek(mockStudent, mockAnalytics, mockRules, mockStudentName)}
      student={mockStudent} checkIns={[]} notice={<PlanNotice note={note} />} />);
    const [first] = screen.getAllByRole("heading", { level: 2 });
    expect(first.textContent).toBe("Your plan has ended.");
    expect(screen.getByRole("heading", { level: 2, name: /^Monday/ })).toBeTruthy();
  });

});

describe("weekend upload card", () => {
  const SATURDAY = new Date("2026-12-26T18:00:00.000Z");
  const paid: BillingRecord = {
    ...inFreeWeek, stripeStatus: "active", firstChargeSucceeded: true, paidPeriodEndsAt: new Date("2027-01-04T06:00:00.000Z"),
  };
  function renderWeekend(record: BillingRecord) {
    const status = planStatus("student", record, SATURDAY);
    const note = planProblemNote(status);
    const uploadDue = !hidesUploadReminder(status, record, SATURDAY);
    render(<ScheduleCheckInView scheduleId="schedule-1" schedule={generateWeek(mockStudent, mockAnalytics, mockRules, mockStudentName)}
      student={mockStudent} checkIns={[]} notice={(note || uploadDue) && <PlanNotices note={note} uploadDue={uploadDue} />} />);
  }

  it("sits above the week with Plan next week opening the weekly upload", () => {
    renderWeekend(paid);
    const card = screen.getByRole("region", { name: "Next week" });
    expect(within(card).getByRole("heading", { level: 2 }).textContent).toBe("Next week starts Monday.");
    expect(within(card).getByText("Add your screenshots to build your weekly schedule.")).toBeTruthy();
    const plan = within(card).getByRole("link", { name: "Plan next week" });
    expect(plan.getAttribute("href")).toBe("/dashboard/upload");
    expect(within(card).queryByRole("button")).toBeNull();
    expect(card.compareDocumentPosition(screen.getByRole("heading", { level: 1 })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("sits under a payment-retrying note, so Update card reads first", () => {
    renderWeekend({ ...paid, stripeStatus: "past_due", renewalFailedAt: new Date("2026-12-25T07:00:00.000Z") });
    const [note, upload] = screen.getAllByRole("region").filter((region) => ["Your plan", "Next week"].includes(region.getAttribute("aria-label")!));
    expect(note!.getAttribute("aria-label")).toBe("Your plan");
    expect(within(note!).getByRole("button", { name: "Update card" })).toBeTruthy();
    expect(within(upload!).getByRole("link", { name: "Plan next week" }).getAttribute("href")).toBe("/dashboard/upload");
  });

  it("hides when the plan has ended", () => {
    renderWeekend({ ...paid, stripeStatus: "canceled", cancelAtPeriodEnd: true, paidPeriodEndsAt: new Date("2026-12-21T06:00:00.000Z") });
    expect(screen.getByRole("region", { name: "Your plan" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Next week" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Plan next week" })).toBeNull();
  });
});

describe("held weekly schedule", () => {
  const MONDAY = "2026-11-23";
  const held = (props: Partial<Parameters<typeof HeldWeek>[0]> = {}) =>
    render(<HeldWeek weekOf={MONDAY} preview={false} problem={null} freeWeekEnding={null} lapsed={false} {...props} />);

  it("shows the title and the waiting card, and no days", () => {
    held();
    expect(screen.getByText("Week of November 23")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Your plan for this week");
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Your week is ready.");
    expect(screen.getByText("It appears when your first payment goes through.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /^Monday/ })).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("shows the lapsed note above the title and the lapsed waiting card", () => {
    const record: BillingRecord = { ...inFreeWeek, stripeStatus: "canceled", cancelAtPeriodEnd: true };
    const now = new Date("2026-11-24T18:00:00.000Z");
    held({ problem: planProblemNote(planStatus("student", record, now)), lapsed: true });
    const headings = screen.getAllByRole("heading").map((heading) => heading.textContent);
    expect(headings).toEqual(["Your plan has ended.", "Your plan for this week", "Your week is saved."]);
    expect(screen.getByText("It appears as soon as you pick a plan.")).toBeTruthy();
  });

  it("reads as next week's plan on a held preview", () => {
    held({ preview: true });
    expect(screen.getByText("Next week · starts Monday, Nov 23")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Your plan for next week");
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Your week is ready.");
  });

  it("drops the waiting card under the free-week-ending note, which says when next week appears", () => {
    const saturday = new Date("2026-11-21T18:00:00.000Z");
    const freeWeekEnding = freeWeekEndingNote(planStatus("student", inFreeWeek, saturday), inFreeWeek, saturday, true, { weeklyCents: 1000, monthlyCents: 2999 });
    held({ preview: true, freeWeekEnding });
    const notice = screen.getByRole("region", { name: "Your plan" });
    expect(within(notice).getByText("Your Weekly plan starts Monday at $10. Your plan for next week appears then.")).toBeTruthy();
    expect(screen.getAllByRole("heading").map((heading) => heading.textContent)).toEqual(["Your free week ends Sunday.", "Your plan for next week"]);
    expect(screen.queryByText("Your week is ready.")).toBeNull();
  });
});
