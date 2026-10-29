// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { generateWeek } from "@/lib/engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "@/lib/mockData";
import type { ActivityCheckIn } from "@/lib/types";

vi.mock("@/app/dashboard/actions", () => ({ saveActivityCheckIn: vi.fn() }));

import PastWeekView from "./PastWeekView";

afterEach(cleanup);

const week = (weekStartDate: string, label: string, done: number, total: number) =>
  ({ weekStartDate, label, done, total, completionPercent: Math.round((done / total) * 100) });
const thisWeek = week("2026-08-24", "Aug 24 – 30", 1, 18);
const older = week("2026-08-10", "Aug 10 – 16", 7, 14);
const newer = week("2026-08-31", "Aug 31 – Sep 6", 4, 13);

function renderWeek(neighbors: { older?: typeof older; newer?: typeof newer }, checkIns: ActivityCheckIn[] = []) {
  render(
    <PastWeekView
      schedule={{ id: "schedule-1", schedule: generateWeek(mockStudent, mockAnalytics, mockRules, mockStudentName), generationInputs: { student: mockStudent } }}
      checkIns={checkIns}
      week={thisWeek}
      {...neighbors}
    />,
  );
}

const hrefs = (name: RegExp) => screen.queryAllByRole("link", { name }).map((link) => link.getAttribute("href"));
const pager = () => screen.queryByRole("navigation", { name: "Older and newer weeks" });

describe("PastWeekView", () => {
  it("shows the week as a read-only past week with a way back to the list", () => {
    renderWeek({});

    expect(screen.getByRole("heading", { level: 1, name: "Week of Aug 24" })).toBeTruthy();
    expect(screen.getByText("Past week")).toBeTruthy();
    expect(screen.getByText("1 of 18 done")).toBeTruthy();
    expect(screen.getByRole("link", { name: "← All weeks" }).getAttribute("href")).toBe("/progress");
    expect(screen.queryAllByRole("checkbox")).toEqual([]);
  });

  it("links a middle week to both neighbors in the header and the bottom pager", () => {
    renderWeek({ older, newer });

    expect(hrefs(/Older week/)).toEqual(["/progress?week=2026-08-10", "/progress?week=2026-08-10"]);
    expect(hrefs(/Newer week/)).toEqual(["/progress?week=2026-08-31", "/progress?week=2026-08-31"]);
    expect(within(pager()!).getByText("Aug 10 – 16")).toBeTruthy();
    expect(within(pager()!).getByText("7 of 14 done")).toBeTruthy();
    expect(within(pager()!).getByText("Aug 31 – Sep 6")).toBeTruthy();
    expect(within(pager()!).getByText("4 of 13 done")).toBeTruthy();
  });

  it("gives the newest week only Older", () => {
    renderWeek({ older });

    expect(hrefs(/Older week/)).toHaveLength(2);
    expect(hrefs(/Newer week/)).toEqual([]);
  });

  it("gives the oldest week only Newer", () => {
    renderWeek({ newer });

    expect(hrefs(/Older week/)).toEqual([]);
    expect(hrefs(/Newer week/)).toHaveLength(2);
  });

  it("gives the only week no Older, no Newer, and no pager", () => {
    renderWeek({});

    expect(hrefs(/Older week|Newer week/)).toEqual([]);
    expect(pager()).toBeNull();
  });

  it("marks a one-activity day All done when its activity is done", () => {
    renderWeek({}, [{ scheduleId: "schedule-1", activityId: "SATURDAY:0", status: "completed" }]);
    const day = (name: string) => screen.getByRole("heading", { level: 2, name: new RegExp(`^${name}`) }).closest("section")!;

    expect(within(day("Saturday")).getByText("All done")).toBeTruthy();
    expect(within(day("Sunday")).queryByText("All done")).toBeNull();
  });
});
