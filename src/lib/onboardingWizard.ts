import {
  accuracyError,
  addRow,
  dropSection,
  editAccuracy,
  missingTypes,
  readSection,
  removeRow,
  SECTIONS,
  reviewedRows,
  sectionOf,
  setStatement,
  snapshotApproval,
  toggleTopPriority,
  type ReviewRow,
  type SnapshotReview,
  type Statement,
} from "./analyticsReview";
import { activityLabel, lrTypesName } from "./activityLabel";
import { summarizeAnalyticsRows } from "./analytics";
import type { SnapshotApprovalMetadata } from "./analyticsSnapshots";
import { currentWeekInTimezone } from "./currentWeeklySchedule";
import { DAY_ORDER, generateWeek } from "./engine";
import { formatDuration } from "./formatDuration";
import { mockRules } from "./mockData";
import type { ExtractReply } from "./screenshotUpload";
import {
  DAY_LABEL,
  MAX_OFFICIAL_ATTEMPTS,
  everyDay,
  goalScoreError,
  type OfficialAttempt,
  type StudentProfileInput,
} from "./studentProfile";
import { testCountdown, testCountdownLabel } from "./testCountdown";
import type { Activity, AnalyticsExtractedRow, AnalyticsSection, DayOfWeek, LRType, RCType } from "./types";

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

export type AttemptRow = { id: number; score: string; month: string; leftScore: boolean; leftRow: boolean };

export interface AttemptsDraft {
  taken: boolean;
  rows: AttemptRow[];
  nextId: number;
}

export type AnalyticsType = LRType | RCType;

export type Screenshot =
  | { status: "none" }
  | { status: "reading" | "connection-lost" | "cannot-read" | "signed-out" | "no-rows"; file: File }
  | { status: "read"; file: File; rows: AnalyticsExtractedRow[] };

export interface ReviewDraft {
  review: SnapshotReview;
  typedText: Partial<Record<AnalyticsType, string>>;
  revealedBoxes: AnalyticsType[];
}

export interface WizardState {
  step: WizardStep;
  changedStep: boolean;
  values: WizardValues;
  attempts: AttemptsDraft;
  leftScoreBoxes: Record<ScoreBox, boolean>;
  screenshots: Record<AnalyticsSection, Screenshot>;
  rejections: Record<AnalyticsSection, string | null>;
  readAttempts: Record<AnalyticsSection, number>;
  draft: ReviewDraft | null;
  save: "idle" | "saving" | "failed";
}

export type WizardAction =
  | { type: "edit"; values: Partial<WizardValues> }
  | { type: "leaveScoreBox"; box: ScoreBox }
  | { type: "applyAllDays" }
  | { type: "setAttemptsTaken"; taken: boolean }
  | { type: "addAttempt" }
  | { type: "removeAttempt"; id: number }
  | { type: "editAttempt"; id: number; values: Partial<Pick<AttemptRow, "score" | "month">> }
  | { type: "leaveAttempt"; id: number; part: "score" | "row" }
  | { type: "continue" }
  | { type: "back" }
  | { type: "screenshotRejected"; section: AnalyticsSection; message: string }
  | { type: "readStarted"; section: AnalyticsSection; file: File }
  | { type: "readEnded"; section: AnalyticsSection; attempt: number; reply: ExtractReply; at: Date }
  | { type: "editAccuracy"; rowType: AnalyticsType; text: string }
  | { type: "leaveAccuracyBox"; rowType: AnalyticsType }
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
    attempts: { taken: false, rows: [], nextId: 0 },
    leftScoreBoxes: { currentScore: false, goalScore: false },
    screenshots: { LR: { status: "none" }, RC: { status: "none" } },
    rejections: { LR: null, RC: null },
    readAttempts: { LR: 0, RC: 0 },
    draft: null,
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

type AttemptProblem = "empty-score" | "out-of-range" | "no-month";

function attemptProblem(row: AttemptRow): AttemptProblem | null {
  if (row.score.trim() === "") return "empty-score";
  if (!inScoreRange(parseScore(row.score))) return "out-of-range";
  return row.month === "" ? "no-month" : null;
}

const ATTEMPT_MESSAGE: Record<AttemptProblem, { box: "score" | "month"; text: string }> = {
  "empty-score": { box: "score", text: "Enter the score from this attempt." },
  "out-of-range": { box: "score", text: "LSAT scores go from 120 to 180. Check this attempt's score." },
  "no-month": { box: "month", text: "Pick the month of this attempt." },
};

