// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { generateWeek } from "@/lib/engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "@/lib/mockData";
import { freeWeekEndingNote } from "@/lib/planNotes";
import { planStatus, type BillingRecord } from "@/lib/planStatus";

vi.mock("@/app/dashboard/actions", () => ({ saveActivityCheckIn: vi.fn() }));

import { HeldWeek, PlanNotice } from "./PlanNotes";
import ScheduleCheckInView from "./ScheduleCheckInView";

afterEach(cleanup);

const FREE_WEEK_ENDS = new Date("2026-11-23T06:00:00.000Z");
const inFreeWeek: BillingRecord = {
  plan: "weekly", stripeStatus: "trialing", freeWeekEndsAt: FREE_WEEK_ENDS, paidPeriodEndsAt: FREE_WEEK_ENDS,
  firstChargeSucceeded: false, renewalFailedAt: null, cancelAtPeriodEnd: false,
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

describe("held weekly schedule", () => {
  it("shows the waiting card and no days", () => {
    render(<HeldWeek />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Your week is ready.");
    expect(screen.getByText("It appears when your first payment goes through.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /^Monday/ })).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});
