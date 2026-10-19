import { DAY_ORDER } from "./engine";
import { formatDuration } from "./formatDuration";
import { mockRules } from "./mockData";
import type { ExtractReply } from "./screenshotUpload";
import { DAY_LABEL, everyDay, goalScoreError, type StudentProfileInput } from "./studentProfile";
import type { AnalyticsExtractedRow, DayOfWeek } from "./types";

const STEP_NAMES = ["Goal", "Week", "Analytics", "Review"] as const;
export type WizardStep = "goal" | "week" | "analytics" | "review";
const STEPS: WizardStep[] = ["goal", "week", "analytics", "review"];

export type Accommodation = StudentProfileInput["accommodationMultiplier"];
type ScoreBox = "currentScore" | "goalScore";

export interface WizardValues {
  currentScore: string;
  goalScore: string;
  goalTestDate: string;
  accommodationMultiplier: Accommodation;
  dailyCapacityMinutes: Record<DayOfWeek, number>;
  allDaysMinutes: number;
  preferredPracticeTestDay: DayOfWeek | null;
}

export type Screenshot =
  | { status: "none" }
  | { status: "reading" | "connection-lost" | "cannot-read" | "no-rows"; file: File }
  | { status: "read"; file: File; rows: AnalyticsExtractedRow[] };

export interface WizardState {
  step: WizardStep;
  changedStep: boolean;
  values: WizardValues;
  leftScoreBoxes: Record<ScoreBox, boolean>;
  screenshot: Screenshot;
  screenshotRejection: string | null;
  readAttempts: number;
  save: "idle" | "saving" | "failed";
}

export type WizardAction =
  | { type: "edit"; values: Partial<WizardValues> }
  | { type: "leaveScoreBox"; box: ScoreBox }
  | { type: "applyAllDays" }
  | { type: "continue" }
  | { type: "back" }
  | { type: "screenshotRejected"; message: string }
  | { type: "readStarted"; file: File }
  | { type: "readEnded"; attempt: number; reply: ExtractReply }
  | { type: "saveStarted" }
  | { type: "saveFailed" };

const DEFAULT_DAILY_MINUTES = 90;

export const DAY_SHORT_LABEL: Record<DayOfWeek, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

export const TEST_TIME_LABEL: Record<Accommodation, string> = {
  1: "Standard",
  1.5: "1.5× time",
  2: "2× time",
};

export function initialWizardState(): WizardState {
  return {
    step: "goal",
    changedStep: false,
    values: {
      currentScore: "",
      goalScore: "",
      goalTestDate: "",
      accommodationMultiplier: 1,
      dailyCapacityMinutes: everyDay(DEFAULT_DAILY_MINUTES),
      allDaysMinutes: DEFAULT_DAILY_MINUTES,
      preferredPracticeTestDay: null,
    },
    leftScoreBoxes: { currentScore: false, goalScore: false },
    screenshot: { status: "none" },
    screenshotRejection: null,
    readAttempts: 0,
    save: "idle",
  };
}

export function stepLabel(step: WizardStep): string {
  const index = STEPS.indexOf(step);
  return `Step ${index + 1} of ${STEP_NAMES.length} · ${STEP_NAMES[index]}`;
}

function parseScore(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  return Number(text);
}

function inScoreRange(score: number | null): score is number {
  return score !== null && score >= 120 && score <= 180;
}

const SCORE_BOX_NAME: Record<ScoreBox, string> = { currentScore: "current score", goalScore: "goal score" };

// The messages under the score pair. A box's range message shows alone; the
// goal-above-current message waits until both boxes are in range.
export function scoreMessages(state: WizardState): Record<ScoreBox, string | null> & { goalNotAbove: string | null } {
  const rangeMessage = (box: ScoreBox) => {
    const text = state.values[box];
    if (!state.leftScoreBoxes[box] || text.trim() === "" || inScoreRange(parseScore(text))) return null;
    return `LSAT scores go from 120 to 180. Check your ${SCORE_BOX_NAME[box]}.`;
  };
  const currentScore = rangeMessage("currentScore");
  const goalScore = rangeMessage("goalScore");
  const current = parseScore(state.values.currentScore);
  const goal = parseScore(state.values.goalScore);
  const goalNotAbove =
    !currentScore && !goalScore && state.leftScoreBoxes.goalScore && inScoreRange(current) && inScoreRange(goal)
      ? goalScoreError(current, goal)
      : null;
  return { currentScore, goalScore, goalNotAbove };
}

export function practiceTestMinutes(accommodation: Accommodation): number {
  return Math.round(mockRules.ptDurationMinutes * mockRules.accommodationTimeMultiplier[accommodation]);
}