export function attemptMessage(row: AttemptRow) {
  const problem = attemptProblem(row);
  const shown = row.leftRow || (row.leftScore && problem === "out-of-range");
  return problem && shown ? ATTEMPT_MESSAGE[problem] : null;
}

function attemptsBlockedReason(attempts: AttemptsDraft): string | null {
  if (!attempts.taken) return null;
  const problems = attempts.rows.map(attemptProblem);
  if (problems.includes("out-of-range")) return "Fix your attempts above to continue.";
  return problems.some(Boolean) ? "Enter a score and month for each attempt to continue." : null;
}

export function officialAttemptsInput(attempts: AttemptsDraft): OfficialAttempt[] | null {
  if (attemptsBlockedReason(attempts)) return null;
  if (!attempts.taken) return [];
  return attempts.rows.map(({ score, month }) => ({ score: Number(score), month }));
}

function withAttemptRows(state: WizardState, rows: AttemptRow[]): WizardState {
  return { ...state, attempts: { ...state.attempts, rows } };
}

function addAttemptRow(state: WizardState): WizardState {
  const { attempts } = state;
  if (attempts.rows.length >= MAX_OFFICIAL_ATTEMPTS) return state;
  const row = { id: attempts.nextId, score: "", month: "", leftScore: false, leftRow: false };
  return { ...state, attempts: { ...attempts, rows: [...attempts.rows, row], nextId: attempts.nextId + 1 } };
}

function updateAttemptRow(state: WizardState, id: number, update: Partial<AttemptRow>): WizardState {
  return withAttemptRows(state, state.attempts.rows.map((row) => (row.id === id ? { ...row, ...update } : row)));
}

function testTimeName(accommodation: Accommodation): string {
  return accommodation === 1 ? "standard time" : TEST_TIME_LABEL[accommodation];
}

const shortDuration = (minutes: number) => formatDuration(minutes).replace(/(h \d+) min$/, "$1");

export function practiceTestMinutes(accommodation: Accommodation): number {
  return Math.round(mockRules.ptDurationMinutes * mockRules.accommodationTimeMultiplier[accommodation]);
}

export function weeklyTotalMinutes(values: WizardValues): number {
  return DAY_ORDER.reduce((sum, day) => sum + values.dailyCapacityMinutes[day], 0);
}

export function practiceTestHint(accommodation: Accommodation): string {
  const length = formatDuration(practiceTestMinutes(accommodation));
  return `A full practice test takes ${length} with ${testTimeName(accommodation)}. Pick a day with that much time.`;
}

export function practiceTestFact(accommodation: Accommodation): string {
  return `A full practice test takes ${shortDuration(practiceTestMinutes(accommodation))} with ${testTimeName(accommodation)}.`;
}

const utcDay = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);

export function previewHeader(values: WizardValues, firstName: string, today: string) {
  const score = (text: string) => text.trim() || "—";
  const greeting = `Hi ${firstName} · 7Sage · ${testTimeName(values.accommodationMultiplier)}`;
  const scores = `${score(values.currentScore)} → ${score(values.goalScore)}`;
  if (!values.goalTestDate) return { greeting, scores, target: null, countdown: null };
  const date = utcDay(values.goalTestDate).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const countdown = testCountdown(values.goalTestDate, utcDay(today), "UTC");
  const days = countdown?.kind === "days" ? countdown.days : 0;
  return {
    greeting,
    scores,
    target: `by ${date} · ${days} ${days === 1 ? "day" : "days"} away`,
    countdown: testCountdownLabel(countdown),
  };
}

export function previewWeek(values: WizardValues) {
  const longest = Math.max(...DAY_ORDER.map((day) => values.dailyCapacityMinutes[day]));
  const day = values.preferredPracticeTestDay;
  return {
    summary: `${formatDuration(weeklyTotalMinutes(values))} of study · ${day ? `practice test on ${DAY_LABEL[day]}` : "practice-test day not chosen"}`,
    days: DAY_ORDER.map((weekday) => {
      const minutes = values.dailyCapacityMinutes[weekday];
      return {
        day: weekday,
        label: DAY_SHORT_LABEL[weekday],
        time: shortDuration(minutes),
        practiceTest: weekday === day,
        barShare: minutes / longest,
      };
    }),
  };
}

