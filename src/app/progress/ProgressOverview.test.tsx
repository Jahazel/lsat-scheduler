// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import ProgressOverview from "./ProgressOverview";

afterEach(cleanup);

const week = (weekStartDate: string, label: string, done: number, total: number) =>
  ({ weekStartDate, label, done, total, completionPercent: Math.round((done / total) * 100) });

describe("ProgressOverview", () => {
  it("shows one card per month with its week count and a row per week that opens it", () => {
    render(<ProgressOverview months={[
      { month: "October 2026", weeks: [week("2026-10-19", "Oct 19 – 25", 9, 14), week("2026-10-12", "Oct 12 – 18", 12, 12)] },
      { month: "September 2026", weeks: [week("2026-09-28", "Sep 28 – Oct 4", 10, 12)] },
    ]} />);

    expect(screen.getByRole("heading", { level: 1, name: "Progress" })).toBeTruthy();
    expect(screen.getByText("Your past weekly schedules. Open one to see what you planned and checked off.")).toBeTruthy();

    const october = screen.getByRole("region", { name: "October 2026" });
    expect(within(october).getByText("2 weeks")).toBeTruthy();
    const rows = within(october).getAllByRole("link");
    expect(rows.map((row) => row.getAttribute("href"))).toEqual(["/progress?week=2026-10-19", "/progress?week=2026-10-12"]);
    expect(within(rows[0]).getByText("Oct 19 – 25")).toBeTruthy();
    expect(within(rows[0]).getByText("9 of 14 done")).toBeTruthy();

    const september = screen.getByRole("region", { name: "September 2026" });
    expect(within(september).getByText("1 week")).toBeTruthy();
    expect(within(september).getByRole("link", { name: /Sep 28 – Oct 4/ }).getAttribute("href")).toBe("/progress?week=2026-09-28");
  });

  it("leaves out completion stats and planned hours", () => {
    render(<ProgressOverview months={[{ month: "October 2026", weeks: [week("2026-10-19", "Oct 19 – 25", 9, 14)] }]} />);

    expect(screen.queryByText(/Avg\. done|Streak|Best week|h planned/)).toBeNull();
  });

  it("points a student with no past weeks to This week", () => {
    render(<ProgressOverview months={[]} />);

    expect(screen.getByText("No past weeks yet.")).toBeTruthy();
    expect(screen.getByText("Each week shows up here after it ends.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go to This week →" }).getAttribute("href")).toBe("/dashboard");
    expect(screen.queryByRole("region")).toBeNull();
  });
});
