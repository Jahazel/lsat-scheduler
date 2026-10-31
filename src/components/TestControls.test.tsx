// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminTestProvider, CurrentWeekReport } from "./AdminTestContext";
const mocks = vi.hoisted(() => ({ move: vi.fn(), rebuild: vi.fn(), data: vi.fn(), everything: vi.fn(), push: vi.fn(), refresh: vi.fn(), sample: vi.fn() }));
vi.mock("@/app/admin/test/actions", () => ({ setSimulatedDate: mocks.move, rebuildThisWeek: mocks.rebuild, resetTestData: mocks.data, resetEverything: mocks.everything, generateTestSample: mocks.sample }));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard", useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
import { FailureToastProvider } from "./FailureNotice";
import TestControls from "./TestControls";
const state = { date: "2026-10-07", realDate: "2026-09-27", weekStartDate: "2026-10-05", simulated: true, onboarded: true, weekHasSchedule: true, uploadWeekend: false };
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());
describe("Test controls", () => {
  it("Generate sample opens the weekly upload", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TestControls state={{ ...state, weekHasSchedule: false }} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Generate sample" }));
    expect(mocks.sample).toHaveBeenCalledWith("steady");
    expect(mocks.push).toHaveBeenCalledWith("/dashboard/upload");
    expect(onClose).toHaveBeenCalled();
  });
  it.each([
    ["a weekday whose week has a weekly schedule", { weekHasSchedule: true, uploadWeekend: false }, false],
    ["a weekday with no weekly schedule yet", { weekHasSchedule: false, uploadWeekend: false }, true],
    ["the weekend", { weekHasSchedule: true, uploadWeekend: true }, true],
  ])("sets Generate sample on or off for %s", (_name, week, open) => {
    render(<TestControls state={{ ...state, ...week }} onClose={() => {}} />);
    expect((screen.getByRole("button", { name: "Generate sample" }) as HTMLButtonElement).disabled).toBe(!open);
    expect(!!screen.queryByText("The weekly upload is closed this week. Reset test data, or move the simulated date to Saturday.")).toBe(!open);
  });
  it("turns Generate sample off once This week reports a new weekly schedule", () => {
    render(
      <AdminTestProvider>
        <CurrentWeekReport week={state.weekStartDate} hasSchedule />
        <TestControls state={{ ...state, weekHasSchedule: false }} onClose={() => {}} />
      </AdminTestProvider>,
    );
    expect((screen.getByRole("button", { name: "Generate sample" }) as HTMLButtonElement).disabled).toBe(true);
  });
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
    await user.click(screen.getByRole("button", { name: "Th 8, move to Oct 8, 2026" }));
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
    render(<TestControls state={{ ...state, weekHasSchedule: false }} onClose={() => {}} />);
    expect((screen.getByRole("button", { name: "Rebuild this week" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Reset test data" }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("keeps rebuild available after leaving This week when a weekly schedule exists", () => {
    const controls = <TestControls state={{ ...state, weekHasSchedule: false }} onClose={() => {}} />;
    const view = render(
      <AdminTestProvider>
        <CurrentWeekReport week={state.weekStartDate} hasSchedule />
        {controls}
      </AdminTestProvider>,
    );
    view.rerender(<AdminTestProvider>{controls}</AdminTestProvider>);
    expect((screen.getByRole("button", { name: "Rebuild this week" }) as HTMLButtonElement).disabled).toBe(false);
  });
  it.each(["Reset test data", "Reset everything"])("disables rebuild after %s succeeds", async (label) => {
    const user = userEvent.setup();
    const controls = <TestControls state={{ ...state, weekHasSchedule: false }} onClose={() => {}} />;
    const view = render(
      <AdminTestProvider>
        <CurrentWeekReport week={state.weekStartDate} hasSchedule />
        {controls}
      </AdminTestProvider>,
    );
    view.rerender(<AdminTestProvider>{controls}</AdminTestProvider>);
    expect((screen.getByRole("button", { name: "Rebuild this week" }) as HTMLButtonElement).disabled).toBe(false);

    await user.click(screen.getByRole("button", { name: label }));
    await user.click(screen.getByRole("button", { name: "Confirm reset" }));
    await screen.findByText(`${label} complete.`);
    expect((screen.getByRole("button", { name: "Rebuild this week" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("keeps rebuild available when a reset fails", async () => {
    mocks.data.mockRejectedValueOnce(new Error("Reset failed."));
    const user = userEvent.setup();
    const controls = <TestControls state={{ ...state, weekHasSchedule: false }} onClose={() => {}} />;
    const view = render(
      <AdminTestProvider>
        <CurrentWeekReport week={state.weekStartDate} hasSchedule />
        {controls}
      </AdminTestProvider>,
    );
    view.rerender(<AdminTestProvider>{controls}</AdminTestProvider>);

    await user.click(screen.getByRole("button", { name: "Reset test data" }));
    await user.click(screen.getByRole("button", { name: "Confirm reset" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Reset failed.");
    expect((screen.getByRole("button", { name: "Rebuild this week" }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("shows the failure toast, not a completion message, when a control fails unexpectedly", async () => {
    mocks.rebuild.mockResolvedValueOnce({ unexpectedFailure: "3f9a01c2" });
    const user = userEvent.setup();
    render(<TestControls state={state} onClose={() => {}} />, { wrapper: FailureToastProvider });
    await user.click(screen.getByRole("button", { name: "Rebuild this week" }));
    await user.click(screen.getByRole("button", { name: "Confirm rebuild" }));
    const toast = await screen.findByRole("alert");
    expect(toast.textContent).toContain("Something went wrong. Try again.");
    expect(toast.textContent).toContain("Error code 3f9a01c2");
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.queryByText("Rebuild this week complete.")).toBeNull();
    expect(mocks.push).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Confirm rebuild" }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("shows the rebuild error instead of a completion message", async () => {
    mocks.rebuild.mockRejectedValueOnce(new Error("There is no weekly schedule to rebuild."));
    const user = userEvent.setup();
    render(<TestControls state={state} onClose={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Rebuild this week" }));
    await user.click(screen.getByRole("button", { name: "Confirm rebuild" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "There is no weekly schedule to rebuild.");
    expect(screen.queryByText("Rebuild this week complete.")).toBeNull();
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it("clears the completion message when another reset confirmation opens", async () => {
    const user = userEvent.setup();
    render(<TestControls state={state} onClose={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Reset test data" }));
    await user.click(screen.getByRole("button", { name: "Confirm reset" }));
    await screen.findByText("Reset test data complete.");
    await user.click(screen.getByRole("button", { name: "Reset everything" }));
    expect(screen.queryByText("Reset test data complete.")).toBeNull();
  });
  it("clears the reset error when another reset confirmation opens", async () => {
    mocks.data.mockRejectedValueOnce(new Error("Reset failed."));
    const user = userEvent.setup();
    render(<TestControls state={state} onClose={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Reset test data" }));
    await user.click(screen.getByRole("button", { name: "Confirm reset" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Reset everything" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("keeps keyboard focus when a reset confirmation opens and is cancelled", async () => {
    const user = userEvent.setup();
    render(<TestControls state={state} onClose={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Reset test data" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Reset test data" }));
  });
  it("starts each day's name with its visible text", () => {
    render(<TestControls state={state} onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Mo 5 Past, Oct 5, 2026" })).toBeDefined();
    expect(screen.getByRole("button", { name: "We 7 Today, Oct 7, 2026" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Su 11, move to Oct 11, 2026" })).toBeDefined();
  });
  it("fades past days but shows today at full strength", () => {
    render(<TestControls state={state} onClose={() => {}} />);
    expect(screen.getByRole("button", { name: /Past, Oct 5, 2026/ }).className).toContain("opacity-50");
    expect(screen.getByRole("button", { name: /Today, Oct 7, 2026/ }).className).not.toContain("opacity-50");
  });
});