export type PreviewDrill = {
  activity: Activity;
  minutes: string;
  label: string;
  detail: { kind: "accuracy"; text: string } | { kind: "flag" } | null;
};

export function previewDrills(state: WizardState, today: string): { day: DayOfWeek; items: PreviewDrill[] } | null {
  const profile = toProfileInput(state.values);
  if (!profile || !state.draft) return null;
  const rows = state.draft.review.rows.map(({ row }) => row).filter((row) => !accuracyError(row));
  const todayIndex = (utcDay(today).getUTCDay() + 6) % 7;
  const weekOf = currentWeekInTimezone(utcDay(today), "UTC");
  const week = generateWeek(
    profile,
    { weekOf, ...summarizeAnalyticsRows(rows) },
    mockRules,
    "",
    { createdOn: DAY_ORDER[todayIndex] },
  );
  const day = DAY_ORDER.slice(todayIndex).find((weekday) => week.days[weekday].type === "drill" && week.days[weekday].activities.length > 0);
  if (!day) return null;
  const items = week.days[day].activities.map((activity): PreviewDrill => {
    const minutes = formatDuration(Math.round(activity.kind === "LR" || activity.kind === "RC" ? activity.drillMinutes : activity.minutes));
    if (activity.kind === "RC" && !activity.isFullSection) {
      const row = rows.find(({ type }) => type === activity.passages[0].type);
      const detail = row?.accuracy !== undefined ? { kind: "accuracy" as const, text: `${row.accuracy}%` } : null;
      return { activity, minutes, label: activityLabel(activity), detail };
    }
    if (activity.kind !== "LR" || activity.isFullSection) return { activity, minutes, label: activityLabel(activity), detail: null };
    const row = rows.find(({ type }) => type === activity.types[0]);
    const detail = row?.accuracy !== undefined
      ? { kind: "accuracy" as const, text: `${row.accuracy}%` }
      : row?.category === "restricted" && row.isTopPriority ? { kind: "flag" as const } : null;
    return { activity, minutes, label: lrTypesName(activity.types), detail };
  });
  return { day, items };
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
      return attemptsBlockedReason(state.attempts);
    }
    case "week":
      return values.preferredPracticeTestDay ? null : "Pick a practice-test day to continue.";
    case "analytics":
      return bothRead(state) ? null : "Add both screenshots to check the values.";
    case "review":
      return state.draft ? (confirmLock(state.draft.review)?.reason ?? null) : null;
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

export function bothRead(state: WizardState) {
  return SECTIONS.every((section) => state.screenshots[section].status === "read");
}

export type ConfirmLock = { reason: string; fix: { at: "box"; type: AnalyticsType } | { at: "add-type" } | { at: "statements" } };

export function confirmLock(review: SnapshotReview): ConfirmLock | null {
  const wrong = review.rows.filter(({ row }) => accuracyError(row));
  if (wrong.length > 0) {
    const reason = wrong.length === 1 ? `Fix ${wrong[0].row.type} above to confirm.` : `Fix ${wrong.length} values above to confirm.`;
    return { reason, fix: { at: "box", type: wrong[0].row.type } };
  }
  const counts = ({ row }: ReviewRow) =>
    row.category === "regular" ? row.accuracy !== undefined : row.category === "restricted" && row.isTopPriority;
  if (!review.rows.some(counts)) return { reason: "Add an accuracy value or tick a flag to confirm.", fix: { at: "add-type" } };
  if (!review.confirmation.confirmedAt) return { reason: "Tick both statements to confirm.", fix: { at: "statements" } };
  return null;
}

const ACCURACY_MESSAGE = {
  empty: "Enter the percentage, or remove this row with ×.",
  "out-of-range": "Enter a percentage from 0 to 100.",
} as const;
const PASSAGE_EMPTY_MESSAGE = "Enter the percentage from your RC screenshot.";

const PERCENTAGE = /^\d+(\.\d+)?$/;

export function boxText(state: WizardState, type: AnalyticsType): string {
  const { draft } = state;
  if (!draft) return "";
  const typed = draft.typedText[type];
  if (typed !== undefined) return typed;
  return String(draft.review.rows.find(({ row }) => row.type === type)?.row.accuracy ?? "");
}

