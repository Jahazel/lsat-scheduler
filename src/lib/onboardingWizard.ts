import {
  accuracyError,
  dropSection,
  readSection,
  SECTIONS,
  reviewedRows,
  sectionOf,
  snapshotApproval,
  type SnapshotReview,
} from "./analyticsReview";
import {
  confirmLock, reviewDraftReducer, startDraft, startTypedDraft, typedEntryProblem,
  type AnalyticsInput, type AnalyticsType, type ReviewAction, type ReviewDraft,
} from "./reviewDraft";
import { activityLabel, lrTypesName } from "./activityLabel";
import { summarizeAnalyticsRows } from "./analytics";
import type { SnapshotApprovalMetadata } from "./analyticsSnapshots";
import { currentWeekInTimezone } from "./currentWeeklySchedule";
import { DAY_ORDER, generateWeek } from "./engine";
import { formatDuration } from "./formatDuration";
import { mockRules } from "./mockData";
import type { ExtractReply } from "./screenshotUpload";
import {
  addFile, analyticsRead, emptyReadQueue, endRead, removeFile, slotFile, startRead,
  type AnalyticsReading, type QueuedFile, type ReadQueue,
} from "./screenshotReadQueue";
import {
  everyDay,
  goalScoreError,
  type OfficialAttempt,
  type StudentProfileInput,
} from "./studentProfile";
import {
  addAttempt,
  attemptProblem,
  attemptProblemMessage,
  editAttempt,
  inScoreRange,
  parseScoreText,
  removeAttempt,
  scoreRangeMessage,
  toOfficialAttempts,
  type Accommodation,
  type AttemptRow,
} from "./studyProfileDraft";
import { testTimeName, type WeekValues } from "./studyWeek";
import { testCountdown, testCountdownLabel } from "./testCountdown";
import type { Activity, AnalyticsExtractedRow, AnalyticsSection, DayOfWeek } from "./types";

const STEP_NAMES = ["Goal", "Week", "Analytics", "Review"] as const;
export type WizardStep = "goal" | "week" | "analytics" | "review";
const STEPS: WizardStep[] = ["goal", "week", "analytics", "review"];

type ScoreBox = "currentScore" | "goalScore";

export interface WizardValues extends WeekValues {
  currentScore: string;
  goalScore: string;
  goalTestDate: string;
  accommodationMultiplier: Accommodation;
  allDaysMinutes: number;
}

export type OnboardingAttemptRow = AttemptRow & { leftScore: boolean; leftRow: boolean };

export interface AttemptsDraft {
  taken: boolean;
  rows: OnboardingAttemptRow[];
  nextId: number;
}

type ScreenshotReads = Record<AnalyticsSection, AnalyticsReading>;
export type Screenshot = QueuedFile<ScreenshotReads>;

export interface WizardState {
  step: WizardStep;
  changedStep: boolean;
  values: WizardValues;
  attempts: AttemptsDraft;
  leftScoreBoxes: Record<ScoreBox, boolean>;
  screenshots: ReadQueue<ScreenshotReads>;
  rejections: Record<AnalyticsSection, string | null>;
  draft: ReviewDraft | null;
  analyticsInput: AnalyticsInput;
  typedDraft: ReviewDraft | null;
  save: "idle" | "saving" | "failed" | { refused: string };
}

export type WizardAction =
  | { type: "edit"; values: Partial<WizardValues> }
  | { type: "leaveScoreBox"; box: ScoreBox }
  | { type: "applyAllDays" }
  | { type: "setAttemptsTaken"; taken: boolean }
  | { type: "addAttempt" }
  | { type: "removeAttempt"; id: number }
  | { type: "editAttempt"; id: number; values: Partial<Pick<OnboardingAttemptRow, "score" | "month">> }
  | { type: "leaveAttempt"; id: number; part: "score" | "row" }
  | { type: "continue" }
  | { type: "back" }
  | { type: "screenshotRejected"; section: AnalyticsSection; message: string }
  | { type: "readQueued"; section: AnalyticsSection; file: File }
  | { type: "readStarted"; id: number }
  | { type: "readEnded"; section: AnalyticsSection; id: number; reply: ExtractReply; at: Date }
  | { type: "chooseInput"; input: AnalyticsInput; at: Date }
  | ReviewAction
  | { type: "saveStarted" }
  | { type: "saveFailed" }
  | { type: "saveEnded" }
  | { type: "saveRefused"; message: string };

