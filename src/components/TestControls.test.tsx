// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const mocks = vi.hoisted(() => ({ move: vi.fn(), rebuild: vi.fn(), data: vi.fn(), everything: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock("@/app/admin/test/actions", () => ({ setSimulatedDate: mocks.move, rebuildThisWeek: mocks.rebuild, resetTestData: mocks.data, resetEverything: mocks.everything, generateTestSample: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
import TestControls from "./TestControls";
const state = { date: "2026-10-07", realDate: "2026-09-27", weekStartDate: "2026-10-05", simulated: true, onboarded: true, canRebuild: true };
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());
describe("Test controls", () => {
  it("labels past and current dates visibly without relying on color", () => {
    render(<TestControls state={state} onClose={() => {}} />);
    const past = screen.getByRole("button", { name: /Oct 5, 2026/ });
    expect(within(past).getByText("Past").className).not.toContain("sr-only");
    expect((past as HTMLButtonElement).disabled).toBe(true);
    const current = screen.getByRole("button", { name: /Oct 7, 2026/ });
    expect(within(current).getByText("Today")).toBeDefined();
    expect(current.getAttribute("aria-current")).toBe("date");
  });
  it("moves to a later simulated date and displays its formatted date", async () => {
    const user = userEvent.setup();
    render(<TestControls state={state} onClose={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Move to Oct 8, 2026" }));
    expect(mocks.move).toHaveBeenCalledWith("2026-10-08");
    expect(await screen.findByText("Moved to Oct 8, 2026.")).toBeDefined();
  });
  it.each([
    ["Rebuild this week", "Confirm rebuild", "rebuild", "/dashboard", false],
    ["Reset test data", "Confirm reset", "data", "/dashboard", true],
    ["Reset everything", "Confirm reset", "everything", "/onboarding", true],
  ] as const)("confirms %s and opens the correct destination", async (label, confirm, action, destination, resetsDate) => {
    const user = userEvent.setup();
    render(<TestControls state={state} onClose={() => {}} />);
    await user.click(screen.getByRole("button", { name: label }));
    expect(!!screen.queryByText("Returns to the real date.")).toBe(resetsDate);
    expect(mocks[action]).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: confirm }));
    expect(mocks[action]).toHaveBeenCalledOnce();
    expect(mocks.push).toHaveBeenCalledWith(destination);
  });
  it("disables only rebuild when there is no weekly schedule", () => {
    render(<TestControls state={{ ...state, canRebuild: false }} onClose={() => {}} />);
    expect((screen.getByRole("button", { name: "Rebuild this week" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Reset test data" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
