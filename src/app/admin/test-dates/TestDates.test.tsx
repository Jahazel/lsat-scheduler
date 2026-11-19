// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const actions = vi.hoisted(() => ({ addTestMonthFromForm: vi.fn(), removeTestMonthFromForm: vi.fn() }));
vi.mock("./actions", () => actions);
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/test-dates" }));

import { TestDates } from "./TestDates";

const MONTHS = [
  { month: "2026-11-01", students: 0 },
  { month: "2027-01-01", students: 1 },
  { month: "2027-06-01", students: 3 },
];

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

const rows = () => within(screen.getByRole("region", { name: "Test months" })).getAllByRole("listitem");

describe("Test dates", () => {
  it("lists every month, newest last, with how many students picked it", () => {
    render(<TestDates months={MONTHS} today="2026-11-19" />);
    expect(rows().map((row) => row.textContent)).toEqual([
      "November 2026Passed · No students picked itRemove",
      "January 2027Picked by 1 studentRemove",
      "June 2027Picked by 3 studentsRemove",
    ]);
    expect(screen.getByText("2 upcoming")).toBeTruthy();
  });

  it("adds the picked month and says students can pick it", async () => {
    actions.addTestMonthFromForm.mockResolvedValue({ added: "2027-08-01" });
    render(<TestDates months={MONTHS} today="2026-11-19" />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Month" }), "August");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Year" }), "2027");
    await userEvent.click(screen.getByRole("button", { name: "Add month" }));
    const form = actions.addTestMonthFromForm.mock.calls[0]![1] as FormData;
    expect([form.get("month"), form.get("year")]).toEqual(["8", "2027"]);
    expect(await screen.findByText("Added August 2027. Students can pick it now.")).toBeTruthy();
  });

  it("offers this year and the next three", () => {
    render(<TestDates months={MONTHS} today="2026-11-19" />);
    const years = within(screen.getByRole("combobox", { name: "Year" })).getAllByRole("option").map((option) => option.textContent);
    expect(years).toEqual(["2026", "2027", "2028", "2029"]);
  });

  it("says when the month is already on the list", async () => {
    actions.addTestMonthFromForm.mockResolvedValue({ listed: "2027-06-01" });
    render(<TestDates months={MONTHS} today="2026-11-19" />);
    await userEvent.click(screen.getByRole("button", { name: "Add month" }));
    expect(await screen.findByText("June 2027 is already on the list.")).toBeTruthy();
  });

  it("shows the student count when removing a picked month is refused", async () => {
    actions.removeTestMonthFromForm.mockResolvedValue({ picked: 3 });
    render(<TestDates months={MONTHS} today="2026-11-19" />);
    await userEvent.click(screen.getByRole("button", { name: "Remove June 2027" }));
    expect((actions.removeTestMonthFromForm.mock.calls[0]![1] as FormData).get("month")).toBe("2027-06-01");
    const refusal = await screen.findByText("3 students picked June 2027 as their goal, so it stays on the list.");
    expect(screen.getByRole("button", { name: "Remove June 2027" }).getAttribute("aria-describedby")).toBe(refusal.id);
  });

  it("says students cannot pick a month when the list is empty", () => {
    render(<TestDates months={[]} today="2026-11-19" />);
    expect(screen.getByText(/No test months yet/)).toBeTruthy();
  });
});