const DEFAULT_DAILY_MINUTES = 90;

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
    screenshots: emptyReadQueue(),
    rejections: { LR: null, RC: null },
    draft: null,
    analyticsInput: "screenshots",
    typedDraft: null,
    save: "idle",
  };
}

export function stepLabel(step: WizardStep): string {
  const index = STEPS.indexOf(step);
  return `Step ${index + 1} of ${STEP_NAMES.length} · ${STEP_NAMES[index]}`;
}

const SCORE_BOX_NAME: Record<ScoreBox, string> = { currentScore: "your current score", goalScore: "your goal score" };

// The messages under the score pair. A box's range message shows alone; the
// goal-above-current message waits until both boxes are in range.
export function scoreMessages(state: WizardState): Record<ScoreBox, string | null> & { goalNotAbove: string | null } {
  const rangeMessage = (box: ScoreBox) => {
    const text = state.values[box];
    if (!state.leftScoreBoxes[box] || text.trim() === "" || inScoreRange(parseScoreText(text))) return null;
    return scoreRangeMessage(SCORE_BOX_NAME[box]);
  };
  const currentScore = rangeMessage("currentScore");
  const goalScore = rangeMessage("goalScore");
  const current = parseScoreText(state.values.currentScore);
  const goal = parseScoreText(state.values.goalScore);
  const goalNotAbove =
    !currentScore && !goalScore && state.leftScoreBoxes.goalScore && inScoreRange(current) && inScoreRange(goal)
      ? goalScoreError(current, goal)
      : null;
  return { currentScore, goalScore, goalNotAbove };
}

export function attemptMessage(row: OnboardingAttemptRow) {
  const shown = row.leftRow || (row.leftScore && attemptProblem(row) === "out-of-range");
  return shown ? attemptProblemMessage(row) : null;
}

function attemptsBlockedReason(attempts: AttemptsDraft): string | null {
  if (!attempts.taken) return null;
  const problems = attempts.rows.map(attemptProblem);
  if (problems.includes("out-of-range")) return "Fix your attempts above to continue.";
  return problems.some(Boolean) ? "Enter a score and month for each attempt to continue." : null;
}

export function officialAttemptsInput(attempts: AttemptsDraft): OfficialAttempt[] | null {
  if (attemptsBlockedReason(attempts)) return null;
  return attempts.taken ? toOfficialAttempts(attempts.rows) : [];
}

function withAttemptRows(state: WizardState, rows: OnboardingAttemptRow[]): WizardState {
  return { ...state, attempts: { ...state.attempts, rows } };
}

function addAttemptRow(state: WizardState): WizardState {
  const { attempts } = state;
  const rows = addAttempt(attempts.rows, { id: attempts.nextId, score: "", month: "", leftScore: false, leftRow: false });
  return rows ? { ...state, attempts: { ...attempts, rows, nextId: attempts.nextId + 1 } } : state;
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

export type PreviewDrill = {
  activity: Activity;
  minutes: string;
  label: string;
  detail: { kind: "accuracy"; text: string } | { kind: "flag" } | null;
};

export function activeDraft(state: WizardState): ReviewDraft | null {
  return state.analyticsInput === "typed" ? state.typedDraft : state.draft;
}

export function previewDrills(state: WizardState, today: string): { day: DayOfWeek; items: PreviewDrill[] } | null {
  const draft = activeDraft(state);
  const profile = toProfileInput(state.values);
  if (!profile || !draft) return null;
  const rows = draft.review.rows.map(({ row }) => row).filter((row) => !accuracyError(row));
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
      const current = parseScoreText(values.currentScore);
      const goal = parseScoreText(values.goalScore);
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
      if (state.analyticsInput === "typed") return state.typedDraft && typedEntryProblem(state.typedDraft.review);
      return bothRead(state) ? null : "Add both screenshots to check the values.";
    case "review": {
      const draft = activeDraft(state);
      return draft ? (confirmLock(draft.review)?.reason ?? null) : null;
    }
    default: {
      const _exhaustive: never = state.step;
      return _exhaustive;
    }
  }
}

