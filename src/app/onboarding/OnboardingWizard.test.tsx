// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ExtractReply } from "@/lib/screenshotUpload";
import { upcomingTestMonths } from "@/lib/studentProfile";
import OnboardingWizard from "./OnboardingWizard";

afterEach(cleanup);

function continueButton() {
  return screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement;
}

const screenshot = new File(["png"], "7sage-analytics.png", { type: "image/png" });
const rows: ExtractReply = {
  kind: "rows",
  rows: [
    { type: "Strengthen", category: "regular", accuracy: 68 },
    { type: "Causal reasoning", category: "restricted", isTopPriority: true },
  ],
};

async function fillGoalAndWeek(onSave = vi.fn(async () => {}), extract = vi.fn(async (): Promise<ExtractReply> => rows)) {
  const user = userEvent.setup();
  render(<OnboardingWizard goalTestDateOptions={upcomingTestMonths("2026-10-18")} onSave={onSave} extract={extract} />);

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
  return { user, onSave, extract };
}

function checkTheValues() {
  return screen.getByRole("button", { name: "Check the values" }) as HTMLButtonElement;
}

async function upload(user: ReturnType<typeof userEvent.setup>, file = screenshot) {
  await user.upload(screen.getByLabelText("Screenshot file"), file);
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

  it("ties each out-of-range score box to its own message", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard goalTestDateOptions={upcomingTestMonths("2026-10-18")} onSave={vi.fn()} />);

    await user.type(screen.getByLabelText("Current PT score"), "15");
    await user.type(screen.getByLabelText("Goal score"), "19");
    await user.tab();

    expect(screen.getByLabelText("Current PT score").getAttribute("aria-describedby")).toBe("current-score-message");
    expect(document.getElementById("current-score-message")?.textContent).toBe("LSAT scores go from 120 to 180. Check your current score.");
    expect(screen.getByLabelText("Goal score").getAttribute("aria-describedby")).toBe("goal-score-message");
    expect(document.getElementById("goal-score-message")?.textContent).toBe("LSAT scores go from 120 to 180. Check your goal score.");
  });

  it("moves focus to the step heading on Continue and on Back", async () => {
    const { user } = await fillGoalAndWeek();

    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Add your 7Sage analytics" }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Set your target" }));
  });

  describe("Step 3 · Analytics", () => {
    it("opens the file picker from the drop zone with Enter or Space", async () => {
      const { user } = await fillGoalAndWeek();
      const picker = screen.getByLabelText("Screenshot file") as HTMLInputElement;
      const openPicker = vi.spyOn(picker, "click");

      const zone = screen.getByRole("button", { name: /Drop your screenshot here/ });
      zone.focus();
      await user.keyboard("{Enter}");
      await user.keyboard(" ");

      expect(openPicker).toHaveBeenCalledTimes(2);
    });

    it("reads the rows and moves to Step 4 with Check the values", async () => {
      let finishRead: (reply: ExtractReply) => void = () => {};
      const extract = vi.fn(() => new Promise<ExtractReply>((resolve) => { finishRead = resolve; }));
      const { user } = await fillGoalAndWeek(undefined, extract);
      expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(true);

      await upload(user);
      expect(screen.getByText("7sage-analytics.png")).toBeDefined();
      expect(screen.getByText("Reading your screenshot…")).toBeDefined();
      expect(screen.getByRole("progressbar", { name: "Reading your screenshot" })).toBeDefined();
      expect(checkTheValues().disabled).toBe(true);
      expect(screen.getByRole("button", { name: "Skip for now" })).toBeDefined();

      finishRead(rows);
      expect(await screen.findByText("Found · 2 rows")).toBeDefined();
      expect(screen.getByRole("rowheader", { name: "Strengthen" })).toBeDefined();
      expect(screen.getByText("68%")).toBeDefined();
      expect(screen.getByText("Highest priority")).toBeDefined();
      await user.click(checkTheValues());

      expect(screen.getByText("Step 4 of 4 · Review")).toBeDefined();
      await user.click(screen.getByRole("button", { name: "Back" }));
      expect(screen.getByText("Found · 2 rows")).toBeDefined();
      expect(extract).toHaveBeenCalledWith(screenshot);
    });

    it("keeps the file on a lost connection and resends it with Try again", async () => {
      const extract = vi.fn<(file: File) => Promise<ExtractReply>>()
        .mockResolvedValueOnce({ kind: "connection-lost" })
        .mockResolvedValueOnce(rows);
      const { user } = await fillGoalAndWeek(undefined, extract);

      await upload(user);
      const status = await screen.findByText("Connection lost. Your file is still here.");
      expect(status.className).not.toContain("red");
      await user.click(screen.getByRole("button", { name: "Try again" }));

      expect(await screen.findByText("Found · 2 rows")).toBeDefined();
      expect(extract).toHaveBeenCalledTimes(2);
      expect(extract.mock.calls[1][0]).toBe(screenshot);
    });

    it("asks for a sharper screenshot when the server cannot read it", async () => {
      const { user } = await fillGoalAndWeek(undefined, vi.fn(async (): Promise<ExtractReply> => ({ kind: "cannot-read" })));

      await upload(user);

      expect(await screen.findByText("We couldn't read the rows in it.")).toBeDefined();
      expect(screen.getByRole("button", { name: "Choose a sharper screenshot" })).toBeDefined();
      expect(checkTheValues().disabled).toBe(true);
    });

    it("shows the right part of 7Sage when a read finds zero rows, and never reaches Review", async () => {
      const extract = vi.fn<(file: File) => Promise<ExtractReply>>()
        .mockResolvedValueOnce({ kind: "rows", rows: [] })
        .mockResolvedValueOnce(rows);
      const { user } = await fillGoalAndWeek(undefined, extract);

      await upload(user, new File(["png"], "progress-chart.png", { type: "image/png" }));

      expect(await screen.findByText("No question types in this one.")).toBeDefined();
      expect(screen.getByText("Capture this part of 7Sage Analytics")).toBeDefined();
      expect(checkTheValues().disabled).toBe(true);
      await user.click(checkTheValues());
      expect(screen.queryByText("Step 4 of 4 · Review")).toBeNull();

      await upload(user);
      expect(await screen.findByText("Found · 2 rows")).toBeDefined();
      expect(screen.getByText("7sage-analytics.png")).toBeDefined();
    });

    it("rejects a wrong type or a file over 4 MB before any upload", async () => {
      const { user, extract } = await fillGoalAndWeek();

      fireEvent.drop(screen.getByRole("button", { name: /Drop your screenshot here/ }), {
        dataTransfer: { files: [new File(["%PDF"], "study-notes.pdf", { type: "application/pdf" })] },
      });
      expect(screen.getByRole("alert").textContent).toBe("study-notes.pdf is a PDF. Choose a PNG, JPG, or WEBP screenshot.");

      const big = new File(["png"], "huge.png", { type: "image/png" });
      Object.defineProperty(big, "size", { value: 12.4 * 1024 * 1024 });
      await upload(user, big);
      expect(screen.getByRole("alert").textContent).toBe("That file is 12.4 MB. Choose one that is 4 MB or less.");
      expect(extract).not.toHaveBeenCalled();
    });

    it("shows Drop to add it while a file is dragged over the zone", async () => {
      await fillGoalAndWeek();
      const zone = screen.getByRole("button", { name: /Drop your screenshot here/ });

      fireEvent.dragOver(zone);
      expect(zone.textContent).toContain("Drop to add it");
      fireEvent.dragLeave(zone);
      expect(zone.textContent).toContain("Drop your screenshot here");
    });

    it("drops a late reply for a screenshot that was replaced", async () => {
      const replies: ((reply: ExtractReply) => void)[] = [];
      const extract = vi.fn(() => new Promise<ExtractReply>((resolve) => { replies.push(resolve); }));
      const { user } = await fillGoalAndWeek(undefined, extract);

      await upload(user, new File(["png"], "first.png", { type: "image/png" }));
      await upload(user);
      replies[0]({ kind: "cannot-read" });
      replies[1](rows);

      expect(await screen.findByText("Found · 2 rows")).toBeDefined();
      expect(screen.queryByText("We couldn't read the rows in it.")).toBeNull();
    });
  });
});
