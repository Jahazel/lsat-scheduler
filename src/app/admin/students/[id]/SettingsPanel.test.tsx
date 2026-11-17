// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { Student } from "@/lib/types";
import { SettingsPanel } from "./SettingsPanel";

afterEach(cleanup);

const maya: Student = {
  currentScore: 158,
  goalScore: 170,
  goalTestDate: "2027-01-01",
  accommodationMultiplier: 1.5,
  preferredPracticeTestDay: "SATURDAY",
  dailyCapacityMinutes: { MONDAY: 120, TUESDAY: 120, WEDNESDAY: 90, THURSDAY: 120, FRIDAY: 30, SATURDAY: 300, SUNDAY: 150 },
};

function show(student: Partial<Student> = {}, attempts = [{ month: "2026-06", score: 152 }, { month: "2026-09", score: 156 }], today = "2026-11-17") {
  return render(<SettingsPanel settings={{ ...maya, ...student }} officialAttempts={attempts} today={today} />);
}
const card = (name: string) => screen.getByRole("region", { name });
const fieldsIn = (region: HTMLElement) => {
  const values = within(region).getAllByRole("definition").map((value) => value.textContent);
  return within(region).getAllByRole("term").map((label, index) => `${label.textContent}: ${values[index]}`);
};

describe("Settings & tests", () => {
  it("shows the goal as locked fields with no way to edit them", () => {
    show();
    expect(screen.getByRole("heading", { level: 2, name: "Settings & tests" })).toBeTruthy();
    expect(screen.getByText("What the student sees in Study settings")).toBeTruthy();
    expect(fieldsIn(card("Goal"))).toEqual(["Current PT score: 158", "Goal score: 170", "Goal test month: January 2027", "Test time: 1.5× time"]);
    for (const role of ["textbox", "combobox", "spinbutton", "radio", "checkbox", "button"] as const) expect(screen.queryByRole(role)).toBeNull();
  });

  it("shows a passed goal test month by name with a Passed tag", () => {
    show({ goalTestDate: "2026-11-01" });
    expect(fieldsIn(card("Goal"))).toContain("Goal test month: November 2026Passed");
    cleanup();
    show({ goalTestDate: "2026-10-01" }, [], "2026-10-01");
    expect(fieldsIn(card("Goal"))).toContain("Goal test month: October 2026Passed");
    cleanup();
    show({ goalTestDate: "2027-01-01" }, [], "2026-12-31");
    expect(within(card("Goal")).queryByText("Passed")).toBeNull();
  });

  it("lists each day's study time with the practice test day tagged, and the practice test length", () => {
    show();
    const week = card("Week");
    expect(within(week).getByText("15 h 30 min of study")).toBeTruthy();
    const rows = within(week).getAllByRole("row").map((row) => [within(row).getByRole("rowheader"), ...within(row).getAllByRole("cell")].map((cell) => cell.textContent).filter(Boolean).join(" "));
    expect(rows).toEqual(["Monday 2 h", "Tuesday 2 h", "Wednesday 1 h 30", "Thursday 2 h", "Friday 30 min", "Saturday 5 h Practice test", "Sunday 2 h 30"]);
    expect(within(week).getByText(/^A full practice test takes .+ with 1\.5× time\.$/)).toBeTruthy();
  });

  it("lists official attempts newest first, or says there are none", () => {
    show();
    const attempts = card("Official LSAT attempts");
    expect(within(attempts).getByText("2 attempts")).toBeTruthy();
    expect(within(attempts).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "156September 2026",
      "152June 2026",
      "For the student's record. Attempts do not change the plan.",
    ]);
    cleanup();
    show({}, []);
    expect(within(card("Official LSAT attempts")).getByText("No official attempts yet.")).toBeTruthy();
  });
});
