import { describe, expect, it } from "vitest";
import {
  attemptMessage,
  blockedReason,
  confirmSnapshotInput,
  initialWizardState,
  profileWithAttempts,
  goalGain,
  previewDrills,
  savedAnswers,
  scoreMessages,
  screenshot,
  toProfileInput,
  stepPlace,
  weekReveal,
  weeksToTest,
  wizardReducer,
  type WizardAction,
  type WizardState,
} from "./onboardingWizard";
import { PASSAGE_TYPES } from "./analyticsReview";
import { generateWeek } from "./engine";
import { accuracyMessage, addTypeOptions, boxText, emptyListNote } from "./reviewDraft";
import { mockRules } from "./mockData";
import { everyDay, practiceTestMinutes } from "./studentProfile";
import { practiceTestFact, previewWeek } from "./studyWeek";
import type { AnalyticsExtractedRow } from "./types";

function draftOf(state: WizardState) {
  if (!state.draft) throw new Error("Expected a review draft");
  return state.draft;
}

const lrRead = (state: WizardState) => {
  const read = screenshot(state, "LR")?.read;
  return read?.status === "read" ? read.value.rows : [];
};

function run(...actions: WizardAction[]): WizardState {
  return actions.reduce(wizardReducer, initialWizardState());
}

const pickSaturday: WizardAction = {
  type: "edit",
  values: { preferredPracticeTestDay: "SATURDAY", dailyCapacityMinutes: { ...everyDay(90), SATURDAY: 150 } },
};

const READ_AT = new Date("2026-10-19T15:00:00.000Z");

const validGoal: WizardAction = {
  type: "edit",
  values: { currentScore: "150", goalScore: "165", goalTestDate: "2026-11-01" },
};

