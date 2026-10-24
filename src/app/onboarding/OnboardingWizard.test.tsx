// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SECTION_NAME } from "@/lib/analyticsReview";
import type { ExtractReply } from "@/lib/screenshotUpload";
import type { AnalyticsExtractedRow, AnalyticsSection } from "@/lib/types";
import { upcomingTestMonths } from "@/lib/studentProfile";
import OnboardingWizard from "./OnboardingWizard";

beforeEach(() => {
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = vi.fn(() => "blob:screenshot");
      static revokeObjectURL = vi.fn();
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function continueButton() {
  return screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement;
}

const student = { firstName: "Dana", initials: "DR", today: "2026-10-19" };
const preview = () => within(screen.getByRole("complementary", { name: "Preview of This week" }));

const screenshot = new File(["png"], "lr-analytics.png", { type: "image/png" });
const rcScreenshot = new File(["png"], "rc-analytics.png", { type: "image/png" });
const rows: ExtractReply = {
  kind: "rows",
  rows: [
    { type: "Strengthen", category: "regular", accuracy: 68 },
    { type: "Causal reasoning", category: "restricted", isTopPriority: true },
  ],
};
const rcRows: ExtractReply = {
  kind: "rows",
  rows: [
    { type: "Law", category: "passage", accuracy: 58 },
    { type: "Comparative", category: "passage", accuracy: 70 },
    { type: "Science", category: "passage", accuracy: 64 },
    { type: "Humanities", category: "passage", accuracy: 81 },
    { type: "Art", category: "passage", accuracy: 77 },
  ],
};

type Extract = (file: File, section: AnalyticsSection) => Promise<ExtractReply>;
const bySection = (lr: ExtractReply = rows, rc: ExtractReply = rcRows) =>
  vi.fn<Extract>(async (_file, section) => (section === "LR" ? lr : rc));

async function fillGoalAndWeek(onSave = vi.fn(async () => {}), extract: Extract = bySection()) {
  const user = userEvent.setup();
  render(<OnboardingWizard {...student} goalTestDateOptions={upcomingTestMonths("2026-10-18")} onSave={onSave} extract={extract} />);

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
  expect(screen.getByText("A full practice test takes 3 h 8 with 1.5× time.")).toBeDefined();
  expect(screen.queryByRole("status")).toBeNull();
  await user.click(continueButton());

  expect(screen.getByText("Step 3 of 4 · Analytics")).toBeDefined();
  return { user, onSave, extract };
}

function checkTheValues() {
  return screen.getByRole("button", { name: "Check the values" }) as HTMLButtonElement;
}

async function upload(user: ReturnType<typeof userEvent.setup>, file = screenshot, section: AnalyticsSection = "LR") {
  await user.upload(screen.getByLabelText(`${SECTION_NAME[section]} screenshot file`), file);
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
      officialAttempts: [],
      analyticsRows: [],
      analyticsApproval: null,
    });
  });

  describe("Step 1 · Official LSAT attempts", () => {
    async function goal(onSave = vi.fn(async () => {})) {
      const user = userEvent.setup();
      render(<OnboardingWizard {...student} goalTestDateOptions={upcomingTestMonths("2026-10-18")} onSave={onSave} extract={bySection()} />);
      await user.type(screen.getByLabelText("Current PT score"), "150");
      await user.type(screen.getByLabelText("Goal score"), "165");
      await user.selectOptions(screen.getByLabelText("Goal test date"), "November 2026");
      return { user, onSave };
    }

    it("hides the rows for None yet and shows one row and Add another attempt for I've taken it", async () => {
      const { user } = await goal();

      expect(screen.getByText("For your record. It does not change your plan.")).toBeDefined();
      expect((screen.getByLabelText("None yet") as HTMLInputElement).checked).toBe(true);
      expect(screen.queryByLabelText("Attempt 1 score")).toBeNull();
      expect(continueButton().disabled).toBe(false);

      await user.click(screen.getByLabelText("I've taken it"));
      expect(screen.getByLabelText("Attempt 1 score")).toBeDefined();
      expect(screen.queryByLabelText("Attempt 2 score")).toBeNull();
      expect(screen.queryByRole("button", { name: "Remove attempt 1" })).toBeNull();
      expect(screen.getByRole("button", { name: "Add another attempt" })).toBeDefined();
      expect(continueButton().disabled).toBe(true);
      expect(screen.getByText("Enter a score and month for each attempt to continue.")).toBeDefined();

      await user.click(screen.getByLabelText("None yet"));
      expect(screen.queryByLabelText("Attempt 1 score")).toBeNull();
      expect(continueButton().disabled).toBe(false);
    });

    it("shows each attempt's error under its row once focus leaves the row, and keeps Continue off", async () => {
      const { user } = await goal();
      await user.click(screen.getByLabelText("I've taken it"));

      await user.type(screen.getByLabelText("Attempt 1 score"), "190");
      expect(screen.queryByText("LSAT scores go from 120 to 180. Check this attempt's score.")).toBeNull();
      await user.tab();

      const score = screen.getByLabelText("Attempt 1 score");
      expect(score.getAttribute("aria-invalid")).toBe("true");
      expect(document.getElementById(score.getAttribute("aria-describedby") ?? "")?.textContent).toBe(
        "LSAT scores go from 120 to 180. Check this attempt's score.",
      );
      expect(continueButton().disabled).toBe(true);
      expect(screen.getByText("Fix your attempts above to continue.")).toBeDefined();

      await user.selectOptions(screen.getByLabelText("Attempt 1 month and year"), "June 2025");
      await user.clear(score);
      await user.type(score, "152");
      await user.click(screen.getByRole("button", { name: "Add another attempt" }));
      await user.type(screen.getByLabelText("Attempt 2 score"), "149");
      await user.tab();
      expect(screen.queryByText("Pick the month of this attempt.")).toBeNull();
      await user.click(screen.getByLabelText("Goal score"));
      const month = screen.getByLabelText("Attempt 2 month and year");
      expect(month.getAttribute("aria-invalid")).toBe("true");
      expect(screen.getByText("Pick the month of this attempt.")).toBeDefined();
      expect(continueButton().disabled).toBe(true);
    });

    it("removes a row and saves two attempts with the profile", async () => {
      const { user, onSave } = await goal();
      await user.click(screen.getByLabelText("I've taken it"));
      await user.type(screen.getByLabelText("Attempt 1 score"), "152");
      await user.selectOptions(screen.getByLabelText("Attempt 1 month and year"), "June 2025");
      await user.click(screen.getByRole("button", { name: "Add another attempt" }));
      await user.type(screen.getByLabelText("Attempt 2 score"), "140");
      await user.click(screen.getByRole("button", { name: "Add another attempt" }));
      await user.type(screen.getByLabelText("Attempt 3 score"), "149");
      await user.selectOptions(screen.getByLabelText("Attempt 3 month and year"), "January 2026");
      await user.click(screen.getByRole("button", { name: "Remove attempt 2" }));

      expect((screen.getByLabelText("Attempt 2 score") as HTMLInputElement).value).toBe("149");
      expect(screen.queryByLabelText("Attempt 3 score")).toBeNull();
      await user.click(continueButton());
      await user.click(screen.getByLabelText("Practice test on Saturday"));
      await user.click(continueButton());
      await user.click(screen.getByRole("button", { name: "Skip for now" }));

      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        officialAttempts: [
          { score: 152, month: "2025-06" },
          { score: 149, month: "2026-01" },
        ],
      }));
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
    render(<OnboardingWizard {...student} goalTestDateOptions={upcomingTestMonths("2026-10-18")} onSave={vi.fn()} />);

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
      const picker = screen.getByLabelText("Logical Reasoning screenshot file") as HTMLInputElement;
      const openPicker = vi.spyOn(picker, "click");

      const zone = screen.getByRole("button", { name: /Logical Reasoning screenshot/ });
      zone.focus();
      await user.keyboard("{Enter}");
      await user.keyboard(" ");

      expect(openPicker).toHaveBeenCalledTimes(2);
    });

    it("shows one drop zone per section and the steps to find each screenshot", async () => {
      await fillGoalAndWeek();

      expect(screen.getByRole("button", { name: /Logical Reasoning screenshot/ })).toBeDefined();
      expect(screen.getByRole("button", { name: /Reading Comprehension screenshot/ })).toBeDefined();
      expect(screen.getByText(/Show the passage types: Law, Comparative, Science, Humanities, and Art\./)).toBeDefined();
      expect(screen.getByText(/Your schedule starts after you add both\./)).toBeDefined();
    });

    it("reads each screenshot on its own and moves to Step 4 once both are read", async () => {
      let finishRead: (reply: ExtractReply) => void = () => {};
      const extract = vi.fn<Extract>((_file, section) =>
        section === "LR" ? new Promise<ExtractReply>((resolve) => { finishRead = resolve; }) : Promise.resolve(rcRows));
      const { user } = await fillGoalAndWeek(undefined, extract);
      expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(true);

      await upload(user);
      expect(screen.getByText("lr-analytics.png · Reading…")).toBeDefined();
      expect(screen.getByRole("progressbar", { name: "Reading your Logical Reasoning screenshot" })).toBeDefined();
      expect(checkTheValues().disabled).toBe(true);
      expect(screen.getByRole("button", { name: "Skip for now" })).toBeDefined();

      finishRead(rows);
      expect(await screen.findByText("Logical Reasoning · found so far, 2 rows")).toBeDefined();
      expect(screen.getByRole("rowheader", { name: "Strengthen" })).toBeDefined();
      expect(within(screen.getByRole("table")).getByText("68%")).toBeDefined();
      expect(screen.getByText("Highest priority")).toBeDefined();
      expect(checkTheValues().disabled).toBe(true);

      await upload(user, rcScreenshot, "RC");
      expect(await screen.findByText("rc-analytics.png · 5 passage types")).toBeDefined();
      expect(screen.getByText("Logical Reasoning · found 2 rows")).toBeDefined();
      expect(screen.getByText("You can replace either screenshot before you confirm.")).toBeDefined();
      await user.click(checkTheValues());

      expect(screen.getByText("Step 4 of 4 · Review")).toBeDefined();
      await user.click(screen.getByRole("button", { name: "Back" }));
      expect(screen.getByText("Logical Reasoning · found 2 rows")).toBeDefined();
      expect(extract).toHaveBeenCalledWith(screenshot, "LR");
      expect(extract).toHaveBeenCalledWith(rcScreenshot, "RC");
    });

    it("keeps the file on a lost connection and resends it with Try again", async () => {
      const extract = vi.fn<Extract>()
        .mockResolvedValueOnce({ kind: "connection-lost" })
        .mockResolvedValueOnce(rows);
      const { user } = await fillGoalAndWeek(undefined, extract);

      await upload(user);
      const status = await screen.findByText(/Connection lost\. Your file is still here\./);
      expect(status.closest("[aria-live]")?.className).not.toContain("danger");
      await user.click(screen.getByRole("button", { name: "Try again" }));

      expect(await screen.findByText("Logical Reasoning · found so far, 2 rows")).toBeDefined();
      expect(extract).toHaveBeenCalledTimes(2);
      expect(extract.mock.calls[1][0]).toBe(screenshot);
    });

    it("says the sign-in expired and links to sign in, with no Try again", async () => {
      const { user } = await fillGoalAndWeek(undefined, vi.fn(async (): Promise<ExtractReply> => ({ kind: "signed-out" })));

      await upload(user);

      expect(await screen.findByText(/Your sign-in expired\. Sign in again, then upload your screenshot again\./)).toBeDefined();
      expect(screen.getByRole("link", { name: "Sign in again" }).getAttribute("href")).toBe("/login");
      expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    });

    it("asks for a sharper screenshot when the server cannot read it", async () => {
      const { user } = await fillGoalAndWeek(undefined, vi.fn(async (): Promise<ExtractReply> => ({ kind: "cannot-read" })));

      await upload(user);

      expect(await screen.findByText(/We couldn't read the rows in it\./)).toBeDefined();
      expect(screen.getByRole("button", { name: "Choose a sharper screenshot" })).toBeDefined();
      expect(checkTheValues().disabled).toBe(true);
    });

    it("shows the right part of 7Sage when a read finds zero rows, and never reaches Review", async () => {
      const extract = vi.fn<Extract>()
        .mockResolvedValueOnce({ kind: "rows", rows: [] })
        .mockResolvedValueOnce(rows)
        .mockResolvedValueOnce(rcRows);
      const { user } = await fillGoalAndWeek(undefined, extract);

      await upload(user, new File(["png"], "progress-chart.png", { type: "image/png" }));

      expect(await screen.findByText(/No question types in this one\./)).toBeDefined();
      expect(screen.getByText("Capture this part of 7Sage Analytics")).toBeDefined();
      expect(screen.getByText("Logical Reasoning question types")).toBeDefined();
      expect(checkTheValues().disabled).toBe(true);
      await user.click(checkTheValues());
      expect(screen.queryByText("Step 4 of 4 · Review")).toBeNull();

      await upload(user);
      expect(await screen.findByText("Logical Reasoning · found so far, 2 rows")).toBeDefined();
      expect(screen.getByText(/lr-analytics\.png/)).toBeDefined();

      await upload(user, rcScreenshot, "RC");
      expect(await screen.findByText("rc-analytics.png · 5 passage types")).toBeDefined();
      expect(checkTheValues().disabled).toBe(false);
    });

    it("rejects a wrong type before any upload", async () => {
      const { extract } = await fillGoalAndWeek();

      fireEvent.drop(screen.getByRole("button", { name: /Logical Reasoning screenshot/ }), {
        dataTransfer: { files: [new File(["%PDF"], "study-notes.pdf", { type: "application/pdf" })] },
      });
      expect(screen.getByRole("alert").textContent).toBe("That file is not a PNG, JPG, or WEBP. Choose a screenshot in one of those types.");
      expect(extract).not.toHaveBeenCalled();
    });

    it("returns focus to the drop zone when the server rejects the file", async () => {
      const message = "That file is not a PNG, JPG, or WEBP. Choose a screenshot in one of those types.";
      let reject: (reply: ExtractReply) => void = () => {};
      const extract = vi.fn(() => new Promise<ExtractReply>((resolve) => { reject = resolve; }));
      const { user } = await fillGoalAndWeek(undefined, extract);

      await upload(user);
      screen.getByRole("button", { name: "Replace" }).focus();
      reject({ kind: "rejected", message });

      expect((await screen.findByRole("alert")).textContent).toBe(message);
      expect(document.activeElement).toBe(screen.getByRole("button", { name: /Logical Reasoning screenshot/ }));
    });

    it("leaves focus where the student moved it when the server rejects the file", async () => {
      let reject: (reply: ExtractReply) => void = () => {};
      const extract = vi.fn(() => new Promise<ExtractReply>((resolve) => { reject = resolve; }));
      const { user } = await fillGoalAndWeek(undefined, extract);

      await upload(user);
      const skip = screen.getByRole("button", { name: "Skip for now" });
      skip.focus();
      reject({ kind: "rejected", message: "That file is 4.2 MB. Choose one that is 4 MB or less." });

      await screen.findByRole("alert");
      expect(document.activeElement).toBe(skip);
    });

    it("shows Drop to add it while a file is dragged over the zone", async () => {
      await fillGoalAndWeek();
      const zone = screen.getByRole("button", { name: /Reading Comprehension screenshot/ });

      fireEvent.dragOver(zone);
      expect(zone.textContent).toContain("Drop to add it");
      expect(screen.getByRole("button", { name: /Logical Reasoning screenshot/ }).textContent).not.toContain("Drop to add it");
      fireEvent.dragLeave(zone);
      expect(zone.textContent).toContain("Drop it here");
    });

    it("drops a late reply for a screenshot that was replaced", async () => {
      const replies: ((reply: ExtractReply) => void)[] = [];
      const extract = vi.fn(() => new Promise<ExtractReply>((resolve) => { replies.push(resolve); }));
      const { user } = await fillGoalAndWeek(undefined, extract);

      await upload(user, new File(["png"], "first.png", { type: "image/png" }));
      await upload(user);
      replies[0]({ kind: "cannot-read" });
      replies[1](rows);

      expect(await screen.findByText("Logical Reasoning · found so far, 2 rows")).toBeDefined();
      expect(screen.queryByText(/We couldn't read the rows in it\./)).toBeNull();
    });
  });

  describe("Step 4 · Review", () => {
    const read: ExtractReply = {
      kind: "rows",
      rows: [
        { type: "Strengthen", category: "regular", accuracy: 68 },
        { type: "Necessary assumption", category: "regular", accuracy: 71 },
        { type: "Causal reasoning", category: "restricted", isTopPriority: true, priorityTier: "highest" },
        { type: "Link assumption", category: "restricted", isTopPriority: false, priorityTier: "medium" },
      ],
    };

    async function openReview(onSave = vi.fn(async () => {}), reply = read, rcReply = rcRows) {
      const steps = await fillGoalAndWeek(onSave, bySection(reply, rcReply));
      await upload(steps.user);
      await upload(steps.user, rcScreenshot, "RC");
      await steps.user.click(await screen.findByRole("button", { name: "Check the values" }));
      expect(screen.getByText("Step 4 of 4 · Review")).toBeDefined();
      return steps;
    }

    const box = (type: string) => screen.getByLabelText(`${type} accuracy`) as HTMLInputElement;
    const confirmButton = () => screen.getByRole("button", { name: "Confirm snapshot" });
    const statements = ["I reviewed these values and they match my screenshots.", "These screenshots show my latest 7Sage analytics."];

    it("walks Goal → Week → Analytics → Review → Confirm and sends the edited values and ticked flags", async () => {
      const { user, onSave } = await openReview();

      expect(screen.getByText("Accuracy · 2 types")).toBeDefined();
      expect(box("Strengthen").value).toBe("68");
      expect((screen.getByLabelText("Causal reasoning") as HTMLInputElement).checked).toBe(true);
      expect(screen.getByText("Highest on 7Sage")).toBeDefined();
      expect((screen.getByLabelText("Link assumption") as HTMLInputElement).checked).toBe(false);
      expect(screen.getByText("Medium on 7Sage")).toBeDefined();
      expect(confirmButton().getAttribute("aria-disabled")).toBe("true");
      expect(screen.getByText("Tick both statements to confirm.")).toBeDefined();

      await user.clear(box("Necessary assumption"));
      await user.type(box("Necessary assumption"), "76");
      expect(screen.getByText("was 71%")).toBeDefined();
      await user.click(screen.getByLabelText("Causal reasoning"));
      await user.click(screen.getByLabelText("Link assumption"));
      await user.click(screen.getByRole("button", { name: "Remove Strengthen" }));
      for (const statement of statements) await user.click(screen.getByLabelText(statement));
      expect(confirmButton().getAttribute("aria-disabled")).toBeNull();
      await user.click(confirmButton());

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        currentScore: 150,
        goalScore: 165,
        preferredPracticeTestDay: "FRIDAY",
        analyticsRows: [
          { type: "Necessary assumption", category: "regular", accuracy: 76 },
          { type: "Causal reasoning", category: "restricted", isTopPriority: false, priorityTier: "highest" },
          { type: "Link assumption", category: "restricted", isTopPriority: true, priorityTier: "medium" },
          ...(rcRows.kind === "rows" ? rcRows.rows : []),
        ],
        analyticsApproval: {
          extraction: { source: "7sage_screenshot", extractedAt: expect.any(String) },
          confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt: expect.any(String) },
        },
      }));
    });

    it("locks Confirm on a wrong value and moves focus to that box on a press", async () => {
      const { user, onSave } = await openReview();

      await user.clear(box("Necessary assumption"));
      await user.type(box("Necessary assumption"), "104");
      await user.tab();
      expect(screen.getByText("Enter a percentage from 0 to 100.")).toBeDefined();
      await user.clear(box("Strengthen"));
      for (const statement of statements) await user.click(screen.getByLabelText(statement));
      expect(screen.getByText("Fix 2 values above to confirm.")).toBeDefined();

      await user.click(confirmButton());
      expect(onSave).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(box("Strengthen"));
      expect(screen.getByText("Enter the percentage, or remove this row with ×.")).toBeDefined();
      expect(box("Strengthen").getAttribute("aria-invalid")).toBe("true");
      await user.type(box("Strengthen"), "-5");
      await user.tab();
      expect(box("Strengthen").value).toBe("-5");
      const message = document.getElementById(box("Strengthen").getAttribute("aria-describedby") ?? "");
      expect(message?.textContent).toBe("Enter a percentage from 0 to 100.");
      await user.clear(box("Strengthen"));
      await user.type(box("Strengthen"), "9.5");
      await user.clear(box("Necessary assumption"));
      await user.type(box("Necessary assumption"), "76");
      for (const statement of statements) await user.click(screen.getByLabelText(statement));
      await user.click(confirmButton());
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        analyticsRows: expect.arrayContaining([
          { type: "Strengthen", category: "regular", accuracy: 9.5 },
          { type: "Necessary assumption", category: "regular", accuracy: 76 },
        ]),
      }));
    });

    it("adds a missed type from the search with the keyboard", async () => {
      const { user } = await openReview();
      const link = () => screen.getByRole("button", { name: "Add a type the screenshot missed" });

      await user.click(link());
      const search = screen.getByRole("combobox");
      expect(document.activeElement).toBe(search);
      await user.type(search, "su");
      expect(screen.getByRole("option", { name: /Most strongly supported/ }).getAttribute("aria-selected")).toBe("true");
      await user.keyboard("{ArrowDown}{Enter}");
      expect(box("Sufficient assumption").value).toBe("");
      expect(document.activeElement).toBe(box("Sufficient assumption"));
      expect(screen.getByText("Fix Sufficient assumption above to confirm.")).toBeDefined();

      await user.click(link());
      await user.type(screen.getByRole("combobox"), "link");
      expect(screen.getByText('No accuracy types match "link"')).toBeDefined();
      expect(screen.getByText('No priority flags match "link"')).toBeDefined();
      await user.clear(screen.getByRole("combobox"));
      await user.type(screen.getByRole("combobox"), "causal ch");
      await user.keyboard("{Enter}");
      expect((screen.getByLabelText("Causal chain") as HTMLInputElement).checked).toBe(false);
      expect(document.activeElement).toBe(link());

      await user.click(link());
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("combobox")).toBeNull();
      expect(document.activeElement).toBe(link());
    });

    it("locks Confirm when nothing would count and moves focus to the add-type link on a press", async () => {
      const { user, onSave } = await openReview();

      await user.click(screen.getByRole("button", { name: "Remove Strengthen" }));
      await user.click(screen.getByRole("button", { name: "Remove Necessary assumption" }));
      await user.click(screen.getByLabelText("Causal reasoning"));
      for (const statement of statements) await user.click(screen.getByLabelText(statement));
      expect(screen.getByText("Add an accuracy value or tick a flag to confirm.")).toBeDefined();

      await user.click(confirmButton());
      expect(onSave).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add a type the screenshot missed" }));
    });

    it("says so in one line when the read found no priority flags", async () => {
      await openReview(undefined, { kind: "rows", rows: [{ type: "Strengthen", category: "regular", accuracy: 68 }] });

      expect(screen.getByText("We didn't find priority flags in your LR screenshot. If 7Sage shows any, add them with the link below.")).toBeDefined();
    });

    it("shows Saving, then keeps every value and tick when the save fails", async () => {
      let failSave: (error: Error) => void = () => {};
      const onSave = vi.fn()
        .mockImplementationOnce(() => new Promise<void>((_, reject) => { failSave = reject; }))
        .mockResolvedValueOnce(undefined);
      const { user } = await openReview(onSave);
      for (const statement of statements) await user.click(screen.getByLabelText(statement));

      await user.click(confirmButton());
      expect(screen.getByRole("button", { name: "Saving…" })).toBeDefined();
      expect((screen.getByRole("button", { name: "Back" }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByText("Saving your plan. This takes a few seconds.")).toBeDefined();

      failSave(new Error("offline"));
      expect(await screen.findByText("We couldn't save your plan. Check your connection and press Confirm snapshot again.")).toBeDefined();
      expect((screen.getByLabelText(statements[1]) as HTMLInputElement).checked).toBe(true);
      await user.click(confirmButton());
      expect(onSave).toHaveBeenCalledTimes(2);
    });

    it("shows the server's refusal and keeps every tick when the snapshot save limit is reached", async () => {
      const refusal = "You've saved your analytics 5 times today. Try again tomorrow, after midnight Central time.";
      const onSave = vi.fn().mockResolvedValue({ error: refusal });
      const { user } = await openReview(onSave);
      for (const statement of statements) await user.click(screen.getByLabelText(statement));

      await user.click(confirmButton());
      expect(await screen.findByText(refusal)).toBeDefined();
      expect((screen.getByLabelText(statements[1]) as HTMLInputElement).checked).toBe(true);
      expect((confirmButton() as HTMLButtonElement).disabled).toBe(false);
    });

    it("expands each uploaded screenshot inline with Show your LR or RC screenshot", async () => {
      const { user } = await openReview();

      const toggle = screen.getByRole("button", { name: /Show your LR screenshot/ });
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      await user.click(toggle);
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      const inline = within(toggle.parentElement!);
      expect(inline.getByRole("img", { name: "Your 7Sage Logical Reasoning screenshot" }).getAttribute("src")).toBe("blob:screenshot");
      expect(URL.createObjectURL).toHaveBeenCalledWith(screenshot);
      await user.click(toggle);
      expect(inline.queryByRole("img", { name: "Your 7Sage Logical Reasoning screenshot" })).toBeNull();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:screenshot");

      await user.click(screen.getByRole("button", { name: /Show your RC screenshot/ }));
      expect(URL.createObjectURL).toHaveBeenCalledWith(rcScreenshot);
    });

    it("shows the 5 passage types with the lowest marked Goes first and no remove button", async () => {
      const { user } = await openReview();

      expect(screen.getByText("Passage types · lowest goes first in your plan")).toBeDefined();
      for (const type of ["Law", "Comparative", "Science", "Humanities", "Art"]) expect(box(type)).toBeDefined();
      expect(within(box("Law").closest("div")!.parentElement!).getByText("Goes first")).toBeDefined();
      expect(screen.queryByRole("button", { name: "Remove Law" })).toBeNull();

      await user.clear(box("Law"));
      await user.type(box("Law"), "90");
      expect(within(box("Science").closest("div")!.parentElement!).getByText("Goes first")).toBeDefined();
      expect(screen.getAllByText("Goes first")).toHaveLength(1);

      await user.clear(box("Science"));
      await user.type(box("Science"), "40");
      expect(within(box("Science").closest("div")!.parentElement!).getByText("Goes first")).toBeDefined();
    });

    it("saves only the passage types with a value when the RC screenshot misses some", async () => {
      const missingArt: ExtractReply = { kind: "rows", rows: rcRows.kind === "rows" ? rcRows.rows.slice(0, 4) : [] };
      const { user, onSave } = await openReview(undefined, read, missingArt);
      expect(box("Art").value).toBe("");
      expect(screen.queryByText("not found")).toBeNull();
      expect(screen.queryByText(/Enter/)).toBeNull();

      for (const statement of statements) await user.click(screen.getByLabelText(statement));
      await user.click(confirmButton());
      const [[profile]] = onSave.mock.calls as unknown as [[{ analyticsRows: AnalyticsExtractedRow[] }]];
      const saved = profile.analyticsRows.filter(({ category }) => category === "passage");
      expect(saved.map(({ type }) => type)).toEqual(["Law", "Comparative", "Science", "Humanities", "Art"]);
      expect(saved.find(({ type }) => type === "Art")?.accuracy).toBeUndefined();
    });

    it("approves an RC screenshot with no passage-type percentage", async () => {
      const { user, onSave } = await openReview(undefined, read, { kind: "rows", rows: [] });
      for (const type of ["Law", "Comparative", "Science", "Humanities", "Art"]) expect(box(type).value).toBe("");
      expect(screen.queryByText("Goes first")).toBeNull();

      for (const statement of statements) await user.click(screen.getByLabelText(statement));
      await user.click(confirmButton());
      expect(onSave).toHaveBeenCalled();
    });

    it("blocks a typed RC value outside 0 to 100 with its error", async () => {
      const missingArt: ExtractReply = { kind: "rows", rows: rcRows.kind === "rows" ? rcRows.rows.slice(0, 4) : [] };
      const { user, onSave } = await openReview(undefined, read, missingArt);
      await user.type(box("Art"), "177");
      for (const statement of statements) await user.click(screen.getByLabelText(statement));
      expect(screen.getByText("Fix Art above to confirm.")).toBeDefined();

      await user.click(confirmButton());
      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByText("Enter a percentage from 0 to 100.")).toBeDefined();
    });
  });

  it("mirrors each step in the This week preview", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard {...student} goalTestDateOptions={upcomingTestMonths("2026-10-18")} onSave={vi.fn()} extract={bySection()} />);

    expect(preview().getByText("Hi Dana · 7Sage · standard time")).toBeDefined();
    await user.type(screen.getByLabelText("Current PT score"), "150");
    await user.type(screen.getByLabelText("Goal score"), "165");
    await user.selectOptions(screen.getByLabelText("Goal test date"), "November 2026");
    await user.click(screen.getByLabelText("1.5× time"));
    expect(preview().getByText("Hi Dana · 7Sage · 1.5× time")).toBeDefined();
    expect(preview().getByText("150 → 165")).toBeDefined();
    expect(preview().getByText("by Nov 1 · 13 days away")).toBeDefined();
    expect(preview().getByText("13 days to test")).toBeDefined();
    expect(preview().queryByText(/of study/)).toBeNull();
    await user.click(continueButton());

    expect(preview().getByText("10 h 30 min of study · practice-test day not chosen")).toBeDefined();
    await user.click(screen.getByLabelText("Practice test on Saturday"));
    await user.selectOptions(screen.getByLabelText("Saturday hours"), "4");
    expect(preview().getByText("13 h 30 min of study · practice test on Saturday")).toBeDefined();
    expect(preview().getByText("4 h 30")).toBeDefined();
    expect(preview().getByText("Your drills fill in after you upload analytics.")).toBeDefined();
    await user.click(continueButton());

    await upload(user);
    expect(await preview().findByText("Extracted · not confirmed")).toBeDefined();
    expect(preview().getByText("Monday's drills")).toBeDefined();
    await upload(user, rcScreenshot, "RC");
    await user.click(await screen.findByRole("button", { name: "Check the values" }));

    expect(preview().getByText("Not confirmed yet")).toBeDefined();
    expect(preview().getByText("Your Monday from these values")).toBeDefined();
    expect(preview().getByRole("img", { name: "Your 7Sage Logical Reasoning screenshot" }).getAttribute("src")).toBe("blob:screenshot");
    expect(preview().getByRole("img", { name: "Your 7Sage Reading Comprehension screenshot" })).toBeDefined();
    expect(URL.createObjectURL).toHaveBeenCalledWith(screenshot);
    expect(URL.createObjectURL).toHaveBeenCalledWith(rcScreenshot);
  });
});

it("leaves the real URL in place after a test", () => {
  vi.unstubAllGlobals();
  expect("createObjectURL" in URL && vi.isMockFunction(URL.createObjectURL)).toBe(false);
});