// The saved profile, or null while Steps 1–2 are still invalid.
export function toProfileInput(values: WizardValues): StudentProfileInput | null {
  const currentScore = parseScoreText(values.currentScore);
  const goalScore = parseScoreText(values.goalScore);
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

export function screenshot(state: WizardState, section: AnalyticsSection): Screenshot | undefined {
  return slotFile(state.screenshots, section);
}

export function bothRead(state: WizardState) {
  return SECTIONS.every((section) => screenshot(state, section)?.read.status === "read");
}

function analyticsReady(state: WizardState) {
  return state.analyticsInput === "typed" || bothRead(state);
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
  const draft = activeDraft(state);
  if (!profile || !analyticsReady(state) || !draft) return null;
  const { review } = draft;
  const analyticsApproval = snapshotApproval(review);
  return analyticsApproval && !confirmLock(review) ? { ...profile, analyticsRows: reviewedRows(review), analyticsApproval } : null;
}

function withoutSectionDraft(draft: ReviewDraft, review: SnapshotReview | null, section: AnalyticsSection): ReviewDraft | null {
  if (!review) return null;
  const inSection = (type: AnalyticsType) => draft.review.rows.some(({ row }) => row.type === type && sectionOf(row) === section);
  const typedText = Object.fromEntries(Object.entries(draft.typedText).filter(([type]) => !inSection(type as AnalyticsType)));
  return { review, typedText, revealedBoxes: draft.revealedBoxes.filter((type) => !inSection(type)) };
}

function readQueued(state: WizardState, section: AnalyticsSection, file: File): WizardState {
  const { draft } = state;
  return {
    ...state,
    screenshots: addFile(state.screenshots, { slot: section, file, status: "waiting", replacing: screenshot(state, section)?.id }),
    rejections: { ...state.rejections, [section]: null },
    draft: draft && withoutSectionDraft(draft, dropSection(draft.review, section), section),
  };
}

function readEnded(state: WizardState, section: AnalyticsSection, id: number, reply: ExtractReply, at: Date): WizardState {
  const read = analyticsRead(reply, section, at);
  const screenshots = endRead(state.screenshots, id, read);
  if (screenshot(state, section)?.id !== id) return { ...state, screenshots };
  switch (read.status) {
    case "read": {
      const review = readSection(state.draft?.review ?? null, section, read.value.rows, { source: "7sage_screenshot", extractedAt: read.value.at });
      return { ...state, screenshots, draft: { ...startDraft(review), ...state.draft, review } };
    }
    case "rejected":
      return { ...state, screenshots: removeFile(screenshots, id), rejections: { ...state.rejections, [section]: read.message } };
    default:
      return { ...state, screenshots };
  }
}

function updateDraft(state: WizardState, update: (draft: ReviewDraft) => ReviewDraft): WizardState {
  if (state.analyticsInput === "typed") return state.typedDraft ? { ...state, typedDraft: update(state.typedDraft) } : state;
  return state.draft ? { ...state, draft: update(state.draft) } : state;
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  if (state.save === "saving" && !["saveFailed", "saveEnded", "saveRefused", "readStarted", "readEnded"].includes(action.type)) return state;
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
      return state.attempts.rows.length > 1 ? withAttemptRows(state, removeAttempt(state.attempts.rows, action.id)) : state;
    case "editAttempt":
      return withAttemptRows(state, editAttempt(state.attempts.rows, action.id, action.values));
    case "leaveAttempt":
      return withAttemptRows(state, editAttempt(state.attempts.rows, action.id, action.part === "score" ? { leftScore: true } : { leftRow: true }));
    case "continue": {
      const next = STEPS[STEPS.indexOf(state.step) + 1];
      return blockedReason(state) || !next ? state : { ...state, step: next, changedStep: true, save: "idle" };
    }
    case "back": {
      const previous = STEPS[STEPS.indexOf(state.step) - 1];
      return previous ? { ...state, step: previous, changedStep: true, save: "idle" } : state;
    }
    case "screenshotRejected":
      return { ...state, rejections: { ...state.rejections, [action.section]: action.message } };
    case "readQueued":
      return readQueued(state, action.section, action.file);
    case "readStarted":
      return { ...state, screenshots: startRead(state.screenshots, action.id) };
    case "readEnded":
      return readEnded(state, action.section, action.id, action.reply, action.at);
    case "chooseInput":
      return { ...state, analyticsInput: action.input, typedDraft: state.typedDraft ?? (action.input === "typed" ? startTypedDraft(action.at) : null) };
    case "editAccuracy":
    case "leaveRow":
    case "removeRow":
    case "toggleFlag":
    case "setTier":
    case "addType":
    case "setStatement":
    case "confirmBlocked":
      return updateDraft(state, (draft) => reviewDraftReducer(draft, action));
    case "saveStarted":
      return profileWithAttempts(state) ? { ...state, save: "saving" } : state;
    case "saveFailed":
      return { ...state, save: "failed" };
    case "saveEnded":
      return { ...state, save: "idle" };
    case "saveRefused":
      return { ...state, save: { refused: action.message } };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
