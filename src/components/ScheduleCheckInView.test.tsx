// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { generateWeek } from "@/lib/engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "@/lib/mockData";
import type { ActivityCheckIn } from "@/lib/types";
import type { RoadToTestDay } from "@/lib/roadToTestDay";

const { saveActivityCheckIn } = vi.hoisted(() => ({ saveActivityCheckIn: vi.fn() }));
vi.mock("@/app/dashboard/actions", () => ({ saveActivityCheckIn }));

import { FailureToastProvider } from "./FailureNotice";
import ScheduleCheckInView from "./ScheduleCheckInView";

afterEach(cleanup);
let reducedMotion = false;
const animate = vi.fn(function (this: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  return { keyframes, options, cancel() {} } as unknown as Animation;
});

beforeEach(() => {
  reducedMotion = false;
  animate.mockClear();
  Element.prototype.animate = animate as unknown as Element["animate"];
  Element.prototype.getAnimations = () => [];
  window.matchMedia = ((query: string) => ({ matches: reducedMotion && query.includes("reduce") })) as typeof window.matchMedia;
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  saveActivityCheckIn.mockReset();
  saveActivityCheckIn.mockImplementation(async (input: Omit<ActivityCheckIn, "id">) => ({ id: "saved", ...input }));
});

const week = () => generateWeek(mockStudent, mockAnalytics, mockRules, mockStudentName);
const done = (activityId: string): ActivityCheckIn => ({ scheduleId: "schedule-1", activityId, status: "completed" });
const road: RoadToTestDay = { current: 150, goal: 165, month: "January", year: "2027", left: { kind: "weeks", count: 9 } };
const dayCard = (day: string) => screen.getByRole("heading", { name: new RegExp(`^${day}`) }).closest("section")!;

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

  it("undoes a check-off that never reaches the server and shows the connection message, keeping the week on screen", async () => {
    saveActivityCheckIn.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<ScheduleCheckInView scheduleId="schedule-1" schedule={week()} student={mockStudent} checkIns={[]} />, { wrapper: FailureToastProvider });
    const row = within(dayCard("Monday")).getByRole("checkbox", { name: "1 Full LR Section" });

    await userEvent.click(row);
    expect((await screen.findByRole("alert")).textContent).toBe("No connection. Check your signal and try again.");
    expect(row.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("18 remaining")).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(7);

    await userEvent.click(row);
    expect(await screen.findByText("1 of 18 done")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
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
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
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

  it("checks a done line and ends a finished day with All done", () => {
    render(<ScheduleCheckInView scheduleId="schedule-1" schedule={week()} student={mockStudent}
      checkIns={[done("MONDAY:0"), done("MONDAY:1"), done("TUESDAY:0")]} />);
    expect(within(dayCard("Monday")).getByText("All done")).toBeTruthy();
    expect(within(dayCard("Tuesday")).queryByText("All done")).toBeNull();
    expect(within(dayCard("Monday")).getByRole("checkbox", { name: "1 Full LR Section" }).getAttribute("aria-checked")).toBe("true");
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
    expect(openRow!.textContent).toContain(", not done");
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

  describe("week header on This week", () => {
    const MONDAY = "2026-08-24";
    const WEDNESDAY = "2026-08-26";
    const summary = () => screen.getByRole("region", { name: "Week summary" });
    const renderWeek = (props: { checkIns?: ActivityCheckIn[]; today?: string; road?: RoadToTestDay; readOnly?: boolean; schedule?: ReturnType<typeof week> } = {}) =>
      render(<ScheduleCheckInView scheduleId="schedule-1" schedule={props.schedule ?? week()} student={mockStudent}
        checkIns={props.checkIns ?? []} today={props.today ?? MONDAY} readOnly={props.readOnly}
        thisWeek={{ drillLink: null, road: props.road ?? road }} />);
    const allIds = (schedule = week()) => Object.values(schedule.days).flatMap((day) => day.activities.map((_, index) => `${day.day}:${index}`));

    it("titles the week and shows the done count, an on-pace pill, and the road to the test", () => {
      renderWeek();
      expect(screen.getByText("Week of August 24")).toBeTruthy();
      expect(screen.getByRole("heading", { level: 1, name: "Your plan for this week" })).toBeTruthy();
      expect(screen.getByText("Your plan is set. Check off as you go.")).toBeTruthy();
      expect(within(summary()).getByText("of 18 done")).toBeTruthy();
      expect(within(summary()).getByText("On pace")).toBeTruthy();
      expect(within(summary()).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
      expect(within(summary()).getByText("9 weeks to the January LSAT")).toBeTruthy();
      expect(within(summary()).getByRole("img", { name: "From 150 now to 165 by the January 2027 LSAT, 9 weeks away." })).toBeTruthy();
    });

    it("counts only the days before today as due, so ticks past that read ahead", () => {
      renderWeek({ checkIns: [done("MONDAY:0")] });
      expect(within(summary()).getByText("1 ahead")).toBeTruthy();
    });

    it("shows how many activities are behind when earlier days are not done", () => {
      const schedule = week();
      const due = schedule.days.MONDAY.activities.length + schedule.days.TUESDAY.activities.length;
      renderWeek({ schedule, checkIns: [done("MONDAY:0")], today: WEDNESDAY });
      expect(within(summary()).getByText(`${due - 1} behind`)).toBeTruthy();
    });

    it("reads Week done once every activity is ticked", () => {
      renderWeek({ checkIns: allIds().map(done), today: WEDNESDAY });
      expect(within(summary()).getByText("18")).toBeTruthy();
      expect(within(summary()).getByText("Week done")).toBeTruthy();
      expect(within(summary()).queryByText(/behind|ahead|On pace/)).toBeNull();
    });

    it("says Nothing planned this week with no bar or pill when the week has no activities", () => {
      const schedule = week();
      for (const day of Object.values(schedule.days)) day.activities = [];
      renderWeek({ schedule });
      expect(within(summary()).getByText("Nothing planned this week.")).toBeTruthy();
      expect(within(summary()).queryByRole("progressbar")).toBeNull();
      expect(within(summary()).queryByText(/On pace|done/)).toBeNull();
    });

    it("counts days under a week out, and says Test day on the day", () => {
      const { unmount } = renderWeek({ road: { ...road, month: "November", year: "2026", left: { kind: "days", count: 4 } } });
      expect(within(summary()).getByText("4 days to the November LSAT")).toBeTruthy();
      unmount();
      renderWeek({ road: { ...road, left: { kind: "test_day" } } });
      expect(within(summary()).getByText("Test day")).toBeTruthy();
    });

    it("says the test has passed and links to Study settings after the test date", () => {
      renderWeek({ road: { ...road, month: "November", year: "2026", left: { kind: "passed" } } });
      expect(summary().textContent).toContain("Your November LSAT has passed. Set your next test date in Study settings.");
      expect(within(summary()).getByRole("link", { name: "Study settings" }).getAttribute("href")).toBe("/settings");
      expect(within(summary()).queryByRole("img")).toBeNull();
    });

    it("shows next week's preview with the planned count and no bar or pill", () => {
      renderWeek({ readOnly: true });
      expect(screen.getByText("Next week · starts Monday, Aug 24")).toBeTruthy();
      expect(screen.getByRole("heading", { level: 1, name: "Your plan for next week" })).toBeTruthy();
      expect(summary().textContent).toContain("18 activities planned");
      expect(within(summary()).queryByRole("progressbar")).toBeNull();
      expect(within(summary()).queryByText("On pace")).toBeNull();
    });

    it("updates the count, the pill, and the bar on a tick and an untick", async () => {
      renderWeek({ today: "2026-08-25" });
      const bar = within(summary()).getByRole("progressbar");
      expect(within(summary()).getByText(/behind$/).textContent).toBe(`${week().days.MONDAY.activities.length} behind`);
      const row = within(dayCard("Monday")).getByRole("checkbox", { name: /^1 Full LR Section/ });

      await userEvent.click(row);
      expect(within(summary()).getByText("1")).toBeTruthy();
      expect(bar.getAttribute("aria-valuenow")).toBe("1");
      expect(within(summary()).getByText(/behind$/).textContent).toBe(`${week().days.MONDAY.activities.length - 1} behind`);

      await userEvent.click(row);
      expect(bar.getAttribute("aria-valuenow")).toBe("0");
      expect(within(summary()).getByText(/behind$/).textContent).toBe(`${week().days.MONDAY.activities.length} behind`);
    });

    it("offers Show N more for week notes past the first two", async () => {
      const schedule = week();
      schedule.reasons = ["One.", "Two.", "Three.", "Four."].map((sentence) => ({ code: "starred_rotation" as const, placement: { scope: "week" as const }, sentence }));
      renderWeek({ schedule });
      await userEvent.click(screen.getByRole("button", { name: "Show 2 more" }));
      expect(screen.queryByRole("button", { name: /Show \d more/ })).toBeNull();
      expect(screen.getByText("Four.")).toBeTruthy();
    });
  });

  describe("Today card on This week", () => {
    const TUESDAY = "2026-08-25";
    const todayCard = () => screen.getByRole("region", { name: /^Today/ });
    const upNext = () => within(todayCard()).getByText("Up next").parentElement!;
    const markDone = () => within(todayCard()).getByRole("button", { name: /^Mark done/ });
    const renderToday = (today: string, props: { checkIns?: ActivityCheckIn[]; drillLink?: string; schedule?: ReturnType<typeof week> } = {}) => {
      history.replaceState(null, "", "/dashboard");
      return render(<ScheduleCheckInView scheduleId="schedule-1" schedule={props.schedule ?? week()} student={mockStudent}
        checkIns={props.checkIns ?? []} today={today} thisWeek={{ drillLink: props.drillLink ?? null, road }} />, { wrapper: FailureToastProvider });
    };

    it("shows the first activity not done as Up next, and the day's other activities under it with rounded minutes", () => {
      renderToday(TUESDAY);
      expect(within(todayCard()).getByRole("heading", { level: 2 }).textContent).toBe("TodayTuesday, Aug 25");
      expect(within(todayCard()).getByText("0 of 4 done · 1 h 37 left")).toBeTruthy();
      expect(upNext().textContent).toBe("Up next10 Weaken + Strengthen (L2-4)30 min · Logical Reasoning");
      expect(within(todayCard()).getByRole("button", { name: "Set up 10 Weaken + Strengthen (L2-4)" })).toBeTruthy();
      expect(markDone().getAttribute("aria-label")).toBe("Mark done: 10 Weaken + Strengthen (L2-4)");

      const rows = within(todayCard()).getAllByRole("checkbox");
      expect(rows.map((row) => row.textContent)).toEqual([
        "5 Conditional reasoning (L2-4)15 min", "1 RC Passage Art L217 min", "2 RC Passages Humanities L2, Science L435 min"]);
      expect(within(todayCard()).getAllByRole("button", { name: /^Set up/ })).toHaveLength(4);
      expect(screen.queryByRole("region", { name: "Tuesday" })).toBeNull();
      expect(screen.getByRole("region", { name: "Monday" })).toBeTruthy();
    });

    it("drops Set up from ticked drills in the list and counts what is left", () => {
      renderToday(TUESDAY, { checkIns: [done("TUESDAY:1")] });
      expect(within(todayCard()).getByText("1 of 4 done · 1 h 22 left")).toBeTruthy();
      expect(within(todayCard()).queryByRole("button", { name: "Set up 5 Conditional reasoning (L2-4)" })).toBeNull();
      expect(within(todayCard()).getByRole("checkbox", { name: "5 Conditional reasoning (L2-4)15 min" }).getAttribute("aria-checked")).toBe("true");
    });

    it("keeps focus on Mark done, which then names the next activity", async () => {
      const user = userEvent.setup();
      renderToday(TUESDAY);
      const button = markDone();
      await user.click(button);
      expect(saveActivityCheckIn).toHaveBeenLastCalledWith({ scheduleId: "schedule-1", activityId: "TUESDAY:0", status: "completed" });
      expect(markDone()).toBe(button);
      expect(document.activeElement).toBe(button);
      expect(button.getAttribute("aria-label")).toBe("Mark done: 5 Conditional reasoning (L2-4)");
      expect(upNext().textContent).toBe("Up next5 Conditional reasoning (L2-4)15 min · Logical Reasoning");
      expect(within(todayCard()).getByRole("checkbox", { name: "10 Weaken + Strengthen (L2-4)30 min" }).getAttribute("aria-checked")).toBe("true");

      await user.keyboard("{Enter}");
      expect(button.getAttribute("aria-label")).toBe("Mark done: 1 RC Passage Art L2");
      await waitFor(() => expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("2"));
    });

    it("reads All done for today with the next study day once every activity is ticked, and moves focus there", async () => {
      renderToday(TUESDAY, { checkIns: [done("TUESDAY:0"), done("TUESDAY:1"), done("TUESDAY:2")] });
      await userEvent.click(markDone());
      expect(within(todayCard()).getByText("4 of 4 done")).toBeTruthy();
      const allDone = within(todayCard()).getByText("All done for today").parentElement!;
      expect(allDone.textContent).toBe("All done for todayNext: Thursday, Aug 27 · 5 activities, 1 h 35");
      expect(document.activeElement).toBe(allDone);
      expect(within(todayCard()).queryByRole("button", { name: /^Mark done/ })).toBeNull();
      expect(within(todayCard()).getAllByRole("checkbox")).toHaveLength(4);
      expect(within(todayCard()).queryByRole("button", { name: /^Set up/ })).toBeNull();
    });

    it("says nothing else is planned when today is the last study day", () => {
      renderToday("2026-08-30", { checkIns: [done("SUNDAY:0")] });
      expect(within(todayCard()).getByText("All done for today").parentElement!.textContent)
        .toBe("All done for todayNothing else is planned this week.");
    });

    it("shows a rest day and the next study day", () => {
      renderToday("2026-08-26");
      expect(within(todayCard()).getByText("Rest day. Nothing planned.")).toBeTruthy();
      expect(within(todayCard()).getByText(/^Next:/).textContent).toBe("Next: Thursday, Aug 27 · 5 activities, 1 h 35");
      expect(within(todayCard()).queryByText(/ done/)).toBeNull();
      expect(within(todayCard()).queryByRole("button")).toBeNull();
    });

    it("shows why an unscheduled day is empty, and today's day notes under the header", () => {
      const schedule = week();
      schedule.days.MONDAY = { day: "MONDAY", type: "unscheduled", activities: [], totalMinutes: 0 };
      schedule.reasons = [
        { code: "unscheduled_day", placement: { scope: "day", day: "MONDAY" }, sentence: "Not scheduled because this weekly schedule started Tuesday." },
        { code: "rest_day_moved", placement: { scope: "day", day: "MONDAY" }, sentence: "Rest day moved to Wednesday." },
      ];
      renderToday("2026-08-24", { schedule });
      expect(within(todayCard()).getAllByText("Not scheduled because this weekly schedule started Tuesday.")).toHaveLength(1);
      expect(within(todayCard()).getByText("Rest day moved to Wednesday.")).toBeTruthy();
      expect(within(todayCard()).getByText(/^Next:/).textContent).toBe("Next: Tuesday, Aug 25 · 4 activities, 1 h 37");
    });

    it.each([
      ["practice-test", "2026-08-29", "Practice Test (from PT 130+)"],
      ["review", "2026-08-30", "PT Review + Blind Review"],
    ])("shows the %s day's one activity with its time and no Set up", (_, today, label) => {
      renderToday(today);
      expect(upNext().textContent).toBe(`Up next${label}2 h 30`);
      expect(markDone().getAttribute("aria-label")).toBe(`Mark done: ${label}`);
      expect(within(todayCard()).queryByRole("button", { name: /^Set up/ })).toBeNull();
      expect(within(todayCard()).queryByRole("checkbox")).toBeNull();
    });

    it("returns Up next to its saved state and shows the error code when Mark done fails", async () => {
      saveActivityCheckIn.mockResolvedValue({ unexpectedFailure: "3f9a01c2" });
      renderToday(TUESDAY);
      await userEvent.click(markDone());
      expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong. Try again.Error code 3f9a01c2");
      expect(markDone().getAttribute("aria-label")).toBe("Mark done: 10 Weaken + Strengthen (L2-4)");
      expect(within(todayCard()).getByText("0 of 4 done · 1 h 37 left")).toBeTruthy();
    });

    it("opens the setup guide from Up next and from a row, and Esc returns focus to that Set up", async () => {
      const user = userEvent.setup();
      renderToday(TUESDAY);
      for (const label of ["10 Weaken + Strengthen (L2-4)", "1 RC Passage Art L2"]) {
        const setUp = within(todayCard()).getByRole("button", { name: `Set up ${label}` });
        await user.click(setUp);
        expect(screen.getByRole("dialog", { name: `Drill setup guide · Tuesday · ${label}` }).getAttribute("open")).not.toBeNull();
        await user.keyboard("{Escape}");
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        expect(document.activeElement).toBe(setUp);
      }
      expect(saveActivityCheckIn).not.toHaveBeenCalled();
    });

    it("opens the guide a drill link names in today's card, and closing returns focus to Up next's Set up", async () => {
      const user = userEvent.setup();
      renderToday(TUESDAY, { drillLink: `${week().weekOf}:TUESDAY:0` });
      expect(screen.getByRole("dialog", { name: "Drill setup guide · Tuesday · 10 Weaken + Strengthen (L2-4)" }).getAttribute("open")).not.toBeNull();
      await user.click(screen.getByRole("button", { name: "Close the drill setup guide" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(document.activeElement).toBe(within(todayCard()).getByRole("button", { name: "Set up 10 Weaken + Strengthen (L2-4)" }));
    });

    it("returns focus to the row when a drill link names a drill already ticked today", async () => {
      const user = userEvent.setup();
      renderToday(TUESDAY, { checkIns: [done("TUESDAY:2")], drillLink: `${week().weekOf}:TUESDAY:2` });
      await user.click(screen.getByRole("button", { name: "Close the drill setup guide" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(document.activeElement).toBe(within(todayCard()).getByRole("checkbox", { name: "1 RC Passage Art L217 min" }));
    });

    it("shows That drill is not in this week above the Today card for a drill from another week", () => {
      renderToday(TUESDAY, { drillLink: "2026-08-17:TUESDAY:0" });
      const notice = screen.getByRole("status");
      expect(notice.textContent).toBe("That drill is not in this week.");
      expect(notice.compareDocumentPosition(todayCard()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("shows no Today card on next week's preview or outside the week", () => {
      const { unmount } = render(<ScheduleCheckInView scheduleId="schedule-1" schedule={week()} student={mockStudent}
        checkIns={[]} today={TUESDAY} readOnly thisWeek={{ drillLink: null, road }} />);
      expect(screen.queryByRole("region", { name: /^Today/ })).toBeNull();
      unmount();
      renderToday("2026-08-31");
      expect(screen.queryByRole("region", { name: /^Today/ })).toBeNull();
      expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(7);
    });
  });

  describe("Rest of the week on This week", () => {
    const TUESDAY = "2026-08-25";
    const card = (day: string) => screen.getByRole("region", { name: day });
    const renderRest = (props: { today?: string; checkIns?: ActivityCheckIn[]; readOnly?: boolean; schedule?: ReturnType<typeof week> } = {}) =>
      render(<ScheduleCheckInView scheduleId="schedule-1" schedule={props.schedule ?? week()} student={mockStudent}
        checkIns={props.checkIns ?? []} today={props.today ?? TUESDAY} readOnly={props.readOnly} thisWeek={{ drillLink: null, road }} />,
      { wrapper: FailureToastProvider });
    const dayNames = () => screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent!.split(" ")[0]);

    it("lists the other days in date order under Rest of the week", () => {
      renderRest();
      expect(screen.getByRole("heading", { level: 2, name: "Rest of the week" })).toBeTruthy();
      expect(dayNames()).toEqual(["Monday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
    });

    it("reads Earlier this week on Sunday", () => {
      renderRest({ today: "2026-08-30" });
      expect(screen.getByRole("heading", { level: 2, name: "Earlier this week" })).toBeTruthy();
      expect(screen.queryByText("Rest of the week")).toBeNull();
      expect(dayNames()).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
    });

    it("shows all seven days with read-only rows and no Rest of the week heading on next week's preview", async () => {
      renderRest({ readOnly: true, today: "2026-08-22" });
      expect(screen.queryByText("Rest of the week")).toBeNull();
      expect(screen.queryByText("Earlier this week")).toBeNull();
      expect(dayNames()).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
      expect(screen.queryByRole("checkbox")).toBeNull();
      await userEvent.click(within(card("Monday")).getByText("1 Full LR Section"));
      expect(saveActivityCheckIn).not.toHaveBeenCalled();
      expect(within(card("Monday")).getByText("1 Full LR Section").parentElement!.parentElement!.textContent).toBe("1 Full LR Section1 h, not done");
      expect(within(card("Tuesday")).getByRole("button", { name: "Set up 10 Weaken + Strengthen (L2-4), Tuesday" })).toBeTruthy();
      expect(within(card("Monday")).queryByText(/of \d+ done/)).toBeNull();
    });

    it("shows the day line, rows with their minutes, and a Set up that names the day", () => {
      renderRest();
      const thursday = card("Thursday");
      expect(within(thursday).getByText("Drilling · 1 h 35 of 1 h 30")).toBeTruthy();
      expect(within(thursday).getAllByRole("checkbox").map((row) => row.textContent)).toEqual([
        "2 RC Passages Law L3, Comparative L535 min", "5 Flaw or descriptive weakening (L2-4)15 min", "5 Phenomenon-hypothesis (LR) (L2-4)15 min",
        "5 Math (L2-4)15 min", "5 Diagram (L2-4)15 min"]);
      expect(within(thursday).getByRole("button", { name: "Set up 5 Math (L2-4), Thursday" })).toBeTruthy();
    });

    it("counts done rows on past days, and on later days once something is ticked", () => {
      renderRest({ checkIns: [done("THURSDAY:1"), done("SATURDAY:0")] });
      expect(within(card("Monday")).getByText("0 of 2 done")).toBeTruthy();
      expect(within(card("Thursday")).getByText("1 of 5 done")).toBeTruthy();
      expect(within(card("Saturday")).getByText("All done")).toBeTruthy();
      expect(within(card("Friday")).queryByText(/done/)).toBeNull();
    });

    it("ticks a row on another day: it saves, counts, and drops that row's Set up", async () => {
      renderRest();
      const row = within(card("Friday")).getByRole("checkbox", { name: /^5 Must be false/ });
      await userEvent.click(row);
      expect(row.getAttribute("aria-checked")).toBe("true");
      expect(saveActivityCheckIn).toHaveBeenLastCalledWith({ scheduleId: "schedule-1", activityId: "FRIDAY:3", status: "completed" });
      expect(within(card("Friday")).getByText("1 of 5 done")).toBeTruthy();
      expect(within(card("Friday")).queryByRole("button", { name: "Set up 5 Must be false (L2-4), Friday" })).toBeNull();

      await userEvent.click(row);
      expect(row.getAttribute("aria-checked")).toBe("false");
      expect(within(card("Friday")).queryByText(/done/)).toBeNull();
    });

    it("numbers two practice tests in one week", () => {
      const schedule = week();
      schedule.days.FRIDAY = { ...schedule.days.SATURDAY, day: "FRIDAY" };
      renderRest({ schedule });
      expect(within(card("Friday")).getByText(/^Practice test 1 of 2 · /)).toBeTruthy();
      expect(within(card("Saturday")).getByText(/^Practice test 2 of 2 · /)).toBeTruthy();
    });

    it("shrinks rest days and unscheduled days to one line, with their day notes under it", () => {
      const schedule = week();
      schedule.days.MONDAY = { day: "MONDAY", type: "unscheduled", activities: [], totalMinutes: 0 };
      schedule.reasons = [
        { code: "unscheduled_day", placement: { scope: "day", day: "MONDAY" }, sentence: "Not scheduled because this weekly schedule started Tuesday." },
        { code: "rest_day_moved", placement: { scope: "day", day: "WEDNESDAY" }, sentence: "Rest day moved to Wednesday." },
      ];
      renderRest({ schedule });
      expect(card("Monday").textContent).toBe("Monday Aug 24Not scheduled because this weekly schedule started Tuesday.");
      expect(card("Wednesday").textContent).toBe("Wednesday Aug 26Rest day. Nothing planned.Rest day moved to Wednesday.");
      expect(within(card("Wednesday")).queryByRole("checkbox")).toBeNull();
      expect(within(card("Wednesday")).queryByText(/Rest day ·/)).toBeNull();
    });

    it("shows a drilling day's notes under its header", () => {
      const schedule = week();
      schedule.reasons = [{ code: "rest_day_moved", placement: { scope: "day", day: "THURSDAY" }, sentence: "Rest day moved to Wednesday." }];
      renderRest({ schedule });
      expect(within(card("Thursday")).getByText("Rest day moved to Wednesday.")).toBeTruthy();
    });
  });

  describe("drill setup guide", () => {
    const paired = "10 Weaken + Strengthen (L2-4)";
    const renderWeek = (props: { checkIns?: ActivityCheckIn[]; readOnly?: boolean } = {}) =>
      render(<ScheduleCheckInView scheduleId="schedule-1" schedule={week()} student={mockStudent} checkIns={props.checkIns ?? []} readOnly={props.readOnly} />);
    const setUp = (label: string) => screen.getByRole("button", { name: `Set up ${label}` });
    const guide = () => screen.getByRole("dialog");
    const stepCount = () => within(guide()).getByText(/^Step \d of 4$/).textContent;

    async function openGuide(label = paired) {
      const user = userEvent.setup();
      renderWeek();
      await user.click(setUp(label));
      return user;
    }

    it("offers Set up on LR and RC drill rows only, on done rows and in the read-only view too", () => {
      const { unmount } = renderWeek({ checkIns: [done("TUESDAY:0")] });
      const setUps = screen.getAllByRole("button", { name: /^Set up / }).map((button) => button.getAttribute("aria-label"));
      expect(setUps).toEqual(expect.arrayContaining([`Set up ${paired}`, "Set up 5 Conditional reasoning (L2-4)",
        "Set up 1 RC Passage Art L2", "Set up 2 RC Passages Humanities L2, Science L4"]));
      expect(setUps).not.toContain("Set up 1 Full LR Section");
      expect(within(dayCard("Saturday")).queryByRole("button", { name: /^Set up/ })).toBeNull();
      expect(within(dayCard("Sunday")).queryByRole("button", { name: /^Set up/ })).toBeNull();
      expect(within(dayCard("Monday")).getAllByRole("button", { name: /^Set up/ })).toHaveLength(1);
      unmount();

      renderWeek({ readOnly: true });
      expect(setUp(paired).getAttribute("aria-haspopup")).toBe("dialog");
      expect(screen.getAllByRole("button", { name: /^Set up / })).toHaveLength(setUps.length);
    });

    it("opens the guide from Set up without checking the row off", async () => {
      await openGuide();
      expect(screen.getByRole("checkbox", { name: paired, hidden: true }).getAttribute("aria-checked")).toBe("false");
      expect(saveActivityCheckIn).not.toHaveBeenCalled();
      expect(setUp(paired).getAttribute("aria-expanded")).toBe("true");
    });

    it("opens named for the day and the drill, with focus on its title and on step 1", async () => {
      await openGuide();
      expect(guide().getAttribute("open")).not.toBeNull();
      expect(screen.getByRole("dialog", { name: `Drill setup guide · Tuesday · ${paired}` })).toBe(guide());
      expect(document.activeElement?.textContent).toBe(`Drill setup guide · Tuesday · ${paired}`);
      expect(stepCount()).toBe("Step 1 of 4");
      expect(within(guide()).getByRole("heading", { name: "Start a drill on 7Sage" })).toBeTruthy();
      expect(within(guide()).getByRole("button", { name: "Back" })).toHaveProperty("disabled", true);
      const link = within(guide()).getByRole("link", { name: "Open 7Sage drills (opens in a new tab)" });
      expect(link.getAttribute("target")).toBe("_blank");
      expect(within(guide()).getByRole("button", { name: "Step 1" }).getAttribute("aria-current")).toBe("step");
    });

    it("moves between cards with Next step, Back, the dots, and the arrow keys", async () => {
      const user = await openGuide();
      expect(within(guide()).getByText("Open 7Sage.", { exact: false }).textContent)
        .toBe("Open 7Sage. Go to Study, then Drills and sections. Under Logical Reasoning, click Start drill.");
      await user.click(within(guide()).getByRole("button", { name: "Next step" }));
      expect(stepCount()).toBe("Step 2 of 4");
      await user.click(within(guide()).getByRole("button", { name: "Back" }));
      expect(stepCount()).toBe("Step 1 of 4");
      expect(document.activeElement).toBe(within(guide()).getByRole("button", { name: "Next step" }));

      await user.click(within(guide()).getByRole("button", { name: "Step 4" }));
      expect(stepCount()).toBe("Step 4 of 4");
      expect(within(guide()).getByRole("button", { name: "Step 4" }).getAttribute("aria-current")).toBe("step");
      expect(within(guide()).getByRole("button", { name: "Step 1" }).getAttribute("aria-current")).toBeNull();
      await user.keyboard("{ArrowLeft}");
      expect(stepCount()).toBe("Step 3 of 4");
      await user.keyboard("{ArrowRight}{ArrowRight}");
      expect(stepCount()).toBe("Step 4 of 4");
    });

    it("shows the paired drill's filters on card 3: one 7Sage drill per type, half the questions each", async () => {
      const user = await openGuide();
      await user.click(within(guide()).getByRole("button", { name: "Step 3" }));
      expect(within(guide()).getByRole("heading", { name: "Set the filters" })).toBeTruthy();
      expect(within(guide()).getByText("Section:", { exact: false }).textContent).toBe("Section: Logical Reasoning");
      const table = within(guide()).getByRole("table");
      expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Tags", "Difficulty", "Questions"]);
      expect(within(table).getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent)))
        .toEqual([["Weaken", "2, 3 and 4", "5"], ["Strengthen", "2, 3 and 4", "5"], ["Total: 10 questions"]]);
      expect(within(guide()).getAllByRole("link", { name: /^Open 7Sage drills/ })).toHaveLength(1);
    });

    it("builds a two-passage RC drill as two 7Sage drills of one passage, easier passage first", async () => {
      const user = await openGuide("2 RC Passages Humanities L2, Science L4");
      await user.click(within(guide()).getByRole("button", { name: "Step 3" }));
      const table = within(guide()).getByRole("table");
      expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Tags", "Difficulty", "Passages"]);
      expect(within(table).getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent)))
        .toEqual([["Humanities", "2", "1"], ["Science", "4", "1"], ["Total: 2 passages"]]);
      await user.click(within(guide()).getByRole("button", { name: "Next step" }));
      expect(within(guide()).getByText("Set Number of passages", { exact: false }).textContent)
        .toBe("Set Number of passages to 1. Pick any Timing, then click Start Drill. "
          + "When it ends, repeat steps 1 to 4 with Tags set to Science (under RC passage subject) and Passage Difficulty set to 4, and Number of passages set to 1.");
      expect(within(guide()).getByRole("img", { name: "7Sage, step 4" }).getAttribute("src")).toBe("/drill-setup-guide/rc-step-4-count-and-start.png");
    });

    it.each([
      ["Done on the last card", async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(within(guide()).getByRole("button", { name: "Step 4" }));
        await user.click(within(guide()).getByRole("button", { name: "Done" }));
      }],
      ["Escape", (user: ReturnType<typeof userEvent.setup>) => user.keyboard("{Escape}")],
      ["the close button", (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Close the drill setup guide" }))],
    ])("closes on %s and returns focus to that row's Set up", async (_, close) => {
      const user = await openGuide();
      await close(user);
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(setUp(paired)));
      expect(setUp(paired).getAttribute("aria-expanded")).toBe("false");
      expect(saveActivityCheckIn).not.toHaveBeenCalled();
    });

    it("opens each time on step 1", async () => {
      const user = await openGuide();
      await user.click(within(guide()).getByRole("button", { name: "Step 3" }));
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await user.click(setUp(paired));
      expect(stepCount()).toBe("Step 1 of 4");
    });

    it("shows each card's 7Sage screenshot and loads all four when the guide opens", async () => {
      const loaded: string[] = [];
      const BrowserImage = window.Image;
      window.Image = class {
        set src(value: string) { loaded.push(value); }
      } as unknown as typeof window.Image;
      try {
        const user = await openGuide();
        expect(loaded).toHaveLength(4);
        const shown = [within(guide()).getByRole("img", { name: "7Sage, step 1" }).getAttribute("src")];
        for (const step of [2, 3, 4]) {
          await user.click(within(guide()).getByRole("button", { name: `Step ${step}` }));
          shown.push(within(guide()).getByRole("img", { name: `7Sage, step ${step}` }).getAttribute("src"));
        }
        expect(shown).toEqual(loaded);
        expect(new Set(shown).size).toBe(4);
      } finally {
        window.Image = BrowserImage;
      }
    });

    it("zooms the screenshot to real size and back, and fits it again on another card", async () => {
      const user = await openGuide();
      const zoom = () => within(guide()).getByRole("button", { name: /screenshot/ });
      expect(zoom().getAttribute("aria-label")).toBe("Show the screenshot at real size");
      expect(zoom().getAttribute("aria-pressed")).toBe("false");
      expect(within(guide()).getByText("Tap to zoom")).toBeTruthy();

      await user.click(zoom());
      expect(zoom().getAttribute("aria-label")).toBe("Fit the screenshot");
      expect(zoom().getAttribute("aria-pressed")).toBe("true");
      expect(within(guide()).queryByText("Tap to zoom")).toBeNull();
      expect(stepCount()).toBe("Step 1 of 4");

      await user.click(zoom());
      expect(zoom().getAttribute("aria-pressed")).toBe("false");

      await user.click(zoom());
      await user.click(within(guide()).getByRole("button", { name: "Next step" }));
      expect(zoom().getAttribute("aria-label")).toBe("Show the screenshot at real size");
      expect(zoom().getAttribute("aria-pressed")).toBe("false");
      expect(within(guide()).getByText("Tap to zoom")).toBeTruthy();
    });

    const slides = () => animate.mock.calls.map(([keyframes, options]) =>
      ({ from: (keyframes as Keyframe[])[0], delay: (options as KeyframeAnimationOptions).delay }));

    it("slides the new card's content in from the side moved to, the step text 40 ms after the screenshot, but not on open", async () => {
      const user = await openGuide();
      expect(animate).not.toHaveBeenCalled();

      await user.click(within(guide()).getByRole("button", { name: "Next step" }));
      expect(slides()).toEqual([
        { from: { opacity: 0, transform: "translateX(12px)" }, delay: 0 },
        { from: { opacity: 0, transform: "translateX(12px)" }, delay: 40 },
      ]);

      animate.mockClear();
      await user.click(within(guide()).getByRole("button", { name: "Back" }));
      expect(slides().map((slide) => slide.from.transform)).toEqual(["translateX(-12px)", "translateX(-12px)"]);
    });

    it("moves with the arrow keys after a click on plain text leaves focus on the guide itself", async () => {
      await openGuide();
      fireEvent.keyDown(guide(), { key: "ArrowRight" });
      expect(stepCount()).toBe("Step 2 of 4");
    });

    it("changes the card at once on a held arrow key", async () => {
      await openGuide();
      fireEvent.keyDown(document.activeElement!, { key: "ArrowRight", repeat: true });
      expect(stepCount()).toBe("Step 2 of 4");
      expect(animate).not.toHaveBeenCalled();
    });

    it("only fades the new card in when the student asks for less motion", async () => {
      reducedMotion = true;
      const user = await openGuide();
      await user.click(within(guide()).getByRole("button", { name: "Next step" }));
      expect(slides().map((slide) => slide.from)).toEqual([
        { opacity: 0, transform: "translateX(0px)" },
        { opacity: 0, transform: "translateX(0px)" },
      ]);
    });

    describe("on This week", () => {
      const thisWeek = () => week().weekOf;
      const link = (activityId: string, weekOf = thisWeek()) => `${weekOf}:${activityId}`;
      const renderThisWeek = (drillLink: string | null, schedule = week()) => {
        history.replaceState({ entry: "this week" }, "", drillLink === null ? "/dashboard" : `/dashboard?drill=${drillLink}`);
        return render(<ScheduleCheckInView scheduleId="schedule-1" schedule={schedule} student={mockStudent} checkIns={[]}
          thisWeek={{ drillLink, road }} />);
      };
      const onThisWeekEntry = () => expect(history.state).toEqual({ entry: "this week" });
      const setUp = (label: string) => screen.getByRole("button", { name: `Set up ${label}, Tuesday` });
      const reload = (unmount: () => void, drillLink: string | null = null) => {
        unmount();
        return render(<ScheduleCheckInView scheduleId="schedule-1" schedule={week()} student={mockStudent} checkIns={[]}
          thisWeek={{ drillLink, road }} />);
      };

      it("opens the guide for the drill a link names, and closing it takes the drill out of the address", async () => {
        const user = userEvent.setup();
        renderThisWeek(link("TUESDAY:0"));
        expect(screen.getByRole("dialog", { name: `Drill setup guide · Tuesday · ${paired}` }).getAttribute("open")).not.toBeNull();
        expect(stepCount()).toBe("Step 1 of 4");
        expect(screen.queryByText("That drill is not in this week.")).toBeNull();

        await user.click(screen.getByRole("button", { name: "Close the drill setup guide" }));
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        await waitFor(onThisWeekEntry);
        await waitFor(() => expect(location.search).toBe(""));
        expect(document.activeElement).toBe(setUp(paired));
      });

      it.each([
        ["a drill from another week", () => link("TUESDAY:0", "2026-08-17")],
        ["a drill that names no week", () => "TUESDAY:0"],
        ["a slot this week does not have", () => link("SUNDAY:7")],
        ["a full section", () => link("MONDAY:0")],
        ["nonsense", () => "x"],
      ])("shows the notice and no guide for a link to %s", (_, drillLink) => {
        renderThisWeek(drillLink());
        expect(screen.getByRole("status").textContent).toBe("That drill is not in this week.");
        expect(screen.queryByRole("dialog")).toBeNull();
      });

      it("shows the notice and no guide on next week's preview for a link from this week", () => {
        const nextWeek = generateWeek(mockStudent, { ...mockAnalytics, weekOf: "2026-08-31" }, mockRules, mockStudentName);
        renderThisWeek(link("TUESDAY:0"), nextWeek);
        expect(screen.getByRole("status").textContent).toBe("That drill is not in this week.");
        expect(screen.queryByRole("dialog")).toBeNull();
      });

      it("does not bring the drill back on Forward after Back closes a guide a link opened, now or after a reload", async () => {
        const { unmount } = renderThisWeek(link("TUESDAY:0"));
        history.back();
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        await waitFor(() => expect(location.search).toBe(""));

        history.forward();
        await waitFor(() => expect(location.search).toBe(""));
        await waitFor(() => expect(history.state).toEqual({}));
        expect(screen.queryByRole("dialog")).toBeNull();

        reload(unmount);
        expect(screen.queryByRole("dialog")).toBeNull();
      });

      it.each([
        ["Set up", async () => { const view = renderThisWeek(null); await userEvent.setup().click(setUp(paired)); return view; }],
        ["a link", async () => renderThisWeek(link("TUESDAY:0"))],
      ])("keeps the same guide open after a reload, with no extra history entry, when %s opened it", async (_, open) => {
        const { unmount } = await open();
        const entries = history.length;
        const drillLink = new URLSearchParams(location.search).get("drill");

        reload(unmount, drillLink);
        expect(screen.getByRole("dialog", { name: `Drill setup guide · Tuesday · ${paired}` }).getAttribute("open")).not.toBeNull();
        expect(history.length).toBe(entries);

        history.back();
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        onThisWeekEntry();
        expect(location.search).toBe("");
      });

      it("closes the guide on the browser's Back and stays on This week, with focus back on Set up", async () => {
        const user = userEvent.setup();
        renderThisWeek(null);
        await user.click(setUp(paired));
        expect(history.state).not.toEqual({ entry: "this week" });

        history.back();
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        onThisWeekEntry();
        await waitFor(() => expect(document.activeElement).toBe(setUp(paired)));
        expect(location.pathname).toBe("/dashboard");
      });

      it("takes the guide's history entry back off when it closes another way", async () => {
        const user = userEvent.setup();
        renderThisWeek(null);
        await user.click(setUp(paired));
        await user.keyboard("{Escape}");
        await waitFor(onThisWeekEntry);
        expect(screen.queryByRole("dialog")).toBeNull();

        await user.click(setUp(paired));
        expect(guide().getAttribute("open")).not.toBeNull();
        history.back();
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        onThisWeekEntry();
      });

      it("adds no history entry outside This week", async () => {
        history.replaceState({ entry: "progress" }, "", "/progress");
        await openGuide();
        expect(history.state).toEqual({ entry: "progress" });
      });
    });
  });
});