export function weeklyTotalMinutes(values: WizardValues): number {
  return DAY_ORDER.reduce((sum, day) => sum + values.dailyCapacityMinutes[day], 0);
}

export function practiceTestHint(accommodation: Accommodation): string {
  const testTime = accommodation === 1 ? "standard time" : TEST_TIME_LABEL[accommodation];
  const length = formatDuration(practiceTestMinutes(accommodation));
  return `A full practice test takes ${length} with ${testTime}. Pick a day with that much time.`;
}

// Warns, never blocks: a practice test may run over the day's time (ADR 0002).
export function shortDayWarning(values: WizardValues): string | null {
  const day = values.preferredPracticeTestDay;
  if (!day) return null;
  const length = practiceTestMinutes(values.accommodationMultiplier);
  const minutes = values.dailyCapacityMinutes[day];
  if (minutes >= length) return null;
  const name = DAY_LABEL[day];
  return `${name} has ${formatDuration(minutes)}. A full practice test takes ${formatDuration(length)}. Add time on ${name} or pick another day.`;
}

export function blockedReason(state: WizardState): string | null {
  const { values } = state;
  switch (state.step) {
    case "goal": {
      const current = parseScore(values.currentScore);
      const goal = parseScore(values.goalScore);
      if (values.currentScore.trim() === "" || values.goalScore.trim() === "") return "Enter both scores to continue.";
      if (!inScoreRange(current) || !inScoreRange(goal) || goalScoreError(current, goal)) {
        return "Fix your scores above to continue.";
      }
      if (values.goalTestDate === "") return "Pick a goal test date to continue.";
      return null;
    }
    case "week":
      return values.preferredPracticeTestDay ? null : "Pick a practice-test day to continue.";
    case "analytics":
      return state.screenshot.status === "read" ? null : "Add a screenshot to check the values.";
    case "review":
      return null;
    default: {
      const _exhaustive: never = state.step;
      return _exhaustive;
    }
  }
}

// The saved profile, or null while Steps 1–2 are still invalid.
export function toProfileInput(values: WizardValues): StudentProfileInput | null {
  const currentScore = parseScore(values.currentScore);
  const goalScore = parseScore(values.goalScore);
  const day = values.preferredPracticeTestDay;
  if (!inScoreRange(currentScore) || !inScoreRange(goalScore) || goalScoreError(currentScore, goalScore)) return null;
  if (!day || values.goalTestDate === "") return null;
  return {
    currentScore,
    goalScore,
    goalTestDate: values.goalTestDate,
    accommodationMultiplier: values.accommodationMultiplier,
    dailyCapacityMinutes: values.dailyCapacityMinutes,
    preferredPracticeTestDay: day,
  };
}

function readEnded(state: WizardState, attempt: number, reply: ExtractReply): WizardState {
  const { screenshot } = state;
  if (screenshot.status !== "reading" || attempt !== state.readAttempts) return state;
  const { file } = screenshot;
  switch (reply.kind) {
    case "rows":
      return {
        ...state,
        screenshot: reply.rows.length > 0 ? { status: "read", file, rows: reply.rows } : { status: "no-rows", file },
      };
    case "rejected":
      return { ...state, screenshot: { status: "none" }, screenshotRejection: reply.message };
    case "connection-lost":
    case "cannot-read":
      return { ...state, screenshot: { status: reply.kind, file } };
    default: {
      const _exhaustive: never = reply;
      return _exhaustive;
    }
  }
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  if (state.save === "saving" && action.type !== "saveFailed" && action.type !== "readEnded") return state;
  switch (action.type) {
    case "edit":
      return { ...state, values: { ...state.values, ...action.values } };
    case "leaveScoreBox":
      return { ...state, leftScoreBoxes: { ...state.leftScoreBoxes, [action.box]: true } };
    case "applyAllDays":
      return { ...state, values: { ...state.values, dailyCapacityMinutes: everyDay(state.values.allDaysMinutes) } };
    case "continue": {
      const next = STEPS[STEPS.indexOf(state.step) + 1];
      return blockedReason(state) || !next ? state : { ...state, step: next, changedStep: true };
    }
    case "back": {
      const previous = STEPS[STEPS.indexOf(state.step) - 1];
      return previous ? { ...state, step: previous, changedStep: true, save: "idle" } : state;
    }
    case "screenshotRejected":
      return { ...state, screenshotRejection: action.message };
    case "readStarted":
      return {
        ...state,
        screenshot: { status: "reading", file: action.file },
        screenshotRejection: null,
        readAttempts: state.readAttempts + 1,
      };
    case "readEnded":
      return readEnded(state, action.attempt, action.reply);
    case "saveStarted":
      return toProfileInput(state.values) ? { ...state, save: "saving" } : state;
    case "saveFailed":
      return { ...state, save: "failed" };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
