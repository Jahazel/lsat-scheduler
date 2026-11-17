// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockAnalytics, mockStudent } from "@/lib/mockData";
import { copiedInputs, presetInputs, readLabLink, type CopiedStudent } from "@/lib/scheduleLab";

const saveActivityCheckIn = vi.hoisted(() => vi.fn());
vi.mock("@/app/dashboard/actions", () => ({ saveActivityCheckIn }));

import { ScheduleLab } from "./ScheduleLab";

const THIS_WEEK = "2026-11-16";
const maya: CopiedStudent = { id: "s1", name: "Maya Thompson", uploadedOn: "2026-11-13", trend: { ...mockAnalytics, rcTypesInNewestSnapshot: [] } };

beforeEach(() => window.history.replaceState(null, "", "/admin/lab"));
afterEach(cleanup);

const inputs = () => screen.getByRole("region", { name: "Inputs" });
const reasons = () => screen.getByRole("region", { name: "Schedule reasons" });
const linkInputs = () => readLabLink(new URLSearchParams(window.location.search).get("lab") ?? "", THIS_WEEK);

function openOnSteady() {
  return render(<ScheduleLab thisWeek={THIS_WEEK} start={presetInputs("steady", THIS_WEEK)} copied={null} />);
}

describe("Schedule lab", () => {
  it("opens on Steady with the week built and its schedule reasons above the days", () => {
    openOnSteady();
    expect((within(inputs()).getByRole("combobox", { name: "Preset" }) as HTMLSelectElement).value).toBe("steady");
    expect(screen.getByRole("heading", { level: 2, name: "Week 1 · Nov 16" })).toBeTruthy();
    expect(within(reasons()).getByText("Planned from Steady sample")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Built week" })).getByText("Monday")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("lists the six presets", () => {
    openOnSteady();
    const preset = within(inputs()).getByRole("combobox", { name: "Preset" });
    expect(within(preset).getAllByRole("option").map((o) => o.textContent)).toEqual(["Improving", "Steady", "Slipping", "2× time", "Test in 3 weeks", "30 min days"]);
  });

  it("rebuilds in place on Test in 3 weeks, with the second practice test and its reason", async () => {
    openOnSteady();
    await userEvent.selectOptions(within(inputs()).getByRole("combobox", { name: "Preset" }), "Test in 3 weeks");
    expect(screen.getByRole("heading", { level: 2, name: "Week 1 · Dec 21" })).toBeTruthy();
    expect(within(reasons()).getByText("Near-test week")).toBeTruthy();
    expect(within(reasons()).getByText(/2 LawHub practice tests before your January 1 test/)).toBeTruthy();
    expect(screen.getAllByText(/Practice test 2 of 2/)).toHaveLength(1);
    expect(linkInputs()).toEqual(presetInputs("soon", THIS_WEEK));
  });

  it("rebuilds when a sample direction changes, and keeps it in the page link", async () => {
    openOnSteady();
    await userEvent.click(within(inputs()).getByRole("radio", { name: "Slipping" }));
    expect(within(reasons()).getByText("Planned from Slipping sample")).toBeTruthy();
    expect(linkInputs()?.analytics).toEqual({ kind: "sample", direction: "slipping" });
  });

  it("keeps the last week that built while a value is out of range", async () => {
    openOnSteady();
    const goal = within(inputs()).getByRole("textbox", { name: "Goal score" });
    await userEvent.clear(goal);
    await userEvent.type(goal, "20");
    expect(goal.getAttribute("aria-invalid")).toBe("true");
    expect(within(inputs()).getByText("LSAT scores go from 120 to 180. Check your goal score.")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Showing the last week that built. Fix the goal score.");
    expect(screen.getByRole("heading", { level: 2, name: "Week 1 · Nov 16" })).toBeTruthy();
    expect(linkInputs()?.goal).toBe("20");
  });

  it("shows where a copied student came from and plans from their upload", () => {
    render(<ScheduleLab thisWeek={THIS_WEEK} start={copiedInputs(mockStudent, maya, THIS_WEEK)} copied={maya} />);
    expect(within(inputs()).getByText((_, node) => node?.tagName === "P" && node.textContent === "Copied from Maya Thompson, Nov 13. Edits here do not change the student.")).toBeTruthy();
    expect((within(inputs()).getByRole("combobox", { name: "Preset" }) as HTMLSelectElement).selectedOptions[0]!.textContent).toBe("Maya Thompson (copied)");
    expect((within(inputs()).getByRole("radio", { name: "Their upload" }) as HTMLInputElement).checked).toBe(true);
    expect(within(reasons()).getByText("Planned from Maya Thompson's latest upload")).toBeTruthy();
  });

  it("says a copied student without analytics started from Steady", () => {
    const copied = { ...maya, uploadedOn: null, trend: null };
    render(<ScheduleLab thisWeek={THIS_WEEK} start={copiedInputs(mockStudent, copied, THIS_WEEK)} copied={copied} />);
    expect(within(inputs()).getByText((_, node) => node?.tagName === "P" && node.textContent === "Maya Thompson has no analytics yet, so the lab started from the Steady preset.")).toBeTruthy();
    expect(within(inputs()).queryByRole("radio", { name: "Their upload" })).toBeNull();
    expect(within(reasons()).getByText("Planned from Steady sample")).toBeTruthy();
  });

  it("drops the copy when a preset is picked", async () => {
    render(<ScheduleLab thisWeek={THIS_WEEK} start={copiedInputs(mockStudent, maya, THIS_WEEK)} copied={maya} />);
    await userEvent.selectOptions(within(inputs()).getByRole("combobox", { name: "Preset" }), "Steady");
    expect(within(inputs()).queryByText(/Copied from/)).toBeNull();
    expect(linkInputs()?.copiedFrom).toBeNull();
  });

  it("builds Next week from this one and moves back without dropping it", async () => {
    openOnSteady();
    await userEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByRole("heading", { level: 2, name: "Week 2 · Nov 23" })).toBeTruthy();
    expect(within(reasons()).getByText("Planned from Steady sample, week 2 upload")).toBeTruthy();
    expect(linkInputs()).toMatchObject({ built: 2, shown: 1 });
    await userEvent.click(screen.getByRole("button", { name: "Earlier week" }));
    expect(screen.getByRole("heading", { level: 2, name: "Week 1 · Nov 16" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Earlier week" }) as HTMLButtonElement).disabled).toBe(true);
    expect(linkInputs()).toMatchObject({ built: 2, shown: 0 });
  });

  it("opens the built count and shown week from the page link", () => {
    render(<ScheduleLab thisWeek={THIS_WEEK} start={{ ...presetInputs("steady", THIS_WEEK), built: 4, shown: 2 }} copied={null} />);
    expect(screen.getByRole("heading", { level: 2, name: "Week 3 · Nov 30" })).toBeTruthy();
  });

  it("stops before the goal test month, says why, and turns Next week off", async () => {
    openOnSteady();
    await userEvent.selectOptions(within(inputs()).getByRole("combobox", { name: "Preset" }), "Test in 3 weeks");
    expect(within(reasons()).queryByText(/Last week in the chain/)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByRole("heading", { level: 2, name: "Week 2 · Dec 28" })).toBeTruthy();
    expect(within(reasons()).getByText("Last week in the chain. The January 2027 test comes before the week of Jan 4.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Next week" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps the last chain while a value is out of range, and still moves through it", async () => {
    render(<ScheduleLab thisWeek={THIS_WEEK} start={{ ...presetInputs("steady", THIS_WEEK), built: 2, shown: 1 }} copied={null} />);
    const goal = within(inputs()).getByRole("textbox", { name: "Goal score" });
    await userEvent.clear(goal);
    await userEvent.type(goal, "20");
    expect(screen.getByRole("heading", { level: 2, name: "Week 2 · Nov 23" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Earlier week" }));
    expect(screen.getByRole("heading", { level: 2, name: "Week 1 · Nov 16" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Next week" }));
    await userEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByRole("heading", { level: 2, name: "Week 3 · Nov 30" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Showing the last week that built. Fix the goal score.");
    expect(linkInputs()).toMatchObject({ goal: "20", built: 3, shown: 2 });
  });

  it("saves nothing", async () => {
    openOnSteady();
    await userEvent.click(within(inputs()).getByRole("radio", { name: "Improving" }));
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(saveActivityCheckIn).not.toHaveBeenCalled();
  });
});