export function accuracyMessage(state: WizardState, type: AnalyticsType): string | null {
  const { draft } = state;
  if (!draft || !draft.revealedBoxes.includes(type)) return null;
  const entry = draft.review.rows.find(({ row }) => row.type === type);
  const error = entry && accuracyError(entry.row);
  if (!error) return null;
  return entry.row.category === "passage" && error === "empty" ? PASSAGE_EMPTY_MESSAGE : ACCURACY_MESSAGE[error];
}

export type ReviewList = "accuracy" | "flags";
const LIST_CATEGORY = { accuracy: "regular", flags: "restricted" } as const;
const EMPTY_LIST_NOTE: Record<ReviewList, string> = {
  accuracy: "We didn't find accuracy values in your LR screenshot. If 7Sage shows any, add them with the link below.",
  flags: "We didn't find priority flags in your LR screenshot. If 7Sage shows any, add them with the link below.",
};

export function emptyListNote(state: WizardState, list: ReviewList): string | null {
  const screenshot = state.screenshots.LR;
  if (screenshot.status !== "read" || !state.draft) return null;
  const inList = ({ category }: AnalyticsExtractedRow) => category === LIST_CATEGORY[list];
  if (screenshot.rows.some(inList) || state.draft.review.rows.some(({ row }) => inList(row))) return null;
  return EMPTY_LIST_NOTE[list];
}