describe("onboarding wizard", () => {
  it("starts on Step 1 with no scores, no test date, and no practice-test day", () => {
    const state = initialWizardState();

    expect(stepPlace(state.step)).toEqual({ number: 1, of: 4, name: "Goal" });
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
    expect(stepPlace(week.step)).toEqual({ number: 2, of: 4, name: "Week" });
    expect(blockedReason(week)).toBe("Pick a practice-test day to continue.");
    expect(wizardReducer(week, { type: "continue" }).step).toBe("week");

    const analytics = run(
      validGoal,
      { type: "continue" },
      pickSaturday,
      { type: "continue" },
    );
    expect(stepPlace(analytics.step)).toEqual({ number: 3, of: 4, name: "Analytics" });
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
  });

  it("states the practice-test length as a fact", () => {
    expect(practiceTestFact(1)).toBe("A full practice test takes 2 h 30 with standard time.");
    expect(practiceTestFact(2)).toBe("A full practice test takes 3 h 45 with 2× time.");
  });

  it("blocks Week while the practice-test day has less time than the practice test", () => {
    const short = run(validGoal, { type: "continue" }, { type: "edit", values: { preferredPracticeTestDay: "FRIDAY" } });
    expect(blockedReason(short)).toBe("Friday needs at least 2 h 30 for a full practice test. Add time or pick another day.");
    expect(wizardReducer(short, { type: "continue" }).step).toBe("week");

    const longer = wizardReducer(short, { type: "edit", values: { dailyCapacityMinutes: { ...short.values.dailyCapacityMinutes, FRIDAY: 150 } } });
    expect(blockedReason(longer)).toBeNull();
  });

  it("blocks Week again when a longer Test time no longer fits the practice-test day", () => {
    const state = run(
      validGoal,
      { type: "continue" },
      { type: "edit", values: { preferredPracticeTestDay: "FRIDAY", dailyCapacityMinutes: { ...everyDay(90), FRIDAY: 150 } } },
      { type: "back" },
      { type: "edit", values: { accommodationMultiplier: 2 } },
      { type: "continue" },
    );

    expect(blockedReason(state)).toBe("Friday needs at least 3 h 45 for a full practice test. Add time or pick another day.");
  });

  describe("official LSAT attempts", () => {
    const taken: WizardAction = { type: "setAttemptsTaken", taken: true };
    const rowIds = (state: WizardState) => state.attempts.rows.map(({ id }) => id);

    it("saves no attempts for None yet, the default", () => {
      const state = run(validGoal, { type: "continue" }, pickSaturday);

      expect(state.attempts.taken).toBe(false);
      expect(profileWithAttempts(state)?.officialAttempts).toEqual([]);
    });

    it("opens one empty row for I've taken it and blocks Continue until it is filled", () => {
      const state = run(validGoal, taken);

      expect(state.attempts.rows).toHaveLength(1);
      expect(blockedReason(state)).toBe("Enter a score and month for each attempt to continue.");
      expect(wizardReducer(state, { type: "continue" }).step).toBe("goal");
    });

    it("adds and removes rows, and keeps the last row", () => {
      const three = run(validGoal, taken, { type: "addAttempt" }, { type: "addAttempt" });
      expect(rowIds(three)).toEqual([0, 1, 2]);

      const removed = wizardReducer(three, { type: "removeAttempt", id: 1 });
      expect(rowIds(removed)).toEqual([0, 2]);

      const last = run(validGoal, taken);
      expect(rowIds(wizardReducer(last, { type: "removeAttempt", id: 0 }))).toEqual([0]);
    });

    it("stops adding rows at 10", () => {
      const state = run(validGoal, taken, ...Array.from({ length: 12 }, (): WizardAction => ({ type: "addAttempt" })));

      expect(state.attempts.rows).toHaveLength(10);
    });

    it("shows an out-of-range score once focus leaves the score box", () => {
      const typing = run(validGoal, taken, { type: "editAttempt", id: 0, values: { score: "190" } });
      expect(attemptMessage(typing.attempts.rows[0])).toBeNull();
      expect(blockedReason(typing)).toBe("Fix your attempts above to continue.");

      const left = wizardReducer(typing, { type: "leaveAttempt", id: 0, part: "score" });
      expect(attemptMessage(left.attempts.rows[0])).toEqual({
        box: "score",
        text: "LSAT scores go from 120 to 180. Check this attempt's score.",
      });
    });

    it("asks for the month only once focus leaves the row", () => {
      const scored = run(validGoal, taken, { type: "editAttempt", id: 0, values: { score: "152" } }, { type: "leaveAttempt", id: 0, part: "score" });
      expect(attemptMessage(scored.attempts.rows[0])).toBeNull();

      const state = wizardReducer(scored, { type: "leaveAttempt", id: 0, part: "row" });
      expect(attemptMessage(state.attempts.rows[0])).toEqual({ box: "month", text: "Pick the month of this attempt." });
      expect(blockedReason(state)).toBe("Enter a score and month for each attempt to continue.");
    });

    it("saves the filled rows, and none after switching back to None yet", () => {
      const filled = run(
        validGoal,
        taken,
        { type: "editAttempt", id: 0, values: { score: "152", month: "2025-06" } },
        { type: "addAttempt" },
        { type: "editAttempt", id: 1, values: { score: "149", month: "2026-01" } },
        { type: "continue" },
        pickSaturday,
      );
      expect(filled.step).toBe("week");
      expect(profileWithAttempts(filled)?.officialAttempts).toEqual([
        { score: 152, month: "2025-06" },
        { score: 149, month: "2026-01" },
      ]);

      const none = wizardReducer(filled, { type: "setAttemptsTaken", taken: false });
      expect(profileWithAttempts(none)?.officialAttempts).toEqual([]);
      expect(wizardReducer(none, taken).attempts.rows).toHaveLength(2);
    });
  });

  it("ignores edits and Back while the save runs, and allows a retry after it fails", () => {
    const ready = run(validGoal, { type: "continue" }, pickSaturday, { type: "continue" });
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
      dailyCapacityMinutes: { ...everyDay(90), SATURDAY: 150 },
      preferredPracticeTestDay: "SATURDAY",
    });
  });

  it("stops every waiting screenshot at a daily limit, even when the refused read was replaced", () => {
    const lr = new File(["png"], "lr.png", { type: "image/png" });
    const rc = new File(["png"], "rc.png", { type: "image/png" });
    const message = "You've read 10 screenshots today. You can scan again tomorrow, after midnight Central time.";
    const replaced = run(
      { type: "readQueued", section: "LR", file: lr }, { type: "readStarted", id: 0 },
      { type: "readQueued", section: "RC", file: rc },
      { type: "readQueued", section: "LR", file: new File(["png"], "lr-2.png", { type: "image/png" }) },
    );

    const ended = wizardReducer(replaced, {
      type: "readEnded", section: "LR", id: 0, reply: { kind: "refused", refused: "daily-limit", message }, at: READ_AT,
    });

    expect(screenshot(ended, "LR")).toMatchObject({ read: { status: "refused", message, tryAgain: false }, file: { name: "lr-2.png" } });
    expect(screenshot(ended, "RC")).toMatchObject({ read: { status: "refused", message, tryAgain: false }, file: rc });
  });

  it("returns to the drop zone with the server's message when it rejects the file", () => {
    const file = new File(["png"], "huge.png", { type: "image/png" });
    const reading = run({ type: "readQueued", section: "LR", file }, { type: "readStarted", id: 0 });
    const message = "That file is 4.2 MB. Choose one that is 4 MB or less.";

    const rejected = wizardReducer(reading, { type: "readEnded", section: "LR", id: 0, reply: { kind: "rejected", message }, at: READ_AT });

    expect(screenshot(rejected, "LR")).toBeUndefined();
    expect(rejected.rejections).toEqual({ LR: message, RC: null });
    expect(wizardReducer(rejected, { type: "readQueued", section: "LR", file }).rejections.LR).toBeNull();
  });

  it("refuses an RC read that is not a passage-type page and keeps its rows out of the review", () => {
    const file = new File(["png"], "lr-in-rc-box.png", { type: "image/png" });
    const reading = run({ type: "readQueued", section: "RC", file }, { type: "readStarted", id: 0 });

    const refused = wizardReducer(reading, {
      type: "readEnded", section: "RC", id: 0, reply: { kind: "rows", rows: [{ type: "Law", category: "passage", accuracy: 58 }], showsPassageTypes: false }, at: READ_AT,
    });

    expect(screenshot(refused, "RC")).toBeUndefined();
    expect(refused.rejections.RC).toBe("No passage types in this one.");
    expect(refused.draft).toBeNull();
  });

  it("keeps a read that ends while Skip for now is saving", () => {
    const ready = run(validGoal, { type: "continue" }, pickSaturday, { type: "continue" });
    const queued = wizardReducer(ready, { type: "readQueued", section: "LR", file: new File(["png"], "a.png", { type: "image/png" }) });
    const reading = wizardReducer(queued, { type: "readStarted", id: 0 });
    const saving = wizardReducer(reading, { type: "saveStarted" });

    const ended = wizardReducer(saving, { type: "readEnded", section: "LR", id: 0, reply: { kind: "connection-lost" }, at: READ_AT });

    expect(screenshot(ended, "LR")?.read.status).toBe("connection-lost");
  });

  describe("Step 4 · Review", () => {
    const passageRows: AnalyticsExtractedRow[] = [
      { type: "Law", category: "passage", accuracy: 58 },
      { type: "Comparative", category: "passage", accuracy: 70 },
      { type: "Science", category: "passage", accuracy: 64 },
      { type: "Humanities", category: "passage", accuracy: 81 },
      { type: "Art", category: "passage", accuracy: 77 },
    ];

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
        pickSaturday,
        { type: "continue" },
        { type: "readQueued", section: "LR", file: new File(["png"], "lr-analytics.png", { type: "image/png" }) }, { type: "readStarted", id: 0 },
        { type: "readEnded", section: "LR", id: 0, reply: { kind: "rows", rows }, at: READ_AT },
        { type: "readQueued", section: "RC", file: new File(["png"], "rc-analytics.png", { type: "image/png" }) }, { type: "readStarted", id: 1 },
        { type: "readEnded", section: "RC", id: 1, reply: { kind: "rows", rows: passageRows, showsPassageTypes: true }, at: READ_AT },
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
      expect(accuracyMessage(draftOf(typing), "Diagram")).toBeNull();
      expect(blockedReason(typing)).toBe("Fix Diagram above to confirm.");

      const left = wizardReducer(typing, { type: "leaveRow", rowType: "Diagram" });
      expect(accuracyMessage(draftOf(left), "Diagram")).toBe("Enter a percentage from 0 to 100.");

      const cleared = wizardReducer(left, { type: "editAccuracy", rowType: "Diagram", text: "" });
      expect(accuracyMessage(draftOf(cleared), "Diagram")).toBe("Enter the percentage, or remove this row with ×.");
    });

    it("keeps what the student typed and saves a decimal as typed", () => {
      const decimal = onReview(readRows, { type: "editAccuracy", rowType: "Diagram", text: "9.5" }, ...tickBoth);
      expect(confirmSnapshotInput(decimal)?.analyticsRows[0]).toEqual({ type: "Diagram", category: "regular", accuracy: 9.5 });

      for (const text of ["9.", "-5", "7a"]) {
        const state = onReview(readRows, ...tickBoth, { type: "editAccuracy", rowType: "Diagram", text }, { type: "leaveRow", rowType: "Diagram" }, ...tickBoth);
        expect(boxText(draftOf(state), "Diagram")).toBe(text);
        expect(accuracyMessage(draftOf(state), "Diagram")).toBe("Enter a percentage from 0 to 100.");
        expect(blockedReason(state)).toBe("Fix Diagram above to confirm.");
        expect(confirmSnapshotInput(state)).toBeNull();
      }
      const readded = onReview(
        readRows,
        { type: "editAccuracy", rowType: "Diagram", text: "9.5" },
        { type: "removeRow", rowType: "Diagram" },
        { type: "addType", rowType: "Diagram" },
      );
      expect(boxText(draftOf(readded), "Diagram")).toBe("");
      const over = onReview(readRows, { type: "editAccuracy", rowType: "Diagram", text: "1000" }, { type: "leaveRow", rowType: "Diagram" });
      expect(accuracyMessage(draftOf(over), "Diagram")).toBe("Enter a percentage from 0 to 100.");
    });

    describe("Week reveal", () => {
      const TODAY = "2026-10-19";

      it("builds the week and drills from the saved answers, the same as the preview for those answers", () => {
        const confirmed = onReview(readRows, { type: "editAccuracy", rowType: "Necessary assumption", text: "20" }, ...tickBoth);
        const input = confirmSnapshotInput(confirmed)!;
        const saved = wizardReducer(wizardReducer(confirmed, { type: "saveStarted" }), { type: "saved", input });
        const reveal = weekReveal(savedAnswers(saved)!, TODAY);

        expect(reveal.analyticsAdded).toBe(true);
        expect(reveal.drills).toEqual(previewDrills(confirmed, TODAY));
        expect(reveal.drills?.day).toBe("MONDAY");
        expect(reveal.drills?.items.map(({ minutes, label, detail }) => [minutes, label, detail])).toEqual([
          ["1 h", "1 Full LR Section", null],
          ["30 min", "Necessary + Sufficient assumption", { kind: "accuracy", text: "20%" }],
        ]);
        expect(reveal.days).toEqual(previewWeek(confirmed.values).days);
        expect(reveal.totalMinutes).toBe(6 * 90 + 150);
      });

      it("has the week but no drills after Skip for now", () => {
        const ready = run(validGoal, { type: "continue" }, pickSaturday, { type: "continue" });
        const reveal = weekReveal({ ...profileWithAttempts(ready)!, analyticsRows: [], analyticsApproval: null }, TODAY);

        expect(reveal.analyticsAdded).toBe(false);
        expect(reveal.drills).toBeNull();
        expect(reveal.days.find(({ practiceTest }) => practiceTest)?.day).toBe("SATURDAY");
      });

      it("keeps the saved answers and ignores every later action", () => {
        const confirmed = onReview(readRows, ...tickBoth);
        const input = confirmSnapshotInput(confirmed)!;
        const saved = wizardReducer(wizardReducer(confirmed, { type: "saveStarted" }), { type: "saved", input });

        expect(savedAnswers(saved)).toBe(input);
        expect(wizardReducer(saved, { type: "back" })).toBe(saved);
        expect(wizardReducer(saved, { type: "saveStarted" })).toBe(saved);
      });
    });

    it("accepts a decimal read from the screenshot after focus leaves its box", () => {
      const decimalRead = [{ ...readRows[0], accuracy: 9.5 }, ...readRows.slice(1)];
      const state = onReview(decimalRead, { type: "leaveRow", rowType: "Diagram" }, ...tickBoth);
      expect(accuracyMessage(draftOf(state), "Diagram")).toBeNull();
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
      expect(accuracyMessage(draftOf(state), "Strengthen")).toBe("Enter the percentage, or remove this row with ×.");
    });

    it("lists only types not shown, by group, matching the search", () => {
      const options = addTypeOptions(draftOf(onReview()), "su");
      expect(options.accuracy).toEqual(["Most strongly supported", "Sufficient assumption"]);
      expect(options.flags).toEqual(["Confusing sufficiency and necessity", "Lack of support v. false conclusion"]);
      expect(addTypeOptions(draftOf(onReview()), "zz")).toEqual({ accuracy: [], flags: [] });
      expect(addTypeOptions(draftOf(onReview()), "").accuracy).not.toContain("Diagram");
      expect(addTypeOptions(draftOf(onReview()), "").flags).not.toContain("Link assumption");
      expect(addTypeOptions(draftOf(onReview()), "causal").flags).toEqual(["Causal chain"]);
    });

    it("adds a flag unticked", () => {
      const state = onReview(readRows, { type: "addType", rowType: "Causal chain" }, ...tickBoth);
      expect(confirmSnapshotInput(state)?.analyticsRows.at(-1)).toEqual({ type: "Causal chain", category: "restricted" });
    });

    it("says so in one line when one list is empty after the read", () => {
      const accuracyOnly = readRows.filter((row) => row.category === "regular");
      expect(emptyListNote(draftOf(onReview(accuracyOnly)), lrRead(onReview(accuracyOnly)), "flags")).toBe(
        "We didn't find priority flags in your LR screenshot. If 7Sage shows any, add them with the link below.",
      );
      expect(emptyListNote(draftOf(onReview(accuracyOnly)), lrRead(onReview(accuracyOnly)), "accuracy")).toBeNull();
      const flagsOnly = readRows.filter((row) => row.category === "restricted");
      expect(emptyListNote(draftOf(onReview(flagsOnly)), lrRead(onReview(flagsOnly)), "accuracy")).toBe(
        "We didn't find accuracy values in your LR screenshot. If 7Sage shows any, add them with the link below.",
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
        dailyCapacityMinutes: { ...everyDay(90), SATURDAY: 150 },
        officialAttempts: [],
        preferredPracticeTestDay: "SATURDAY",
        analyticsRows: [
          { type: "Necessary assumption", category: "regular", accuracy: 76 },
          { type: "Causal reasoning", category: "restricted", isTopPriority: false, priorityTier: "highest" },
          { type: "Link assumption", category: "restricted", isTopPriority: true, priorityTier: "medium" },
          ...passageRows,
        ],
        analyticsApproval: {
          extraction: { source: "7sage_screenshot", extractedAt: "2026-10-19T15:00:00.000Z" },
          confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt: "2026-10-19T15:00:00.000Z" },
        },
      });
    });

    it("drops only the replaced screenshot's rows and keeps the other section's edits", () => {
      const state = onReview(
        readRows,
        { type: "editAccuracy", rowType: "Law", text: "60" },
        { type: "editAccuracy", rowType: "Diagram", text: "50" },
        { type: "back" },
        { type: "readQueued", section: "LR", file: new File(["png"], "b.png", { type: "image/png" }) }, { type: "readStarted", id: 2 },
      );
      expect(screenshot(state, "LR")?.read.status).toBe("reading");
      expect(blockedReason(state)).toBe("Add both screenshots to check the values.");
      expect(state.draft?.review.rows.map(({ row }) => row.type)).toEqual(["Law", "Comparative", "Science", "Humanities", "Art"]);
      expect(boxText(draftOf(state), "Law")).toBe("60");
      expect(boxText(draftOf(state), "Diagram")).toBe("");
    });

    it("asks for both screenshots before Check the values", () => {
      const lrOnly = run(
        validGoal,
        { type: "continue" },
        pickSaturday,
        { type: "continue" },
        { type: "readQueued", section: "LR", file: new File(["png"], "lr.png", { type: "image/png" }) }, { type: "readStarted", id: 0 },
        { type: "readEnded", section: "LR", id: 0, reply: { kind: "rows", rows: readRows }, at: READ_AT },
        { type: "continue" },
      );
      expect(lrOnly.step).toBe("analytics");
      expect(blockedReason(lrOnly)).toBe("Add both screenshots to check the values.");
    });

    it("accepts an RC read with no passage-type percentage and confirms it with 5 empty boxes", () => {
      const noPercentages = run(
        validGoal,
        { type: "continue" },
        pickSaturday,
        { type: "continue" },
        { type: "readQueued", section: "LR", file: new File(["png"], "lr.png", { type: "image/png" }) }, { type: "readStarted", id: 0 },
        { type: "readEnded", section: "LR", id: 0, reply: { kind: "rows", rows: readRows }, at: READ_AT },
        { type: "readQueued", section: "RC", file: new File(["png"], "rc.png", { type: "image/png" }) }, { type: "readStarted", id: 1 },
        { type: "readEnded", section: "RC", id: 1, reply: { kind: "rows", rows: [], showsPassageTypes: true }, at: READ_AT },
        { type: "continue" },
        ...tickBoth,
      );
      expect(screenshot(noPercentages, "RC")?.read.status).toBe("read");
      expect(PASSAGE_TYPES.map((type) => boxText(draftOf(noPercentages), type))).toEqual(["", "", "", "", ""]);
      expect(blockedReason(noPercentages)).toBeNull();
      expect(confirmSnapshotInput(noPercentages)?.analyticsRows.filter((row) => row.category === "passage" && row.accuracy !== undefined)).toEqual([]);
    });

    it("keeps a passage type the read missed empty, with no error, and blocks only a typed value outside 0 to 100", () => {
      const withoutArt = run(
        validGoal,
        { type: "continue" },
        pickSaturday,
        { type: "continue" },
        { type: "readQueued", section: "LR", file: new File(["png"], "lr.png", { type: "image/png" }) }, { type: "readStarted", id: 0 },
        { type: "readEnded", section: "LR", id: 0, reply: { kind: "rows", rows: readRows }, at: READ_AT },
        { type: "readQueued", section: "RC", file: new File(["png"], "rc.png", { type: "image/png" }) }, { type: "readStarted", id: 1 },
        { type: "readEnded", section: "RC", id: 1, reply: { kind: "rows", rows: passageRows.slice(0, 4), showsPassageTypes: true }, at: READ_AT },
        { type: "continue" },
        ...tickBoth,
      );
      expect(boxText(draftOf(withoutArt), "Art")).toBe("");
      expect(blockedReason(withoutArt)).toBeNull();
      expect(confirmSnapshotInput(withoutArt)).not.toBeNull();
      expect(accuracyMessage(draftOf(wizardReducer(withoutArt, { type: "confirmBlocked" })), "Art")).toBeNull();

      const typo = wizardReducer(withoutArt, { type: "editAccuracy", rowType: "Art", text: "177" });
      expect(blockedReason(typo)).toBe("Fix Art above to confirm.");
      expect(accuracyMessage(draftOf(wizardReducer(typo, { type: "confirmBlocked" })), "Art")).toBe("Enter a percentage from 0 to 100.");

      const filled = wizardReducer(
        wizardReducer(withoutArt, { type: "editAccuracy", rowType: "Art", text: "77" }),
        tickBoth[0],
      );
      expect(confirmSnapshotInput(wizardReducer(filled, tickBoth[1]))?.analyticsRows.at(-1)).toEqual({ type: "Art", category: "passage", accuracy: 77 });
    });
  });

  describe("live preview", () => {
    const TODAY = "2026-10-19";

    it("counts whole weeks to the test month, at least one", () => {
      expect(weeksToTest("2027-01-01", "2026-11-12")).toBe(7);
      expect(weeksToTest("2026-11-01", "2026-10-29")).toBe(1);
      expect(weeksToTest("", TODAY)).toBeNull();
    });

    it("gives the gain from the current score only for a valid goal above it", () => {
      expect(goalGain({ currentScore: "150", goalScore: "165" })).toBe(15);
      expect(goalGain({ currentScore: "150", goalScore: "140" })).toBeNull();
      expect(goalGain({ currentScore: "150", goalScore: "190" })).toBeNull();
      expect(goalGain({ currentScore: "", goalScore: "165" })).toBeNull();
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
        pickSaturday,
        { type: "continue" },
        { type: "readQueued", section: "LR", file: new File(["png"], "7sage-analytics.png", { type: "image/png" }) }, { type: "readStarted", id: 0 },
        { type: "readEnded", section: "LR", id: 0, reply: { kind: "rows", rows }, at: READ_AT },
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
        ["1 h", "1 Full LR Section", null],
        ["30 min", "Necessary + Sufficient assumption", { kind: "accuracy", text: "71%" }],
      ]);
    });

    it("starts from today, as This week does", () => {
      const drills = previewDrills(read(), "2026-10-22");

      expect(drills?.day).toBe("THURSDAY");
    });

    it("follows edits on Review", () => {
      const edited = read({ type: "continue" }, { type: "editAccuracy", rowType: "Necessary assumption", text: "20" });

      expect(previewDrills(edited, TODAY)?.items[1]).toMatchObject({
        label: "Necessary + Sufficient assumption",
        detail: { kind: "accuracy", text: "20%" },
      });
    });

    it("shows each RC line with its first passage type's accuracy, lowest first", () => {
      const passages: AnalyticsExtractedRow[] = [
        { type: "Law", category: "passage", accuracy: 58 },
        { type: "Comparative", category: "passage", accuracy: 70 },
        { type: "Science", category: "passage", accuracy: 64 },
        { type: "Humanities", category: "passage", accuracy: 81 },
        { type: "Art", category: "passage", accuracy: 77 },
      ];
      const state = read(
        { type: "edit", values: { dailyCapacityMinutes: { ...initialWizardState().values.dailyCapacityMinutes, MONDAY: 480 } } },
        { type: "readQueued", section: "RC", file: new File(["png"], "rc.png", { type: "image/png" }) }, { type: "readStarted", id: 1 },
        { type: "readEnded", section: "RC", id: 1, reply: { kind: "rows", rows: passages, showsPassageTypes: true }, at: READ_AT },
      );
      const rc = previewDrills(state, TODAY)?.items.find(({ activity }) => activity.kind === "RC" && !activity.isFullSection);

      expect(rc?.label).toBe("2 RC Passages Law L2, Science L4");
      expect(rc?.detail).toEqual({ kind: "accuracy", text: "58%" });
    });

    it("marks a ticked priority flag on its drill", () => {
      const longMonday: WizardAction = {
        type: "edit",
        values: { dailyCapacityMinutes: { ...initialWizardState().values.dailyCapacityMinutes, MONDAY: 480 } },
      };
      const flagged = previewDrills(read(longMonday), TODAY)?.items.find(({ label }) => label === "Phenomenon-hypothesis (LR)");

      expect(flagged?.detail).toEqual({ kind: "flag", tier: "highest" });
    });
  });
});
