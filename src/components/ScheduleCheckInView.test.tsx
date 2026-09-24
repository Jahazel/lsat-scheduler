import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { generateWeek } from "@/lib/engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "@/lib/mockData";

vi.mock("@/app/dashboard/actions", () => ({ saveActivityCheckIn: vi.fn() }));

import ScheduleCheckInView from "./ScheduleCheckInView";

describe("ScheduleCheckInView", () => {
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

    expect(markup).toMatch(
      /WEDNESDAY<\/h2><span[^>]*>0 min planned of 1 h 30 min<\/span>/
    );
  });
});
