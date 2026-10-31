// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { generateWeek } from "@/lib/engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "@/lib/mockData";
import type { ActivityCheckIn } from "@/lib/types";

const { saveActivityCheckIn } = vi.hoisted(() => ({ saveActivityCheckIn: vi.fn() }));
vi.mock("@/app/dashboard/actions", () => ({ saveActivityCheckIn }));

import { FailureToastProvider } from "./FailureNotice";
import ScheduleCheckInView from "./ScheduleCheckInView";

afterEach(cleanup);
beforeEach(() => {
  saveActivityCheckIn.mockReset();
  saveActivityCheckIn.mockImplementation(async (input: Omit<ActivityCheckIn, "id">) => ({ id: "saved", ...input }));
});

const week = () => generateWeek(mockStudent, mockAnalytics, mockRules, mockStudentName);
const done = (activityId: string): ActivityCheckIn => ({ scheduleId: "schedule-1", activityId, status: "completed" });
const dayCard = (day: string) => screen.getByRole("heading", { level: 2, name: new RegExp(`^${day}`) }).closest("section")!;

describe("ScheduleCheckInView", () => {
  it("checks a line off with one press and clears it with the next", async () => {
    render(<ScheduleCheckInView scheduleId="schedule-1" schedule={week()} student={mockStudent} checkIns={[]} />);
    const row = within(dayCard("Monday")).getByRole("checkbox", { name: "1 Full LR Section" });
    expect(row.getAttribute("aria-checked")).toBe("false");

    await userEvent.click(row);
    expect(row.getAttribute("aria-checked")).toBe("true");
    expect(saveActivityCheckIn).toHaveBeenLastCalledWith({ scheduleId: "schedule-1", activityId: "MONDAY:0", status: "completed" });
    expect(await screen.findByText("17 remaining")).toBeTruthy();
    expect(screen.getByText("1 of 18 done")).toBeTruthy();

    await userEvent.click(row);
    expect(row.getAttribute("aria-checked")).toBe("false");
    expect(saveActivityCheckIn).toHaveBeenLastCalledWith({ scheduleId: "schedule-1", activityId: "MONDAY:0", status: "not_started" });
    expect(await screen.findByText("18 remaining")).toBeTruthy();
  });

  it("undoes a check-off that fails and shows the error code", async () => {
    saveActivityCheckIn.mockResolvedValue({ unexpectedFailure: "3f9a01c2" });
    render(<ScheduleCheckInView scheduleId="schedule-1" schedule={week()} student={mockStudent} checkIns={[]} />, { wrapper: FailureToastProvider });
    const row = within(dayCard("Monday")).getByRole("checkbox", { name: "1 Full LR Section" });

    await userEvent.click(row);
    expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong. Try again.Error code 3f9a01c2");
    expect(row.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("18 remaining")).toBeTruthy();
  });

  it("keeps the error code when another line saves, and closes it when the failed line saves", async () => {
    saveActivityCheckIn.mockResolvedValueOnce({ unexpectedFailure: "3f9a01c2" });
    render(<ScheduleCheckInView scheduleId="schedule-1" schedule={week()} student={mockStudent} checkIns={[]} />, { wrapper: FailureToastProvider });
    const [failed, other] = within(dayCard("Monday")).getAllByRole("checkbox");
    await userEvent.click(failed!);
    const alert = await screen.findByRole("alert");

    await userEvent.click(other!);
    expect(await screen.findByText("1 of 18 done")).toBeTruthy();
    expect(screen.getByRole("alert")).toBe(alert);

    await userEvent.click(failed!);
    expect(await screen.findByText("2 of 18 done")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the last saved state when two quick presses both fail", async () => {
    const replies: ((answer: unknown) => void)[] = [];
    saveActivityCheckIn.mockImplementation(() => new Promise((resolve) => replies.push(resolve)));
    render(<ScheduleCheckInView scheduleId="schedule-1" schedule={week()} student={mockStudent} checkIns={[]} />, { wrapper: FailureToastProvider });
    const row = within(dayCard("Monday")).getByRole("checkbox", { name: "1 Full LR Section" });

    await userEvent.click(row);
    await userEvent.click(row);
    replies[0]({ unexpectedFailure: "3f9a01c2" });
    replies[1]({ unexpectedFailure: "0d2d95eb" });
    expect((await screen.findByRole("alert")).textContent).toContain("Error code 0d2d95eb");
    expect(row.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("0 of 18 done")).toBeTruthy();
  });

  it("shows the last press once it saves, even after earlier presses failed", async () => {
    const replies: ((answer: unknown) => void)[] = [];
    saveActivityCheckIn.mockImplementation((input: Omit<ActivityCheckIn, "id">) =>
      new Promise((resolve) => replies.push((answer) => resolve(answer ?? { id: "saved", ...input }))));
    render(<ScheduleCheckInView scheduleId="schedule-1" schedule={week()} student={mockStudent} checkIns={[]} />, { wrapper: FailureToastProvider });
    const row = within(dayCard("Monday")).getByRole("checkbox", { name: "1 Full LR Section" });

    await userEvent.click(row);
    await userEvent.click(row);
    await userEvent.click(row);
    replies[0]({ unexpectedFailure: "3f9a01c2" });
    replies[1]({ unexpectedFailure: "0d2d95eb" });
    replies[2](undefined);
    expect(await screen.findByText("1 of 18 done")).toBeTruthy();
    expect(row.getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("toggles a focused line with Space or Enter and moves on with Tab", async () => {
    render(<ScheduleCheckInView scheduleId="schedule-1" schedule={week()} student={mockStudent} checkIns={[]} />);
    const [first, second] = within(dayCard("Monday")).getAllByRole("checkbox");
    first!.focus();
    await userEvent.keyboard(" ");
    expect(first!.getAttribute("aria-checked")).toBe("true");
    await userEvent.keyboard("{Enter}");
    expect(first!.getAttribute("aria-checked")).toBe("false");
    await userEvent.tab();
    expect(document.activeElement).toBe(second);
  });

  it("shows each line with only its label: no minutes, no Skip, no actual minutes", () => {
    render(<ScheduleCheckInView scheduleId="schedule-1" schedule={week()} student={mockStudent} checkIns={[]} />);
    const thursday = dayCard("Thursday");
    for (const row of within(thursday).getAllByRole("checkbox")) expect(row.textContent).not.toMatch(/min|planned/);
    expect(screen.queryByText(/skip/i)).toBeNull();
    expect(screen.queryByText(/actual/i)).toBeNull();
    expect(screen.queryByRole("spinbutton")).toBeNull();
    expect(within(thursday).getByText(/^Drilling · .+ of 1 h 30 min$/)).toBeTruthy();
  });

  it("crosses off a done line and ends a finished day with All done", () => {
    render(<ScheduleCheckInView scheduleId="schedule-1" schedule={week()} student={mockStudent}
      checkIns={[done("MONDAY:0"), done("MONDAY:1"), done("TUESDAY:0")]} />);
    expect(within(dayCard("Monday")).getByText("All done")).toBeTruthy();
    expect(within(dayCard("Tuesday")).queryByText("All done")).toBeNull();
    const crossed = within(dayCard("Monday")).getByText("1 Full LR Section");
    expect(crossed.className).toContain("line-through");
  });

  it("shows week notes in the header and never a capacity notice, even on a saved practice-test day", () => {
    const schedule = week();
    schedule.days.SATURDAY.capacityOverageMinutes = 60;
    schedule.reasons = [
      { code: "starred_rotation", placement: { scope: "week" }, sentence: "Weaken sits out this week in the starred rotation." },
      { code: "missed_type_priority", placement: { scope: "week" }, sentence: "Sufficient assumption comes first this week." },
      { code: "capacity_overage", placement: { scope: "day", day: "SATURDAY" }, sentence: "Saved practice-test capacity reason." },
      { code: "rest_day_moved", placement: { scope: "day", day: "WEDNESDAY" }, sentence: "Saved rest move." },
    ];
    render(<ScheduleCheckInView scheduleId="schedule-1" schedule={schedule} student={mockStudent} checkIns={[]} />);
    const header = screen.getByRole("banner");
    expect(within(header).getByText("Weaken sits out this week in the starred rotation.")).toBeTruthy();
    expect(within(header).getByText("Sufficient assumption comes first this week.")).toBeTruthy();
    expect(within(dayCard("Wednesday")).getByText("Saved rest move.")).toBeTruthy();
    expect(screen.queryByText("Saved practice-test capacity reason.")).toBeNull();
    expect(screen.queryByText(/over your/)).toBeNull();
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.queryByRole("link", { name: /daily capacity/i })).toBeNull();
  });

  it("compares done lines with the lines due so far and marks today", () => {
    render(<ScheduleCheckInView scheduleId="schedule-1" schedule={week()} student={mockStudent}
      checkIns={[done("MONDAY:0")]} today="2026-08-25" />);
    expect(screen.getByText("5 behind")).toBeTruthy();
    expect(within(dayCard("Tuesday")).getByText("Today, Aug 25")).toBeTruthy();
    expect(within(dayCard("Monday")).getByText("Aug 24")).toBeTruthy();
  });

  it("shows a read-only plan whose lines ignore clicks, Space, and Enter", async () => {
    render(<ScheduleCheckInView scheduleId="schedule-1" schedule={week()} student={mockStudent}
      checkIns={[done("MONDAY:0")]} readOnly />);
    expect(screen.queryByRole("checkbox")).toBeNull();
    const [doneRow, openRow] = within(dayCard("Monday")).getAllByRole("listitem");
    await userEvent.click(doneRow!);
    await userEvent.click(openRow!);
    await userEvent.tab();
    await userEvent.keyboard(" {Enter}");
    expect(saveActivityCheckIn).not.toHaveBeenCalled();
    expect(doneRow!.textContent).toBe("1 Full LR Section, done");
    expect(openRow!.textContent).toMatch(/, not done$/);
    expect(within(dayCard("Monday")).getByText("1 Full LR Section").className).toContain("line-through");
    expect(screen.getByText("1 of 18 done")).toBeTruthy();
  });

  it("labels rest, unscheduled, and practice-test days", () => {
    const schedule = generateWeek({ ...mockStudent, goalTestDate: "2026-10-01" },
      { ...mockAnalytics, weekOf: "2026-09-21" }, mockRules, mockStudentName);
    schedule.days.MONDAY = { day: "MONDAY", type: "unscheduled", activities: [], totalMinutes: 0 };
    render(<ScheduleCheckInView scheduleId="schedule-1" schedule={schedule} student={mockStudent} checkIns={[]} />);
    expect(within(dayCard("Monday")).getByText("Not scheduled.")).toBeTruthy();
    expect(screen.getAllByText(/^Practice test [12] of 2 · /)).toHaveLength(2);
  });

  it("shows the Plan next week reminder above the plan, linking to the weekly upload, with no way to close it", () => {
    render(<ScheduleCheckInView scheduleId="schedule-1" schedule={week()} student={mockStudent} checkIns={[]} uploadReminder />);
    const reminder = screen.getByRole("complementary", { name: "Reminder" });

    expect(reminder.textContent).toContain("Next week starts Monday. Add your screenshots to build your weekly schedule.");
    expect(within(reminder).getByRole("link", { name: "Plan next week" }).getAttribute("href")).toBe("/dashboard/upload");
    expect(within(reminder).queryByRole("button")).toBeNull();
    expect(reminder.compareDocumentPosition(screen.getByRole("heading", { level: 1 })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows no reminder unless the weekend asks for next week's upload", () => {
    render(<ScheduleCheckInView scheduleId="schedule-1" schedule={week()} student={mockStudent} checkIns={[]} />);

    expect(screen.queryByRole("complementary", { name: "Reminder" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Plan next week" })).toBeNull();
  });
});
