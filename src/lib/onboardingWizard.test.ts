import { describe, expect, it } from "vitest";
import {
  blockedReason,
  initialWizardState,
  practiceTestHint,
  practiceTestMinutes,
  scoreMessages,
  shortDayWarning,
  toProfileInput,
  stepLabel,
  wizardReducer,
  type WizardAction,
  type WizardState,
} from "./onboardingWizard";

function run(...actions: WizardAction[]): WizardState {
  return actions.reduce(wizardReducer, initialWizardState());
}

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

    const rejected = wizardReducer(reading, { type: "readEnded", attempt: 1, reply: { kind: "rejected", message } });

    expect(rejected.screenshot).toEqual({ status: "none" });
    expect(rejected.screenshotRejection).toBe(message);
    expect(wizardReducer(rejected, { type: "readStarted", file }).screenshotRejection).toBeNull();
  });

  it("keeps a read that ends while Skip for now is saving", () => {
    const ready = run(validGoal, { type: "continue" }, { type: "edit", values: { preferredPracticeTestDay: "SATURDAY" } }, { type: "continue" });
    const reading = wizardReducer(ready, { type: "readStarted", file: new File(["png"], "a.png", { type: "image/png" }) });
    const saving = wizardReducer(reading, { type: "saveStarted" });

    const ended = wizardReducer(saving, { type: "readEnded", attempt: 1, reply: { kind: "connection-lost" } });

    expect(ended.screenshot.status).toBe("connection-lost");
  });
});

