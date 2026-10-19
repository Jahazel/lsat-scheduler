// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { upcomingTestMonths } from "@/lib/studentProfile";
import OnboardingWizard from "./OnboardingWizard";

afterEach(cleanup);

function continueButton() {
  return screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement;
}

async function fillGoalAndWeek(onSave = vi.fn(async () => {})) {
  const user = userEvent.setup();
  render(<OnboardingWizard goalTestDateOptions={upcomingTestMonths("2026-10-18")} onSave={onSave} />);

  expect(screen.getByText("Step 1 of 4 · Goal")).toBeDefined();
  expect(continueButton().disabled).toBe(true);
  await user.type(screen.getByLabelText("Current PT score"), "150");
  await user.type(screen.getByLabelText("Goal score"), "148");
  await user.tab();
  expect(screen.getByText("Your goal must be higher than your current score, 150.")).toBeDefined();
  await user.clear(screen.getByLabelText("Goal score"));
  await user.type(screen.getByLabelText("Goal score"), "165");
  await user.selectOptions(screen.getByLabelText("Goal test date"), "November 2026");
  await user.click(screen.getByLabelText("1.5× time"));
  await user.click(continueButton());

  expect(screen.getByText("Step 2 of 4 · Week")).toBeDefined();
  expect(continueButton().disabled).toBe(true);
  expect(screen.getByText("Pick a practice-test day to continue.")).toBeDefined();
  await user.selectOptions(screen.getByLabelText("All days hours"), "2");
  await user.click(screen.getByRole("button", { name: "Apply" }));
  await user.selectOptions(screen.getByLabelText("Friday hours"), "1");
  await user.selectOptions(screen.getByLabelText("Friday minutes"), "0");
  await user.click(screen.getByLabelText("Practice test on Friday"));
  expect(screen.getByText("Friday has 1 h. A full practice test takes 3 h 8 min. Add time on Friday or pick another day.")).toBeDefined();
  await user.click(continueButton());

  expect(screen.getByText("Step 3 of 4 · Analytics")).toBeDefined();
  return { user, onSave };
}

describe("OnboardingWizard", () => {
  it("walks Goal → Week → Skip for now and saves the profile without analytics", async () => {
    const { user, onSave } = await fillGoalAndWeek();

    await user.click(screen.getByRole("button", { name: "Skip for now" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      currentScore: 150,
      goalScore: 165,
      goalTestDate: "2026-11-01",
      accommodationMultiplier: 1.5,
      dailyCapacityMinutes: { MONDAY: 150, TUESDAY: 150, WEDNESDAY: 150, THURSDAY: 150, FRIDAY: 60, SATURDAY: 150, SUNDAY: 150 },
      preferredPracticeTestDay: "FRIDAY",
      analyticsRows: [],
      analyticsApproval: null,
    });
  });

  it("keeps every value on Back", async () => {
    const { user } = await fillGoalAndWeek();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect((screen.getByLabelText("Practice test on Friday") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Monday hours") as HTMLSelectElement).value).toBe("2");
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect((screen.getByLabelText("Goal score") as HTMLInputElement).value).toBe("165");
    expect((screen.getByLabelText("1.5× time") as HTMLInputElement).checked).toBe(true);
  });

  it("shows Saving while the save runs and lets a failed save be pressed again", async () => {
    let failSave: (error: Error) => void = () => {};
    const onSave = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((_, reject) => { failSave = reject; }))
      .mockResolvedValueOnce(undefined);
    const { user } = await fillGoalAndWeek(onSave);

    await user.click(screen.getByRole("button", { name: "Skip for now" }));
    const saving = screen.getByRole("button", { name: "Saving…" }) as HTMLButtonElement;
    expect(saving.disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Back" }) as HTMLButtonElement).disabled).toBe(true);

    failSave(new Error("offline"));
    expect(await screen.findByText("We couldn't save your plan. Check your connection and press Skip for now again.")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(onSave).toHaveBeenCalledTimes(2);
  });
});