export function addTypeOptions(state: WizardState, query: string): Record<ReviewList, LRType[]> {
  const options: Record<ReviewList, LRType[]> = { accuracy: [], flags: [] };
  if (!state.draft) return options;
  const wordStart = new RegExp(`\\b${query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
  for (const { type, category } of missingTypes(state.draft.review)) {
    if (!wordStart.test(type)) continue;
    options[category === "regular" ? "accuracy" : "flags"].push(type);
  }
  for (const list of Object.values(options)) list.sort((a, b) => a.localeCompare(b));
  return options;
}

export type ProfileWithAttempts = StudentProfileInput & { officialAttempts: OfficialAttempt[] };

export function profileWithAttempts(state: WizardState): ProfileWithAttempts | null {
  const profile = toProfileInput(state.values);
  const officialAttempts = officialAttemptsInput(state.attempts);
  return profile && officialAttempts ? { ...profile, officialAttempts } : null;
}

export type ConfirmSnapshotInput = ProfileWithAttempts & {
  analyticsRows: AnalyticsExtractedRow[];
  analyticsApproval: SnapshotApprovalMetadata;
};

export function confirmSnapshotInput(state: WizardState): ConfirmSnapshotInput | null {
  const profile = profileWithAttempts(state);
  if (!profile || !bothRead(state) || !state.draft) return null;
  const { review } = state.draft;
  const analyticsApproval = snapshotApproval(review);
  return analyticsApproval && !confirmLock(review) ? { ...profile, analyticsRows: reviewedRows(review), analyticsApproval } : null;
}

function withScreenshot(state: WizardState, section: AnalyticsSection, screenshot: Screenshot): WizardState {
  return { ...state, screenshots: { ...state.screenshots, [section]: screenshot } };
}

function withoutSectionDraft(draft: ReviewDraft, review: SnapshotReview | null, section: AnalyticsSection): ReviewDraft | null {
  if (!review) return null;
  const inSection = (type: AnalyticsType) => draft.review.rows.some(({ row }) => row.type === type && sectionOf(row) === section);
  const typedText = Object.fromEntries(Object.entries(draft.typedText).filter(([type]) => !inSection(type as AnalyticsType)));
  return { review, typedText, revealedBoxes: draft.revealedBoxes.filter((type) => !inSection(type)) };
}

function readStarted(state: WizardState, section: AnalyticsSection, file: File): WizardState {
  const { draft } = state;
  return {
    ...withScreenshot(state, section, { status: "reading", file }),
    rejections: { ...state.rejections, [section]: null },
    readAttempts: { ...state.readAttempts, [section]: state.readAttempts[section] + 1 },
    draft: draft && withoutSectionDraft(draft, dropSection(draft.review, section), section),
  };
}

function readEnded(state: WizardState, section: AnalyticsSection, attempt: number, reply: ExtractReply, at: Date): WizardState {
  const screenshot = state.screenshots[section];
  if (screenshot.status !== "reading" || attempt !== state.readAttempts[section]) return state;
  const { file } = screenshot;
  switch (reply.kind) {
    case "rows": {
      const rows = reply.rows.filter((row) => sectionOf(row) === section);
      if (rows.length === 0) return withScreenshot(state, section, { status: "no-rows", file });
      const review = readSection(state.draft?.review ?? null, section, rows, { source: "7sage_screenshot", extractedAt: at.toISOString() });
      const draft = { typedText: {}, revealedBoxes: [], ...state.draft, review };
      return { ...withScreenshot(state, section, { status: "read", file, rows }), draft };
    }
    case "rejected":
      return { ...withScreenshot(state, section, { status: "none" }), rejections: { ...state.rejections, [section]: reply.message } };
    case "connection-lost":
    case "cannot-read":
    case "signed-out":
      return withScreenshot(state, section, { status: reply.kind, file });
    default: {
      const _exhaustive: never = reply;
      return _exhaustive;
    }
  }
}

function updateDraft(state: WizardState, update: (draft: ReviewDraft) => ReviewDraft): WizardState {
  return state.draft ? { ...state, draft: update(state.draft) } : state;
}

function updateReview(state: WizardState, update: (review: SnapshotReview) => SnapshotReview): WizardState {
  return updateDraft(state, (draft) => ({ ...draft, review: update(draft.review) }));
}

const rowIndex = (review: SnapshotReview, type: AnalyticsType) => review.rows.findIndex(({ row }) => row.type === type);

function revealBoxes(state: WizardState, types: AnalyticsType[]): WizardState {
  return updateDraft(state, (draft) => ({ ...draft, revealedBoxes: [...new Set([...draft.revealedBoxes, ...types])] }));
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
    case "setAttemptsTaken": {
      const chosen = { ...state, attempts: { ...state.attempts, taken: action.taken } };
      return action.taken && chosen.attempts.rows.length === 0 ? addAttemptRow(chosen) : chosen;
    }
    case "addAttempt":
      return addAttemptRow(state);
    case "removeAttempt":
      return state.attempts.rows.length > 1 ? withAttemptRows(state, state.attempts.rows.filter((row) => row.id !== action.id)) : state;
    case "editAttempt":
      return updateAttemptRow(state, action.id, action.values);
    case "leaveAttempt":
      return updateAttemptRow(state, action.id, action.part === "score" ? { leftScore: true } : { leftRow: true });
    case "continue": {
      const next = STEPS[STEPS.indexOf(state.step) + 1];
      return blockedReason(state) || !next ? state : { ...state, step: next, changedStep: true };
    }
    case "back": {
      const previous = STEPS[STEPS.indexOf(state.step) - 1];
      return previous ? { ...state, step: previous, changedStep: true, save: "idle" } : state;
    }
    case "screenshotRejected":
      return { ...state, rejections: { ...state.rejections, [action.section]: action.message } };
    case "readStarted":
      return readStarted(state, action.section, action.file);
    case "readEnded":
      return readEnded(state, action.section, action.attempt, action.reply, action.at);
    case "editAccuracy": {
      const { rowType, text } = action;
      const accuracy = text === "" ? undefined : PERCENTAGE.test(text) ? Number(text) : NaN;
      return updateDraft(state, (draft) => ({
        ...draft,
        review: editAccuracy(draft.review, rowIndex(draft.review, rowType), accuracy),
        typedText: { ...draft.typedText, [rowType]: text },
      }));
    }
    case "leaveAccuracyBox":
      return revealBoxes(state, [action.rowType]);
    case "removeRow":
      return updateDraft(state, (draft) => {
        const index = rowIndex(draft.review, action.rowType);
        if (index === -1) return draft;
        const typedText = { ...draft.typedText };
        delete typedText[action.rowType];
        return { ...draft, review: removeRow(draft.review, index), typedText };
      });
    case "toggleFlag":
      return updateReview(state, (review) => toggleTopPriority(review, rowIndex(review, action.rowType)));
    case "addType":
      return updateReview(state, (review) => addRow(review, action.rowType));
    case "setStatement":
      return updateReview(state, (review) => setStatement(review, action.statement, action.checked, action.at));
    case "confirmBlocked": {
      if (!state.draft) return state;
      const wrong = state.draft.review.rows.filter(({ row }) => accuracyError(row)).map(({ row }) => row.type);
      return revealBoxes(state, wrong);
    }
    case "saveStarted":
      return profileWithAttempts(state) ? { ...state, save: "saving" } : state;
    case "saveFailed":
      return { ...state, save: "failed" };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
