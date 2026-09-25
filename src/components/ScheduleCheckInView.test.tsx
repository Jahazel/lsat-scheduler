import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { generateWeek } from "@/lib/engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "@/lib/mockData";

vi.mock("@/app/dashboard/actions", () => ({ saveActivityCheckIn: vi.fn() }));

import ScheduleCheckInView from "./ScheduleCheckInView";

describe("ScheduleCheckInView", () => {
  it("keeps capacity warnings in every view but links to Study settings only this week", () => {
    const student = { ...mockStudent, dailyCapacityMinutes: { ...mockStudent.dailyCapacityMinutes, SATURDAY: 120 } };
    const schedule = generateWeek(student, mockAnalytics, mockRules, mockStudentName);
    const savedSentence = "Saved practice-test capacity reason.";
    schedule.reasons = [{ code: "capacity_overage", placement: { scope: "day", day: "SATURDAY" }, sentence: savedSentence }];

    for (const { readOnly, heading, hasCapacityLink } of [
      { readOnly: false, heading: "Your plan for this week", hasCapacityLink: true },
      { readOnly: true, heading: "Your plan for this week", hasCapacityLink: false },
      { readOnly: false, heading: "Your past plan", hasCapacityLink: false },
    ]) {
      const markup = renderToStaticMarkup(<ScheduleCheckInView scheduleId="schedule-1" schedule={schedule}
        student={student} checkIns={[]} readOnly={readOnly} heading={heading} statusFirst={!readOnly} />);
      const saturday = markup.match(/<section[^>]*>[\s\S]*?<\/section>/g)?.find((card) => card.includes("Saturday")) ?? "";
      expect(saturday).toContain("30 min over your 2 h Saturday");
      expect(saturday).toContain(savedSentence);
      expect(saturday.includes('href="/settings"')).toBe(hasCapacityLink);
      expect(saturday.includes("applies from next week&#x27;s plan")).toBe(hasCapacityLink);
      expect(saturday).toContain('role="note"');
    }
  });

  it("shows saved overage reasons on review and minimum-held drilling days", () => {
    const cases = [
      { day: "MONDAY" as const, student: { ...mockStudent, currentScore: 140,
        dailyCapacityMinutes: Object.fromEntries(Object.keys(mockStudent.dailyCapacityMinutes).map((day) => [day, 15])) as typeof mockStudent.dailyCapacityMinutes } },
      { day: "SUNDAY" as const, student: { ...mockStudent, dailyCapacityMinutes: { ...mockStudent.dailyCapacityMinutes, SUNDAY: 120 } } },
    ];
    for (const { day, student } of cases) {
      const schedule = generateWeek(student, mockAnalytics, mockRules, mockStudentName);
      const reason = schedule.reasons?.find((item) => item.code === "capacity_overage"
        && item.placement.scope === "day" && item.placement.day === day);
      const markup = renderToStaticMarkup(<ScheduleCheckInView scheduleId="schedule-1"
        schedule={schedule} student={student} checkIns={[]} />);
      const card = markup.match(/<section[^>]*>[\s\S]*?<\/section>/g)?.find((item) =>
        item.includes(day[0] + day.slice(1).toLowerCase())) ?? "";
      expect(reason).toBeDefined();
      expect(card).toContain(reason?.sentence);
      expect(card).toContain('role="note"');
      expect(card).toContain("border-ink-400");
    }
  });
  it("shows a saved capacity warning when its recorded overage is zero", () => {
    const schedule = generateWeek(mockStudent, mockAnalytics, mockRules, mockStudentName);
    schedule.days.SATURDAY.capacityOverageMinutes = 0;
    schedule.reasons = [{ code: "capacity_overage", placement: { scope: "day", day: "SATURDAY" }, sentence: "Saved capacity reason." }];
    const markup = renderToStaticMarkup(<ScheduleCheckInView scheduleId="schedule-1"
      schedule={schedule} student={mockStudent} checkIns={[]} />);
    const saturday = markup.match(/<section[^>]*>[\s\S]*?<\/section>/g)?.find((card) => card.includes("Saturday")) ?? "";
    expect(saturday).toContain('role="note"');
    expect(saturday).toContain("Saved capacity reason.");
  });
  it("shows the saved daily capacity on the rest day", () => {
    const schedule = generateWeek(mockStudent, mockAnalytics, mockRules, mockStudentName);

    const markup = renderToStaticMarkup(
      <ScheduleCheckInView
        scheduleId="schedule-1"
        schedule={schedule}
        student={mockStudent}
        checkIns={[]}
      />
    );

    expect(markup).toMatch(/Wednesday <span[^>]*>August 26<\/span><\/h2><span[^>]*>Rest day · 0 min of 1 h 30 min<\/span>/);
  });

  it("labels passed days separately from the computed rest day", () => {
    const schedule = generateWeek(mockStudent, mockAnalytics, mockRules, mockStudentName);
    schedule.days.MONDAY = { day: "MONDAY", type: "unscheduled", activities: [], totalMinutes: 0 };
    const markup = renderToStaticMarkup(
      <ScheduleCheckInView scheduleId="schedule-1" schedule={schedule} student={mockStudent} checkIns={[]} />
    );
    expect(markup).toContain("Not scheduled.");
    expect(markup).toContain("Rest day.");
  });

  it("marks both practice tests in a near-test week", () => {
    const schedule = generateWeek({ ...mockStudent, goalTestDate: "2026-10-01" },
      { ...mockAnalytics, weekOf: "2026-09-21" }, mockRules, mockStudentName);
    const markup = renderToStaticMarkup(<ScheduleCheckInView scheduleId="schedule-1"
      schedule={schedule} student={mockStudent} checkIns={[]} />);
    expect(markup).toContain("Practice test 1 of 2");
    expect(markup).toContain("Practice test 2 of 2");
    expect(markup).toContain("This near-test week has 2 LawHub practice tests");

    delete schedule.reasons;
    const olderMarkup = renderToStaticMarkup(<ScheduleCheckInView scheduleId="schedule-1"
      schedule={schedule} student={mockStudent} checkIns={[]} />);
    expect(olderMarkup).toContain("Practice test 1 of 2");
    expect(olderMarkup).toContain("Practice test 2 of 2");
  });

  it("places saved week and day labels without turning them into warnings", () => {
    const student = { ...mockStudent, preferredPracticeTestDay: "SUNDAY" as const };
    const schedule = generateWeek(student, mockAnalytics, mockRules, mockStudentName,
      { priorWeekPracticeTestReviewMinutes: 150 });
    schedule.days.TUESDAY = { day: "TUESDAY", type: "unscheduled", activities: [], totalMinutes: 0 };
    schedule.reasons = [
      { code: "no_practice_test", placement: { scope: "week" }, sentence: "Saved next test date." },
      { code: "skip_reduction", placement: { scope: "week" }, sentence: "Saved skip reduction." },
      { code: "starred_rotation", placement: { scope: "week" }, sentence: "Saved starred rotation." },
      { code: "full_section_dropped", placement: { scope: "week" }, sentence: "Saved full section drop." },
      { code: "unscheduled_day", placement: { scope: "day", day: "TUESDAY" }, sentence: "Saved unscheduled note." },
      { code: "rest_day_moved", placement: { scope: "day", day: "WEDNESDAY" }, sentence: "Saved rest move." },
      { code: "review_carried_over", placement: { scope: "day", day: "MONDAY" }, sentence: "Saved review carryover." },
      { code: "practice_test_review_day_next_week", placement: { scope: "day", day: "SUNDAY" }, sentence: "Saved next Monday review." },
    ];
    const markup = renderToStaticMarkup(<ScheduleCheckInView scheduleId="schedule-1"
      schedule={schedule} student={student} checkIns={[]} readOnly />);
    const cards = markup.match(/<section[^>]*>[\s\S]*?<\/section>/g) ?? [];
    const card = (day: string) => cards.find((item) => item.includes(`<h2`) && item.includes(`>${day} <span`)) ?? "";
    expect(markup.indexOf("Saved next test date.")).toBeLessThan(markup.indexOf("Schedule view"));
    for (const sentence of ["Saved skip reduction.", "Saved starred rotation.", "Saved full section drop."])
      expect(markup.indexOf(sentence)).toBeLessThan(markup.indexOf("Schedule view"));
    expect(card("Tuesday")).toContain("border-dashed");
    expect(card("Tuesday")).toContain("Saved unscheduled note.");
    expect(card("Tuesday")).toMatch(/<p class="text-sm text-ink-500">Saved unscheduled note\.<\/p>/);
    expect(card("Wednesday")).toContain("Saved rest move.");
    expect(card("Monday")).toContain("Saved review carryover.");
    expect(card("Sunday")).toContain("Saved next Monday review.");
    expect(markup).not.toContain('role="note"');
  });

  it("renders an older schedule without saved reasons", () => {
    const schedule = generateWeek(mockStudent, mockAnalytics, mockRules, mockStudentName);
    delete schedule.reasons;
    const markup = renderToStaticMarkup(<ScheduleCheckInView scheduleId="schedule-1"
      schedule={schedule} student={mockStudent} checkIns={[]} />);
    expect(markup).toContain("Rest day. Nothing planned.");
    expect(markup).toContain("Practice Test (from PT 130+)");
    expect(markup).not.toContain('role="note"');
  });
});
