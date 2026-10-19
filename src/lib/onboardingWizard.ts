import {
  accuracyError,
  addRow,
  editAccuracy,
  missingTypes,
  removeRow,
  reviewedRows,
  setStatement,
  snapshotApproval,
  startReview,
  toggleTopPriority,
  type ReviewRow,
  type SnapshotReview,
  type Statement,
} from "./analyticsReview";
import type { SnapshotApprovalMetadata } from "./analyticsSnapshots";
import { DAY_ORDER } from "./engine";
import { formatDuration } from "./formatDuration";
import { mockRules } from "./mockData";
import type { ExtractReply } from "./screenshotUpload";
import { DAY_LABEL, everyDay, goalScoreError, type StudentProfileInput } from "./studentProfile";
import type { AnalyticsExtractedRow, DayOfWeek, LRType } from "./types";

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
  | {
      status: "read";
      file: File;
      rows: AnalyticsExtractedRow[];
      review: SnapshotReview;
      typedText: Partial<Record<LRType, string>>;
      revealedBoxes: LRType[];
    };

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
  | { type: "readEnded"; attempt: number; reply: ExtractReply; at: Date }
  | { type: "editAccuracy"; rowType: LRType; text: string }
  | { type: "leaveAccuracyBox"; rowType: LRType }
  | { type: "removeRow"; rowType: LRType }
  | { type: "toggleFlag"; rowType: LRType }
  | { type: "addType"; rowType: LRType }
  | { type: "setStatement"; statement: Statement; checked: boolean; at: Date }
  | { type: "confirmBlocked" }
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
      return state.screenshot.status === "read" ? (confirmLock(state.screenshot.review)?.reason ?? null) : null;
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

export type ConfirmLock = { reason: string; fix: { at: "box"; type: LRType } | { at: "add-type" } | { at: "statements" } };

export function confirmLock(review: SnapshotReview): ConfirmLock | null {
  const wrong = review.rows.filter(({ row }) => accuracyError(row));
  if (wrong.length > 0) {
    const reason = wrong.length === 1 ? `Fix ${wrong[0].row.type} above to confirm.` : `Fix ${wrong.length} values above to confirm.`;
    return { reason, fix: { at: "box", type: wrong[0].row.type } };
  }
  const counts = ({ row }: ReviewRow) => (row.category === "regular" ? row.accuracy !== undefined : row.isTopPriority);
  if (!review.rows.some(counts)) return { reason: "Add an accuracy value or tick a flag to confirm.", fix: { at: "add-type" } };
  if (!review.confirmation.confirmedAt) return { reason: "Tick both statements to confirm.", fix: { at: "statements" } };
  return null;
}

const ACCURACY_MESSAGE = {
  empty: "Enter the percentage, or remove this row with ×.",
  "out-of-range": "Enter a percentage from 0 to 100.",
} as const;

const PERCENTAGE = /^\d+(\.\d+)?$/;

export function boxText(state: WizardState, type: LRType): string {
  const { screenshot } = state;
  if (screenshot.status !== "read") return "";
  const typed = screenshot.typedText[type];
  if (typed !== undefined) return typed;
  return String(screenshot.review.rows.find(({ row }) => row.type === type)?.row.accuracy ?? "");
}

export function accuracyMessage(state: WizardState, type: LRType): string | null {
  const { screenshot } = state;
  if (screenshot.status !== "read" || !screenshot.revealedBoxes.includes(type)) return null;
  const entry = screenshot.review.rows.find(({ row }) => row.type === type);
  const error = entry && accuracyError(entry.row);
  return error ? ACCURACY_MESSAGE[error] : null;
}

export type ReviewList = "accuracy" | "flags";
const LIST_CATEGORY = { accuracy: "regular", flags: "restricted" } as const;
const EMPTY_LIST_NOTE: Record<ReviewList, string> = {
  accuracy: "We didn't find accuracy values in your screenshot. If 7Sage shows any, add them with the link below.",
  flags: "We didn't find priority flags in your screenshot. If 7Sage shows any, add them with the link below.",
};

export function emptyListNote(state: WizardState, list: ReviewList): string | null {
  const { screenshot } = state;
  if (screenshot.status !== "read") return null;
  const inList = ({ category }: AnalyticsExtractedRow) => category === LIST_CATEGORY[list];
  if (screenshot.rows.some(inList) || screenshot.review.rows.some(({ row }) => inList(row))) return null;
  return EMPTY_LIST_NOTE[list];
}

