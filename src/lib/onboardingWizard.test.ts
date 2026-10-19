import { describe, expect, it } from "vitest";
import {
  accuracyMessage,
  addTypeOptions,
  boxText,
  blockedReason,
  confirmSnapshotInput,
  emptyListNote,
  initialWizardState,
  practiceTestHint,
  practiceTestMinutes,
  previewHeader,
  previewDrills,
  previewWeek,
  scoreMessages,
  shortDayWarning,
  toProfileInput,
  stepLabel,
  wizardReducer,
  type WizardAction,
  type WizardState,
} from "./onboardingWizard";
import { generateWeek } from "./engine";
import { mockRules } from "./mockData";
import type { AnalyticsExtractedRow } from "./types";

function run(...actions: WizardAction[]): WizardState {
  return actions.reduce(wizardReducer, initialWizardState());
}

const READ_AT = new Date("2026-10-19T15:00:00.000Z");

const validGoal: WizardAction = {
  type: "edit",
  values: { currentScore: "150", goalScore: "165", goalTestDate: "2026-11-01" },
};

describe("onboarding wizard", () => {
  it("starts on Step 1 with no scores, no test date, and no practice-test day", () => {
    const state = initialWizardState();

    expect(stepLabel(state.step)).toBe("Step 1 of 4 · Goal");
    expect(state.values.currentScore).toBe("");
    expect(state.values.goalTestDate).toBe("");
    expect(state.values.preferredPracticeTestDay).toBeNull();
    expect(blockedReason(state)).toBe("Enter both scores to continue.");
  });

  it("shows a score's range message only after focus leaves that box", () => {
    const typing = run({ type: "edit", values: { currentScore: "15", goalScore: "165" } });
    expect(scoreMessages(typing).currentScore).toBeNull();

    const left = wizardReducer(typing, { type: "leaveScoreBox", box: "currentScore" });
    expect(scoreMessages(left).currentScore).toBe("LSAT scores go from 120 to 180. Check your current score.");
    expect(blockedReason(left)).toBe("Fix your scores above to continue.");
  });

  it("holds the goal-above-current message while a score is out of range", () => {
    const state = run(
      { type: "edit", values: { currentScore: "15", goalScore: "148" } },
      { type: "leaveScoreBox", box: "currentScore" },
      { type: "leaveScoreBox", box: "goalScore" },
    );
    expect(scoreMessages(state)).toEqual({
      currentScore: "LSAT scores go from 120 to 180. Check your current score.",
      goalScore: null,
      goalNotAbove: null,
    });

    const fixed = wizardReducer(state, { type: "edit", values: { currentScore: "150" } });
    expect(scoreMessages(fixed).goalNotAbove).toBe("Your goal must be higher than your current score, 150.");
    expect(blockedReason(fixed)).toBe("Fix your scores above to continue.");
  });

  it("asks for a goal test date once the scores are valid", () => {
    const state = run({ type: "edit", values: { currentScore: "150", goalScore: "165" } }, { type: "continue" });

    expect(state.step).toBe("goal");
    expect(blockedReason(state)).toBe("Pick a goal test date to continue.");
  });

  it("blocks Week until a practice-test day is chosen, then moves on", () => {
    const week = run(validGoal, { type: "continue" });
    expect(stepLabel(week.step)).toBe("Step 2 of 4 · Week");
    expect(blockedReason(week)).toBe("Pick a practice-test day to continue.");
    expect(wizardReducer(week, { type: "continue" }).step).toBe("week");

    const analytics = run(validGoal, { type: "continue" }, { type: "edit", values: { preferredPracticeTestDay: "SATURDAY" } }, { type: "continue" });
    expect(stepLabel(analytics.step)).toBe("Step 3 of 4 · Analytics");
  });

  it("keeps every value on Back", () => {
    const state = run(
      validGoal,
      { type: "edit", values: { accommodationMultiplier: 2 } },
      { type: "continue" },
      { type: "edit", values: { allDaysMinutes: 120, preferredPracticeTestDay: "FRIDAY" } },
      { type: "applyAllDays" },
      { type: "continue" },
      { type: "back" },
      { type: "back" },
    );

    expect(state.step).toBe("goal");
    expect(state.values).toMatchObject({ currentScore: "150", goalScore: "165", accommodationMultiplier: 2, preferredPracticeTestDay: "FRIDAY", allDaysMinutes: 120 });
    expect(state.values.dailyCapacityMinutes.SUNDAY).toBe(120);
  });

  it("sizes the practice test by Test time, as the weekly schedule does", () => {
    expect([practiceTestMinutes(1), practiceTestMinutes(1.5), practiceTestMinutes(2)]).toEqual([150, 188, 225]);
    expect(practiceTestHint(1)).toBe(
      "A full practice test takes 2 h 30 min with standard time. Pick a day with that much time.",
    );
    expect(practiceTestHint(2)).toBe(
      "A full practice test takes 3 h 45 min with 2× time. Pick a day with that much time.",
    );
  });

  it("warns, without blocking, when the practice-test day is too short", () => {
    const state = run(
      validGoal,
      { type: "continue" },
      { type: "edit", values: { preferredPracticeTestDay: "FRIDAY", dailyCapacityMinutes: { ...initialWizardState().values.dailyCapacityMinutes, FRIDAY: 60 } } },
    );

    expect(shortDayWarning(state.values)).toBe(
      "Friday has 1 h. A full practice test takes 2 h 30 min. Add time on Friday or pick another day.",
    );
    expect(blockedReason(state)).toBeNull();
    expect(shortDayWarning({ ...state.values, preferredPracticeTestDay: "MONDAY", dailyCapacityMinutes: { ...state.values.dailyCapacityMinutes, MONDAY: 150 } })).toBeNull();
  });

  it("ignores edits and Back while the save runs, and allows a retry after it fails", () => {
    const ready = run(validGoal, { type: "continue" }, { type: "edit", values: { preferredPracticeTestDay: "SATURDAY" } }, { type: "continue" });
    const saving = wizardReducer(ready, { type: "saveStarted" });

    expect(saving.save).toBe("saving");
    expect(wizardReducer(saving, { type: "back" })).toBe(saving);
    const failed = wizardReducer(saving, { type: "saveFailed" });
    expect(wizardReducer(failed, { type: "saveStarted" }).save).toBe("saving");
    expect(toProfileInput(failed.values)).toEqual({
      currentScore: 150,
      goalScore: 165,
      goalTestDate: "2026-11-01",
      accommodationMultiplier: 1,
      dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
      preferredPracticeTestDay: "SATURDAY",
    });
  });

  it("returns to the drop zone with the server's message when it rejects the file", () => {
    const file = new File(["png"], "huge.png", { type: "image/png" });
    const reading = run({ type: "readStarted", file });
    const message = "That file is 4.2 MB. Choose one that is 4 MB or less.";

    const rejected = wizardReducer(reading, { type: "readEnded", attempt: 1, reply: { kind: "rejected", message }, at: READ_AT });

    expect(rejected.screenshot).toEqual({ status: "none" });
    expect(rejected.screenshotRejection).toBe(message);
    expect(wizardReducer(rejected, { type: "readStarted", file }).screenshotRejection).toBeNull();
  });

  it("keeps a read that ends while Skip for now is saving", () => {
    const ready = run(validGoal, { type: "continue" }, { type: "edit", values: { preferredPracticeTestDay: "SATURDAY" } }, { type: "continue" });
    const reading = wizardReducer(ready, { type: "readStarted", file: new File(["png"], "a.png", { type: "image/png" }) });
    const saving = wizardReducer(reading, { type: "saveStarted" });

    const ended = wizardReducer(saving, { type: "readEnded", attempt: 1, reply: { kind: "connection-lost" }, at: READ_AT });

    expect(ended.screenshot.status).toBe("connection-lost");
  });

  describe("Step 4 · Review", () => {
    const readRows: AnalyticsExtractedRow[] = [
      { type: "Diagram", category: "regular", accuracy: 64 },
      { type: "Necessary assumption", category: "regular", accuracy: 71 },
      { type: "Causal reasoning", category: "restricted", isTopPriority: true, priorityTier: "highest" },
      { type: "Link assumption", category: "restricted", isTopPriority: false, priorityTier: "medium" },
    ];

    function onReview(rows = readRows, ...actions: WizardAction[]): WizardState {
      return run(
        validGoal,
        { type: "continue" },
        { type: "edit", values: { preferredPracticeTestDay: "SATURDAY" } },
        { type: "continue" },
        { type: "readStarted", file: new File(["png"], "7sage-analytics.png", { type: "image/png" }) },
        { type: "readEnded", attempt: 1, reply: { kind: "rows", rows }, at: READ_AT },
        { type: "continue" },
        ...actions,
      );
    }

    const tickBoth: WizardAction[] = [
      { type: "setStatement", statement: "extractedValuesMatch", checked: true, at: READ_AT },
      { type: "setStatement", statement: "isLatestAnalytics", checked: true, at: READ_AT },
    ];

    it("asks for both statements before Confirm snapshot works", () => {
      expect(blockedReason(onReview())).toBe("Tick both statements to confirm.");
      expect(confirmSnapshotInput(onReview())).toBeNull();
      expect(blockedReason(onReview(readRows, ...tickBoth))).toBeNull();
    });

    it("shows a box's message only after focus leaves it", () => {
      const typing = onReview(readRows, { type: "editAccuracy", rowType: "Diagram", text: "104" });
      expect(accuracyMessage(typing, "Diagram")).toBeNull();
      expect(blockedReason(typing)).toBe("Fix Diagram above to confirm.");

      const left = wizardReducer(typing, { type: "leaveAccuracyBox", rowType: "Diagram" });
      expect(accuracyMessage(left, "Diagram")).toBe("Enter a percentage from 0 to 100.");

      const cleared = wizardReducer(left, { type: "editAccuracy", rowType: "Diagram", text: "" });
      expect(accuracyMessage(cleared, "Diagram")).toBe("Enter the percentage, or remove this row with ×.");
    });

    it("keeps what the student typed and saves a decimal as typed", () => {
      const decimal = onReview(readRows, { type: "editAccuracy", rowType: "Diagram", text: "9.5" }, ...tickBoth);
      expect(confirmSnapshotInput(decimal)?.analyticsRows[0]).toEqual({ type: "Diagram", category: "regular", accuracy: 9.5 });

      for (const text of ["9.", "-5", "7a"]) {
        const state = onReview(readRows, ...tickBoth, { type: "editAccuracy", rowType: "Diagram", text }, { type: "leaveAccuracyBox", rowType: "Diagram" }, ...tickBoth);
        expect(boxText(state, "Diagram")).toBe(text);
        expect(accuracyMessage(state, "Diagram")).toBe("Enter a percentage from 0 to 100.");
        expect(blockedReason(state)).toBe("Fix Diagram above to confirm.");
        expect(confirmSnapshotInput(state)).toBeNull();
      }
      const readded = onReview(
        readRows,
        { type: "editAccuracy", rowType: "Diagram", text: "9.5" },
        { type: "removeRow", rowType: "Diagram" },
        { type: "addType", rowType: "Diagram" },
      );
      expect(boxText(readded, "Diagram")).toBe("");
      const over = onReview(readRows, { type: "editAccuracy", rowType: "Diagram", text: "1000" }, { type: "leaveAccuracyBox", rowType: "Diagram" });
      expect(accuracyMessage(over, "Diagram")).toBe("Enter a percentage from 0 to 100.");
    });

    it("accepts a decimal read from the screenshot after focus leaves its box", () => {
      const decimalRead = [{ ...readRows[0], accuracy: 9.5 }, ...readRows.slice(1)];
      const state = onReview(decimalRead, { type: "leaveAccuracyBox", rowType: "Diagram" }, ...tickBoth);
      expect(accuracyMessage(state, "Diagram")).toBeNull();
      expect(confirmSnapshotInput(state)?.analyticsRows[0].accuracy).toBe(9.5);
    });

    it("locks Confirm when no accuracy value or ticked flag is left", () => {
      const state = onReview(
        readRows,
        { type: "removeRow", rowType: "Diagram" },
        { type: "removeRow", rowType: "Necessary assumption" },
        { type: "toggleFlag", rowType: "Causal reasoning" },
        ...tickBoth,
      );
      expect(blockedReason(state)).toBe("Add an accuracy value or tick a flag to confirm.");
      expect(confirmSnapshotInput(state)).toBeNull();
    });

    it("counts every wrong value in the lock reason, even with both statements ticked", () => {
      const state = onReview(
        readRows,
        ...tickBoth,
        { type: "editAccuracy", rowType: "Diagram", text: "" },
        { type: "addType", rowType: "Strengthen" },
      );
      expect(blockedReason(state)).toBe("Fix 2 values above to confirm.");
    });

    it("shows every wrong value's message after a press on the locked Confirm", () => {
      const state = onReview(readRows, { type: "addType", rowType: "Strengthen" }, { type: "confirmBlocked" });
      expect(accuracyMessage(state, "Strengthen")).toBe("Enter the percentage, or remove this row with ×.");
    });

    it("lists only types not shown, by group, matching the search", () => {
      const options = addTypeOptions(onReview(), "su");
      expect(options.accuracy).toEqual(["Most strongly supported", "Sufficient assumption"]);
      expect(options.flags).toEqual(["Confusing sufficiency and necessity", "Lack of support v. false conclusion"]);
      expect(addTypeOptions(onReview(), "zz")).toEqual({ accuracy: [], flags: [] });
      expect(addTypeOptions(onReview(), "").accuracy).not.toContain("Diagram");
      expect(addTypeOptions(onReview(), "").flags).not.toContain("Link assumption");
      expect(addTypeOptions(onReview(), "causal").flags).toEqual(["Causal chain"]);
    });

    it("adds a flag unticked", () => {
      const state = onReview(readRows, { type: "addType", rowType: "Causal chain" }, ...tickBoth);
      expect(confirmSnapshotInput(state)?.analyticsRows.at(-1)).toEqual({ type: "Causal chain", category: "restricted" });
    });

    it("says so in one line when one list is empty after the read", () => {
      const accuracyOnly = readRows.filter((row) => row.category === "regular");
      expect(emptyListNote(onReview(accuracyOnly), "flags")).toBe(
        "We didn't find priority flags in your screenshot. If 7Sage shows any, add them with the link below.",
      );
      expect(emptyListNote(onReview(accuracyOnly), "accuracy")).toBeNull();
      const flagsOnly = readRows.filter((row) => row.category === "restricted");
      expect(emptyListNote(onReview(flagsOnly), "accuracy")).toBe(
        "We didn't find accuracy values in your screenshot. If 7Sage shows any, add them with the link below.",
      );
    });

    it("sends the profile, the reviewed rows, and the approval in the current shape", () => {
      const state = onReview(
        readRows,
        { type: "editAccuracy", rowType: "Necessary assumption", text: "76" },
        { type: "toggleFlag", rowType: "Causal reasoning" },
        { type: "toggleFlag", rowType: "Link assumption" },
        { type: "removeRow", rowType: "Diagram" },
        ...tickBoth,
      );

      expect(confirmSnapshotInput(state)).toEqual({
        currentScore: 150,
        goalScore: 165,
        goalTestDate: "2026-11-01",
        accommodationMultiplier: 1,
        dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
        preferredPracticeTestDay: "SATURDAY",
        analyticsRows: [
          { type: "Necessary assumption", category: "regular", accuracy: 76 },
          { type: "Causal reasoning", category: "restricted", isTopPriority: false, priorityTier: "highest" },
          { type: "Link assumption", category: "restricted", isTopPriority: true, priorityTier: "medium" },
        ],
        analyticsApproval: {
          extraction: { source: "7sage_screenshot", extractedAt: "2026-10-19T15:00:00.000Z" },
          confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt: "2026-10-19T15:00:00.000Z" },
        },
      });
    });

    it("drops the review when the student replaces the screenshot", () => {
      const state = onReview(readRows, { type: "back" }, { type: "readStarted", file: new File(["png"], "b.png", { type: "image/png" }) });
      expect(state.screenshot.status).toBe("reading");
    });
  });

  describe("live preview", () => {
    const TODAY = "2026-10-19";

    it("fills the header lines from Step 1 values", () => {
      const state = run(validGoal, { type: "edit", values: { accommodationMultiplier: 1.5 } });

      expect(previewHeader(state.values, "Dana", TODAY)).toEqual({
        greeting: "Hi Dana · 7Sage · 1.5× time",
        scores: "150 → 165",
        target: "by Nov 1 · 13 days away",
        countdown: "13 days to test",
      });
    });

    it("shows dashes for empty scores and no target before a test date is chosen", () => {
      const header = previewHeader(initialWizardState().values, "Dana", TODAY);

      expect(header).toEqual({ greeting: "Hi Dana · 7Sage · standard time", scores: "— → —", target: null, countdown: null });
    });

    const designWeek: WizardAction = {
      type: "edit",
      values: {
        dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 120, THURSDAY: 90, FRIDAY: 60, SATURDAY: 210, SUNDAY: 120 },
      },
    };

    it("sums the week and names the chosen practice-test day", () => {
      const state = run(designWeek, { type: "edit", values: { preferredPracticeTestDay: "SATURDAY" } });
      const week = previewWeek(state.values);

      expect(week.summary).toBe("13 h of study · practice test on Saturday");
      expect(week.days.map(({ label, time, practiceTest }) => [label, time, practiceTest])).toEqual([
        ["Mon", "1 h 30", false],
        ["Tue", "1 h 30", false],
        ["Wed", "2 h", false],
        ["Thu", "1 h 30", false],
        ["Fri", "1 h", false],
        ["Sat", "3 h 30", true],
        ["Sun", "2 h", false],
      ]);
    });

    it("says so when no practice-test day is chosen", () => {
      expect(previewWeek(run(designWeek).values).summary).toBe("13 h of study · practice-test day not chosen");
    });

    it("sizes each day's bar against the longest day", () => {
      const days = previewWeek(run(designWeek).values).days;

      expect(days.find(({ label }) => label === "Sat")?.barShare).toBe(1);
      expect(days.find(({ label }) => label === "Fri")?.barShare).toBeCloseTo(60 / 210);
    });

    const rows: AnalyticsExtractedRow[] = [
      { type: "Diagram", category: "regular", accuracy: 64 },
      { type: "Necessary assumption", category: "regular", accuracy: 71 },
      { type: "Phenomenon-hypothesis (LR)", category: "restricted", isTopPriority: true, priorityTier: "highest" },
    ];

    function read(...actions: WizardAction[]): WizardState {
      return run(
        validGoal,
        { type: "continue" },
        { type: "edit", values: { preferredPracticeTestDay: "SATURDAY" } },
        { type: "continue" },
        { type: "readStarted", file: new File(["png"], "7sage-analytics.png", { type: "image/png" }) },
        { type: "readEnded", attempt: 1, reply: { kind: "rows", rows }, at: READ_AT },
        ...actions,
      );
    }

    it("has no drills until a screenshot is read", () => {
      expect(previewDrills(run(validGoal), TODAY)).toBeNull();
    });

    it("shows the engine's first drilling day for the unconfirmed values", () => {
      const drills = previewDrills(read(), TODAY);
      const week = generateWeek(
        {
          currentScore: 150,
          goalScore: 165,
          goalTestDate: "2026-11-01",
          accommodationMultiplier: 1,
          dailyCapacityMinutes: initialWizardState().values.dailyCapacityMinutes,
          preferredPracticeTestDay: "SATURDAY",
        },
        {
          weekOf: "2026-10-19",
          lrAccuracyByType: { Diagram: 0.64, "Necessary assumption": 0.71 },
          lrTopPriorityLogicTypes: ["Phenomenon-hypothesis (LR)"],
        },
        mockRules,
        "",
        { createdOn: "MONDAY" },
      );

      expect(drills?.day).toBe("MONDAY");
      expect(drills?.items.map(({ activity }) => activity)).toEqual(week.days.MONDAY.activities);
      expect(drills?.items.map(({ minutes, label, detail }) => [minutes, label, detail])).toEqual([
        ["1 h", "25 Conditional reasoning (L3-5)", null],
        ["15 min", "Necessary assumption", { kind: "accuracy", text: "71%" }],
        ["15 min", "Flaw or descriptive weakening", null],
      ]);
    });

    it("starts from today, as This week does", () => {
      const drills = previewDrills(read(), "2026-10-22");

      expect(drills?.day).toBe("THURSDAY");
    });

    it("follows edits on Review", () => {
      const edited = read({ type: "continue" }, { type: "editAccuracy", rowType: "Necessary assumption", text: "20" });

      expect(previewDrills(edited, TODAY)?.items[1]).toMatchObject({
        label: "Necessary assumption",
        detail: { kind: "accuracy", text: "20%" },
      });
    });

    it("marks a ticked priority flag on its drill", () => {
      const longMonday: WizardAction = {
        type: "edit",
        values: { dailyCapacityMinutes: { ...initialWizardState().values.dailyCapacityMinutes, MONDAY: 480 } },
      };
      const flagged = previewDrills(read(longMonday), TODAY)?.items.find(({ label }) => label === "Phenomenon-hypothesis (LR)");

      expect(flagged?.detail).toEqual({ kind: "flag" });
    });
  });
});