export function addTypeOptions(state: WizardState, query: string): Record<ReviewList, LRType[]> {
  const options: Record<ReviewList, LRType[]> = { accuracy: [], flags: [] };
  if (state.screenshot.status !== "read") return options;
  const wordStart = new RegExp(`\\b${query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
  for (const { type, category } of missingTypes(state.screenshot.review)) {
    if (!wordStart.test(type)) continue;
    options[category === "regular" ? "accuracy" : "flags"].push(type);
  }
  for (const list of Object.values(options)) list.sort((a, b) => a.localeCompare(b));
  return options;
}

export type ConfirmSnapshotInput = StudentProfileInput & {
  analyticsRows: AnalyticsExtractedRow[];
  analyticsApproval: SnapshotApprovalMetadata;
};

export function confirmSnapshotInput(state: WizardState): ConfirmSnapshotInput | null {
  const profile = toProfileInput(state.values);
  if (!profile || state.screenshot.status !== "read") return null;
  const { review } = state.screenshot;
  const analyticsApproval = snapshotApproval(review);
  return analyticsApproval && !confirmLock(review) ? { ...profile, analyticsRows: reviewedRows(review), analyticsApproval } : null;
}

function readEnded(state: WizardState, attempt: number, reply: ExtractReply, at: Date): WizardState {
  const { screenshot } = state;
  if (screenshot.status !== "reading" || attempt !== state.readAttempts) return state;
  const { file } = screenshot;
  switch (reply.kind) {
    case "rows":
      return {
        ...state,
        screenshot:
          reply.rows.length > 0
            ? {
                status: "read",
                file,
                rows: reply.rows,
                review: startReview(reply.rows, { source: "7sage_screenshot", extractedAt: at.toISOString() }),
                typedText: {},
                revealedBoxes: [],
              }
            : { status: "no-rows", file },
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

function updateReview(state: WizardState, update: (review: SnapshotReview) => SnapshotReview): WizardState {
  const { screenshot } = state;
  if (screenshot.status !== "read") return state;
  return { ...state, screenshot: { ...screenshot, review: update(screenshot.review) } };
}

const rowIndex = (review: SnapshotReview, type: LRType) => review.rows.findIndex(({ row }) => row.type === type);

function revealBoxes(state: WizardState, types: LRType[]): WizardState {
  const { screenshot } = state;
  if (screenshot.status !== "read") return state;
  return { ...state, screenshot: { ...screenshot, revealedBoxes: [...new Set([...screenshot.revealedBoxes, ...types])] } };
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
      return readEnded(state, action.attempt, action.reply, action.at);
    case "editAccuracy": {
      const { rowType, text } = action;
      const accuracy = text === "" ? undefined : PERCENTAGE.test(text) ? Number(text) : NaN;
      const edited = updateReview(state, (review) => editAccuracy(review, rowIndex(review, rowType), accuracy));
      if (edited.screenshot.status !== "read") return edited;
      return { ...edited, screenshot: { ...edited.screenshot, typedText: { ...edited.screenshot.typedText, [rowType]: text } } };
    }
    case "leaveAccuracyBox":
      return revealBoxes(state, [action.rowType]);
    case "removeRow": {
      const removed = updateReview(state, (review) => removeRow(review, rowIndex(review, action.rowType)));
      if (removed.screenshot.status !== "read") return removed;
      const typedText = { ...removed.screenshot.typedText };
      delete typedText[action.rowType];
      return { ...removed, screenshot: { ...removed.screenshot, typedText } };
    }
    case "toggleFlag":
      return updateReview(state, (review) => toggleTopPriority(review, rowIndex(review, action.rowType)));
    case "addType":
      return updateReview(state, (review) => addRow(review, action.rowType));
    case "setStatement":
      return updateReview(state, (review) => setStatement(review, action.statement, action.checked, action.at));
    case "confirmBlocked": {
      if (state.screenshot.status !== "read") return state;
      const wrong = state.screenshot.review.rows.filter(({ row }) => accuracyError(row)).map(({ row }) => row.type);
      return revealBoxes(state, wrong);
    }
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
