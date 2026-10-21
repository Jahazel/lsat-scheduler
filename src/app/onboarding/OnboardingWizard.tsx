"use client";

import {
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { DurationSelect } from "@/components/DailyCapacityFieldset";
import { Checkbox as SharedCheckbox } from "@/components/ui/Checkbox";
import { IconButton } from "@/components/ui/Button";
import { DropZone } from "@/components/ui/DropZone";
import { SegmentedSwitch } from "@/components/ui/SegmentedSwitch";
import { DAY_ORDER } from "@/lib/engine";
import { SECTION_NAME, SECTIONS, lowestPassageType, type ReviewRow, type SnapshotReview, type Statement } from "@/lib/analyticsReview";
import { formatDuration } from "@/lib/formatDuration";
import {
  DAY_SHORT_LABEL,
  TEST_TIME_LABEL,
  accuracyMessage,
  addTypeOptions,
  attemptMessage,
  blockedReason,
  boxText,
  confirmLock,
  confirmSnapshotInput,
  emptyListNote,
  initialWizardState,
  practiceTestFact,
  profileWithAttempts,
  scoreMessages,
  stepLabel,
  weeklyTotalMinutes,
  wizardReducer,
  type Accommodation,
  type AnalyticsType,
  type AttemptsDraft,
  type ReviewList,
  type Screenshot,
  type WizardAction,
  type WizardState,
} from "@/lib/onboardingWizard";
import { SIGN_IN_EXPIRED, SignInAgainLink } from "@/components/SignInExpired";
import { SCREENSHOT_LIMITS, SCREENSHOT_MEDIA_TYPES, checkScreenshot, extractScreenshot } from "@/lib/screenshotUpload";
import type { AnalyticsExtractedRow, AnalyticsSection, LRType, PriorityTier } from "@/lib/types";
import { DAY_LABEL, MAX_OFFICIAL_ATTEMPTS, attemptMonths, type upcomingTestMonths } from "@/lib/studentProfile";
import type { createStudentProfile } from "./actions";
import LivePreview from "./LivePreview";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const FIELD = `h-11 w-full rounded-sm border bg-paper px-3 text-body text-ink ${FOCUS}`;
const SELECT = `h-[34px] min-w-0 flex-1 rounded-sm border border-vellum-line bg-paper px-2 text-small text-ink ${FOCUS}`;
const PRIMARY = `h-11 flex-1 rounded-sm bg-ink text-body font-medium text-chalk transition-colors duration-150 ease-out hover:bg-graphite-raised disabled:cursor-not-allowed disabled:bg-vellum-line disabled:text-smoke ${FOCUS}`;
const SECONDARY = `h-11 w-28 shrink-0 rounded-sm border border-vellum-line bg-paper text-body font-medium text-ink transition-colors duration-150 ease-out hover:bg-vellum disabled:cursor-not-allowed disabled:text-fog ${FOCUS}`;
const SMALL_BUTTON = `h-10 self-start rounded-sm border border-vellum-line bg-paper px-[18px] text-small font-medium text-ink transition-colors duration-150 ease-out hover:bg-vellum ${FOCUS}`;
const LINK_BUTTON = `font-medium text-ink underline underline-offset-[3px] disabled:cursor-not-allowed disabled:no-underline ${FOCUS}`;
const CHANGE_LATER = "You can change these any time in Study settings.";

interface OnboardingWizardProps {
  firstName: string;
  initials: string;
  today: string;
  goalTestDateOptions: ReturnType<typeof upcomingTestMonths>;
  onSave: typeof createStudentProfile;
  extract?: typeof extractScreenshot;
}

type Dispatch = (action: WizardAction) => void;

export default function OnboardingWizard({
  firstName,
  initials,
  today,
  goalTestDateOptions,
  onSave,
  extract = extractScreenshot,
}: OnboardingWizardProps) {
  const [state, dispatch] = useReducer(wizardReducer, undefined, initialWizardState);

  async function readScreenshot(section: AnalyticsSection, file: File) {
    const rejection = checkScreenshot(file);
    if (rejection) {
      dispatch({ type: "screenshotRejected", section, message: rejection.message });
      return;
    }
    const attempt = state.readAttempts[section] + 1;
    dispatch({ type: "readStarted", section, file });
    const reply = await extract(file, section);
    dispatch({ type: "readEnded", section, attempt, reply, at: new Date() });
  }

  async function save(input: Parameters<typeof onSave>[0]) {
    dispatch({ type: "saveStarted" });
    try {
      await onSave(input);
    } catch {
      dispatch({ type: "saveFailed" });
    }
  }

  function skipForNow() {
    const profile = profileWithAttempts(state);
    if (profile && state.save !== "saving") void save({ ...profile, analyticsRows: [], analyticsApproval: null });
  }

  function confirmSnapshot(): "locked" | "sent" {
    if (state.save === "saving") return "sent";
    const input = confirmSnapshotInput(state);
    if (!input) {
      dispatch({ type: "confirmBlocked" });
      return "locked";
    }
    void save(input);
    return "sent";
  }

  return (
    <div className="lg:grid lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[520px_minmax(0,1fr)] xl:grid-cols-[680px_minmax(0,1fr)]">
      <div className="flex justify-center px-5 py-8 lg:items-center lg:px-10 lg:py-16">
        <div className="w-full lg:max-w-[440px]">
          {state.step === "goal" && <GoalStep state={state} dispatch={dispatch} goalTestDateOptions={goalTestDateOptions} today={today} />}
          {state.step === "week" && <WeekStep state={state} dispatch={dispatch} />}
          {state.step === "analytics" && (
            <AnalyticsStep state={state} dispatch={dispatch} onSkip={skipForNow} onFile={readScreenshot} />
          )}
          {state.step === "review" && state.draft && <ReviewStep state={state} review={state.draft.review} dispatch={dispatch} onConfirm={confirmSnapshot} />}
        </div>
      </div>
      <LivePreview state={state} firstName={firstName} initials={initials} today={today} />
    </div>
  );
}

function StepHeading({ state, title, lede }: { state: WizardState; title: string; lede: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const { changedStep } = state;
  useEffect(() => {
    if (changedStep) heading.current?.focus();
  }, [changedStep]);
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-label uppercase text-smoke">{stepLabel(state.step)}</p>
      <h1 ref={heading} tabIndex={-1} className="text-h3 font-semibold text-ink outline-none">
        {title}
      </h1>
      <p className="text-body text-smoke">{lede}</p>
    </div>
  );
}

function StepForm({ state, dispatch, children }: { state: WizardState; dispatch: Dispatch; children: ReactNode }) {
  const reason = blockedReason(state);
  function submit(event: FormEvent) {
    event.preventDefault();
    dispatch({ type: "continue" });
  }
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-8">
      {children}
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          {state.step !== "goal" && (
            <button type="button" onClick={() => dispatch({ type: "back" })} className={SECONDARY}>
              Back
            </button>
          )}
          <button type="submit" disabled={Boolean(reason)} aria-describedby="continue-note" className={PRIMARY}>
            Continue
          </button>
        </div>
        <p id="continue-note" className="text-center text-small text-smoke">
          {reason ?? CHANGE_LATER}
        </p>
      </div>
    </form>
  );
}

function GoalStep({
  state,
  dispatch,
  goalTestDateOptions,
  today,
}: {
  state: WizardState;
  dispatch: Dispatch;
  goalTestDateOptions: OnboardingWizardProps["goalTestDateOptions"];
  today: string;
}) {
  const messages = scoreMessages(state);
  const goalMessage = messages.goalScore ?? messages.goalNotAbove;
  const scoreBox = (invalid: boolean) => `${FIELD} ${invalid ? "border-danger" : "border-vellum-line"}`;

  return (
    <StepForm state={state} dispatch={dispatch}>
      <StepHeading state={state} title="Set your target" lede="Where you are now, where you want to be, and when." />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-2">
              <span className="text-small font-medium text-ink">Current PT score</span>
              <input
                inputMode="numeric"
                autoComplete="off"
                value={state.values.currentScore}
                onChange={(e) => dispatch({ type: "edit", values: { currentScore: e.target.value } })}
                onBlur={() => dispatch({ type: "leaveScoreBox", box: "currentScore" })}
                aria-invalid={messages.currentScore ? true : undefined}
                aria-describedby={messages.currentScore ? "current-score-message" : undefined}
                className={scoreBox(Boolean(messages.currentScore))}
              />
            </label>
            <label className="flex flex-1 flex-col gap-2">
              <span className="text-small font-medium text-ink">Goal score</span>
              <input
                inputMode="numeric"
                autoComplete="off"
                value={state.values.goalScore}
                onChange={(e) => dispatch({ type: "edit", values: { goalScore: e.target.value } })}
                onBlur={() => dispatch({ type: "leaveScoreBox", box: "goalScore" })}
                aria-invalid={goalMessage ? true : undefined}
                aria-describedby={goalMessage ? "goal-score-message" : undefined}
                className={scoreBox(Boolean(goalMessage))}
              />
            </label>
          </div>
          {messages.currentScore && (
            <p id="current-score-message" className="text-small text-danger-ink">
              {messages.currentScore}
            </p>
          )}
          {goalMessage && (
            <p id="goal-score-message" className="text-small text-danger-ink">
              {goalMessage}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="goal-test-date" className="text-small font-medium text-ink">
            Goal test date
          </label>
          <select
            id="goal-test-date"
            value={state.values.goalTestDate}
            onChange={(e) => dispatch({ type: "edit", values: { goalTestDate: e.target.value } })}
            className={`${FIELD} border-vellum-line`}
          >
            <option value="" disabled>
              Select a test date
            </option>
            {goalTestDateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-small font-medium text-ink">Test time</legend>
          <div className="flex gap-1 rounded-sm bg-vellum p-1">
            {([1, 1.5, 2] satisfies Accommodation[]).map((multiplier) => (
              <label
                key={multiplier}
                className="flex h-9 flex-1 cursor-pointer items-center justify-center rounded text-small text-smoke transition-colors duration-150 ease-out hover:bg-vellum-line hover:text-ink has-[:checked]:bg-paper has-[:checked]:font-medium has-[:checked]:text-ink has-[:checked]:shadow-control has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
              >
                <input
                  type="radio"
                  name="testTime"
                  className="sr-only"
                  checked={state.values.accommodationMultiplier === multiplier}
                  onChange={() => dispatch({ type: "edit", values: { accommodationMultiplier: multiplier } })}
                />
                {TEST_TIME_LABEL[multiplier]}
              </label>
            ))}
          </div>
        </fieldset>

        <OfficialAttempts attempts={state.attempts} dispatch={dispatch} today={today} />
      </div>
    </StepForm>
  );
}

const ATTEMPT_CHOICES = [
  { value: "none", label: "None yet" },
  { value: "taken", label: "I've taken it" },
] as const;

function OfficialAttempts({ attempts, dispatch, today }: { attempts: AttemptsDraft; dispatch: Dispatch; today: string }) {
  const id = useId();
  const afterPress = useAfterPress();
  const months = attemptMonths(today);
  const box = (invalid: boolean) => `${FIELD} ${invalid ? "border-danger" : "border-vellum-line"}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span id={`${id}-label`} className="text-small font-medium text-ink">
          Official LSAT attempts
        </span>
        <span id={`${id}-note`} className="text-right text-caption text-smoke">
          For your record. It does not change your plan.
        </span>
      </div>
      <SegmentedSwitch
        name="officialAttempts"
        label="Official LSAT attempts"
        options={ATTEMPT_CHOICES}
        value={attempts.taken ? "taken" : "none"}
        onChange={(choice) => dispatch({ type: "setAttemptsTaken", taken: choice === "taken" })}
      />
      {attempts.taken && (
        <div className="flex flex-col gap-2 pt-1">
          <div aria-hidden className="flex gap-3 text-caption text-smoke">
            <span className="w-24 shrink-0">Score</span>
            <span className="flex-1">Month and year</span>
            <span className="w-8 shrink-0" />
          </div>
          {attempts.rows.map((row, index) => {
            const message = attemptMessage(row);
            const messageId = `${id}-attempt-${row.id}-message`;
            const describedBy = (box: "score" | "month") => (message?.box === box ? messageId : undefined);
            return (
              <div
                key={row.id}
                className="flex flex-col gap-2"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) afterPress(() => dispatch({ type: "leaveAttempt", id: row.id, part: "row" }));
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-24 shrink-0">
                    <input
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label={`Attempt ${index + 1} score`}
                      value={row.score}
                      onChange={(e) => dispatch({ type: "editAttempt", id: row.id, values: { score: e.target.value } })}
                      onBlur={() => afterPress(() => dispatch({ type: "leaveAttempt", id: row.id, part: "score" }))}
                      aria-invalid={message?.box === "score" ? true : undefined}
                      aria-describedby={describedBy("score")}
                      className={box(message?.box === "score")}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <select
                      aria-label={`Attempt ${index + 1} month and year`}
                      value={row.month}
                      onChange={(e) => dispatch({ type: "editAttempt", id: row.id, values: { month: e.target.value } })}
                      aria-invalid={message?.box === "month" ? true : undefined}
                      aria-describedby={describedBy("month")}
                      className={box(message?.box === "month")}
                    >
                      <option value="" disabled>
                        Select a month
                      </option>
                      {months.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {attempts.rows.length > 1 ? (
                    <IconButton label={`Remove attempt ${index + 1}`} onClick={() => dispatch({ type: "removeAttempt", id: row.id })}>
                      <svg aria-hidden className="text-smoke" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
                      </svg>
                    </IconButton>
                  ) : (
                    <span className="w-8 shrink-0" />
                  )}
                </div>
                {message && (
                  <p id={messageId} className="text-small text-danger-ink">
                    {message.text}
                  </p>
                )}
              </div>
            );
          })}
          {attempts.rows.length < MAX_OFFICIAL_ATTEMPTS && (
            <button
              type="button"
              onClick={() => dispatch({ type: "addAttempt" })}
              className={`flex items-center gap-2 self-start pt-1 text-small ${LINK_BUTTON}`}
            >
              <svg aria-hidden viewBox="0 0 14 14" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M7 2.5v9M2.5 7h9" />
              </svg>
              Add another attempt
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function WeekStep({ state, dispatch }: { state: WizardState; dispatch: Dispatch }) {
  const { values } = state;

  return (
    <StepForm state={state} dispatch={dispatch}>
      <StepHeading
        state={state}
        title="Plan your week"
        lede="How much time you can study each day. Each day needs at least 30 min. We choose your rest day."
      />
      <div>
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-12 lg:w-20" />
            <col />
            <col className="w-[60px] lg:w-[100px]" />
          </colgroup>
          <thead>
            <tr className="text-caption text-smoke">
              <th scope="col" className="pb-2 pl-2 text-left font-regular lg:pl-3">Day</th>
              <th scope="col" className="pb-2 text-left font-regular">Study time</th>
              <th scope="col" className="pb-2 text-center font-regular">Practice test</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-vellum">
              <th scope="row" className="rounded-l-sm py-2 pl-2 text-left text-small font-medium text-ink lg:pl-3">
                All<span className="hidden lg:inline"> days</span>
              </th>
              <td className="py-2">
                <DurationSelect
                  label="All days"
                  value={values.allDaysMinutes}
                  onChange={(minutes) => dispatch({ type: "edit", values: { allDaysMinutes: minutes } })}
                  className="flex gap-2"
                  selectClassName={SELECT}
                />
              </td>
              <td className="rounded-r-sm py-2 text-center">
                <button
                  type="button"
                  onClick={() => dispatch({ type: "applyAllDays" })}
                  className={`h-[34px] rounded-sm border border-ink bg-paper px-2 text-small font-medium text-ink lg:px-3 hover:bg-vellum ${FOCUS}`}
                >
                  Apply
                </button>
              </td>
            </tr>
            {DAY_ORDER.map((day) => (
              <tr key={day} className="border-b border-vellum-line">
                <th scope="row" className="py-1 pl-2 text-left text-small font-medium text-ink lg:pl-3">
                  {DAY_SHORT_LABEL[day]}
                </th>
                <td className="py-1">
                  <DurationSelect
                    label={DAY_LABEL[day]}
                    value={values.dailyCapacityMinutes[day]}
                    onChange={(minutes) =>
                      dispatch({ type: "edit", values: { dailyCapacityMinutes: { ...values.dailyCapacityMinutes, [day]: minutes } } })
                    }
                    className="flex gap-2"
                    selectClassName={SELECT}
                  />
                </td>
                <td className="py-1 text-center">
                  <label className="inline-flex size-11 cursor-pointer items-center justify-center">
                    <input
                      type="radio"
                      name="preferredPracticeTestDay"
                      aria-label={`Practice test on ${DAY_LABEL[day]}`}
                      checked={values.preferredPracticeTestDay === day}
                      onChange={() => dispatch({ type: "edit", values: { preferredPracticeTestDay: day } })}
                      className={`size-5 accent-accent ${FOCUS}`}
                    />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-col gap-1 px-2 pt-5 lg:px-3">
          <p className="flex items-baseline justify-between">
            <span className="text-small text-smoke">Weekly total</span>
            <span aria-live="polite" className="text-body font-semibold text-ink">
              {formatDuration(weeklyTotalMinutes(values))}
            </span>
          </p>
          <p className="text-small text-smoke">{practiceTestFact(values.accommodationMultiplier)}</p>
        </div>
      </div>
    </StepForm>
  );
}

function AnalyticsStep({
  state,
  dispatch,
  onSkip,
  onFile,
}: {
  state: WizardState;
  dispatch: Dispatch;
  onSkip: () => void;
  onFile: (section: AnalyticsSection, file: File) => void;
}) {
  const saving = state.save === "saving";
  const { screenshots } = state;
  const anyAdded = SECTIONS.some((section) => screenshots[section].status !== "none");
  const lrRead = screenshots.LR.status === "read" ? screenshots.LR : null;

  return (
    <div className="flex flex-col gap-8">
      <StepHeading state={state} title="Add your 7Sage analytics" lede="Two screenshots tell us what to drill first." />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          {SECTIONS.map((section) => (
            <SectionUpload
              key={section}
              section={section}
              screenshot={screenshots[section]}
              rejection={state.rejections[section]}
              onFile={(file) => onFile(section, file)}
            />
          ))}
          {!anyAdded && <p className="text-small text-smoke">{SCREENSHOT_LIMITS} each.</p>}
        </div>
        {lrRead && <RowsFound rows={lrRead.rows} complete={screenshots.RC.status === "read"} />}
        {!anyAdded && <WhereToFindIt />}
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <button type="button" disabled={saving} onClick={() => dispatch({ type: "back" })} className={SECONDARY}>
            Back
          </button>
          <button
            type="button"
            disabled={saving || Boolean(blockedReason(state))}
            onClick={() => dispatch({ type: "continue" })}
            className={PRIMARY}
          >
            {anyAdded ? "Check the values" : "Continue"}
          </button>
        </div>
        {anyAdded && <p className="text-center text-small text-smoke">You can replace either screenshot before you confirm.</p>}
        <p className="text-center text-small text-smoke">
          <button type="button" disabled={saving} onClick={onSkip} className={LINK_BUTTON}>
            {saving ? "Saving…" : "Skip for now"}
          </button>
          {" · Your schedule starts after you add both."}
        </p>
        <p role="status" className="text-center text-small text-smoke">
          {state.save === "failed" && "We couldn't save your plan. Check your connection and press Skip for now again."}
        </p>
      </div>
    </div>
  );
}

function SectionUpload({
  section,
  screenshot,
  rejection,
  onFile,
}: {
  section: AnalyticsSection;
  screenshot: Screenshot;
  rejection: string | null;
  onFile: (file: File) => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const accept = SCREENSHOT_MEDIA_TYPES.join(",");
  useEffect(() => {
    if (rejection && document.activeElement === document.body) zone.current?.querySelector("button")?.focus();
  }, [rejection]);
  if (screenshot.status === "none") {
    return (
      <div ref={zone}>
        <DropZone label={`${SECTION_NAME[section]} screenshot`} accept={accept} error={rejection ?? undefined} onFile={onFile} />
      </div>
    );
  }
  return (
    <>
      <input
        ref={picker}
        type="file"
        hidden
        aria-label={`${SECTION_NAME[section]} screenshot file`}
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      <FileRow
        section={section}
        screenshot={screenshot}
        rejection={rejection}
        onChoose={() => picker.current?.click()}
        onTryAgain={() => onFile(screenshot.file)}
      />
    </>
  );
}

function WhereToFindIt() {
  const steps = [
    "In 7Sage, open the Analytics page you checked most recently.",
    "Screenshot the Logical Reasoning section. Show every question type with its percentage or priority tier.",
    "Screenshot the Reading Comprehension section. Show the passage types: Law, Comparative, Science, Humanities, and Art.",
  ];
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-small font-semibold text-ink">Where to find it</h2>
      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <li key={step} className="flex items-baseline gap-3 text-small text-ink">
            <span aria-hidden className="w-4 shrink-0 font-mono text-caption text-smoke">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

const FILE_STATUS: Record<Exclude<Screenshot["status"], "none" | "read">, { text: string; problem: boolean }> = {
  reading: { text: "Reading…", problem: false },
  "connection-lost": { text: "Connection lost. Your file is still here.", problem: false },
  "cannot-read": { text: "We couldn't read the rows in it.", problem: true },
  "signed-out": { text: SIGN_IN_EXPIRED, problem: true },
  "no-rows": { text: "", problem: true },
};

const NO_ROWS: Record<AnalyticsSection, string> = {
  LR: "No question types in this one.",
  RC: "No passage types in this one.",
};

function readSummary(section: AnalyticsSection, count: number) {
  const noun = section === "LR" ? "question type" : "passage type";
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function FileRow({
  section,
  screenshot,
  rejection,
  onChoose,
  onTryAgain,
}: {
  section: AnalyticsSection;
  screenshot: Exclude<Screenshot, { status: "none" }>;
  rejection: string | null;
  onChoose: () => void;
  onTryAgain: () => void;
}) {
  const { status } = screenshot;
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (document.activeElement === document.body) row.current?.focus();
  }, [status]);
  const problem = status !== "read" && FILE_STATUS[status].problem;
  const statusText = status === "read"
    ? readSummary(section, screenshot.rows.length)
    : status === "no-rows" ? NO_ROWS[section] : FILE_STATUS[status].text;

  return (
    <div className="flex flex-col gap-3">
      <div ref={row} tabIndex={-1} className="flex flex-col gap-4 rounded-sm border border-vellum-line p-4 outline-none">
        <div className="flex items-center gap-4">
          <span aria-hidden className="flex h-12 w-16 shrink-0 flex-col justify-center gap-1 rounded border border-vellum-line bg-vellum p-2">
            <span className="h-[3px] w-9 rounded-sm bg-ink/30" />
            <span className="h-[3px] w-11 rounded-sm bg-ink/20" />
            <span className="h-[3px] w-7 rounded-sm bg-ink/20" />
            <span className="h-[3px] w-10 rounded-sm bg-ink/20" />
          </span>
          <div className="flex min-w-0 grow flex-col gap-0.5 text-small">
            <span className="font-medium text-ink">{SECTION_NAME[section]}</span>
            <span aria-live="polite" className={`flex min-w-0 items-center gap-1.5 ${problem ? "text-danger-ink" : "text-smoke"}`}>
              {status === "read" && (
                <svg aria-hidden viewBox="0 0 12 12" className="size-3 shrink-0 text-success-ink">
                  <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" className="stroke-current" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <span className="truncate">
                {screenshot.file.name} · {statusText}
              </span>
            </span>
          </div>
          <button type="button" onClick={onChoose} className={`shrink-0 text-small ${LINK_BUTTON}`}>
            Replace
          </button>
        </div>
        {status === "reading" && (
          <div role="progressbar" aria-label={`Reading your ${SECTION_NAME[section]} screenshot`} className="h-1 overflow-hidden rounded-sm bg-vellum">
            <div className="h-1 w-3/5 rounded-sm bg-accent" />
          </div>
        )}
        {status === "connection-lost" && (
          <>
            <div aria-hidden className="h-1 overflow-hidden rounded-sm bg-vellum">
              <div className="h-1 w-3/5 rounded-sm bg-fog" />
            </div>
            <button type="button" onClick={onTryAgain} className={SMALL_BUTTON}>
              Try again
            </button>
          </>
        )}
        {status === "cannot-read" && (
          <button type="button" onClick={onChoose} className={SMALL_BUTTON}>
            Choose a sharper screenshot
          </button>
        )}
        {status === "signed-out" && <SignInAgainLink className={`inline-flex items-center ${SMALL_BUTTON}`} />}
        {status === "no-rows" && (
          <>
            <RightPartExample section={section} />
            <button type="button" onClick={onChoose} className={SMALL_BUTTON}>
              Choose another screenshot
            </button>
          </>
        )}
      </div>
      {rejection && (
        <p role="alert" className="text-small text-danger-ink">
          {rejection}
        </p>
      )}
    </div>
  );
}

const EXAMPLE: Record<AnalyticsSection, { title: string; rows: { type: string; value: string; bar?: number }[] }> = {
  LR: {
    title: "Logical Reasoning question types",
    rows: [
      { type: "Diagram", value: "64%", bar: 64 },
      { type: "Conditional reasoning", value: "68%", bar: 68 },
      { type: "Necessary assumption", value: "71%", bar: 71 },
      { type: "Phenomenon-hypothesis", value: "HIGHEST" },
      { type: "Causal reasoning", value: "MEDIUM" },
    ],
  },
  RC: {
    title: "Reading Comprehension passage types",
    rows: [
      { type: "Law", value: "58%", bar: 58 },
      { type: "Comparative", value: "70%", bar: 70 },
      { type: "Science", value: "64%", bar: 64 },
      { type: "Humanities", value: "81%", bar: 81 },
      { type: "Art", value: "77%", bar: 77 },
    ],
  },
};

function RightPartExample({ section }: { section: AnalyticsSection }) {
  const { title, rows } = EXAMPLE[section];
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex items-baseline justify-between">
        <span className="text-small font-semibold text-ink">Capture this part of 7Sage Analytics</span>
        <span className="text-caption text-smoke">Example</span>
      </figcaption>
      <div className="flex flex-col gap-3 rounded-sm bg-vellum p-4">
        <div aria-hidden className="flex items-center gap-3 opacity-55">
          <span className="h-2 w-11 rounded bg-ink/35" />
          <span className="h-2 w-16 rounded bg-ink/15" />
          <span className="h-2 w-[52px] rounded bg-ink/15" />
        </div>
        <div aria-hidden className="flex h-11 items-end gap-1.5 rounded-sm bg-paper p-2 opacity-55">
          {[14, 20, 18, 26, 24, 28].map((height, index) => (
            <span key={index} className="w-3.5 rounded-sm bg-ink/15" style={{ height }} />
          ))}
        </div>
        <div className="flex flex-col gap-2 rounded-sm border-2 border-accent bg-paper p-3 text-caption">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink">{title}</span>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-ink px-2 py-0.5 font-medium text-chalk">This part</span>
          </div>
          {rows.map((row) => (
            <div key={row.type} className="flex items-center gap-2">
              <span className="w-[148px] shrink-0 text-smoke">{row.type}</span>
              <span aria-hidden className="flex h-1.5 grow rounded-full bg-vellum">
                {row.bar !== undefined && <span className="h-1.5 rounded-full bg-ink/30" style={{ width: `${row.bar}%` }} />}
              </span>
              <span className="shrink-0 text-right font-mono text-smoke">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

function RowsFound({ rows, complete }: { rows: AnalyticsExtractedRow[]; complete: boolean }) {
  const count = `${rows.length} ${rows.length === 1 ? "row" : "rows"}`;
  return (
    <div className="flex flex-col gap-6">
      <table className="w-full border-collapse text-small">
        <thead>
          <tr className="h-7 border-b border-vellum-line text-caption text-smoke">
            <th scope="col" className="px-3 text-left font-regular">
              Logical Reasoning · {complete ? `found ${count}` : `found so far, ${count}`}
            </th>
            <th scope="col" className="px-3 text-right font-regular">Accuracy or priority</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.type} className="h-[38px] border-b border-vellum-line">
              <th scope="row" className="px-3 text-left font-regular text-ink">{row.type}</th>
              <td className="px-3 text-right">
                <RowValue row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 text-small text-smoke">
        Next, you check each value and confirm this is your latest 7Sage analytics. Nothing counts until you confirm.
      </p>
    </div>
  );
}

function RowValue({ row }: { row: AnalyticsExtractedRow }) {
  if (row.accuracy !== undefined) return <span className="font-mono text-mono text-ink">{row.accuracy}%</span>;
  if (row.category !== "restricted" || !row.isTopPriority) return <span className="text-smoke">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/tint px-2 py-0.5 text-caption font-medium text-accent">
      <svg aria-hidden viewBox="0 0 10 10" className="size-2.5" fill="currentColor" stroke="currentColor" strokeLinejoin="round">
        <path d="M2 9V1.5h5.5L6.5 3.5l1 2H2" />
      </svg>
      Highest priority
    </span>
  );
}

const STATEMENTS: { statement: Statement; text: string }[] = [
  { statement: "extractedValuesMatch", text: "I reviewed these values and they match my screenshots." },
  { statement: "isLatestAnalytics", text: "These screenshots show my latest 7Sage analytics." },
];

const boxId = (type: AnalyticsType) => `accuracy-${type.replace(/\W+/g, "-")}`;

// A row message pushes everything below it down. When a press moves focus out of a
// box, the message waits for the press to end, so the pressed button is still under
// the pointer when the click lands.
function useAfterPress() {
  const pressing = useRef(false);
  useEffect(() => {
    const down = () => {
      pressing.current = true;
    };
    const up = () => {
      pressing.current = false;
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", up, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", up, true);
    };
  }, []);
  return (run: () => void) => {
    if (!pressing.current) return run();
    const ended = new AbortController();
    const finish = () => {
      ended.abort();
      setTimeout(run);
    };
    document.addEventListener("pointerup", finish, { capture: true, signal: ended.signal });
    document.addEventListener("pointercancel", finish, { capture: true, signal: ended.signal });
  };
}

function useFocusAfterRender() {
  const pending = useRef<string | null>(null);
  useEffect(() => {
    if (!pending.current) return;
    document.getElementById(pending.current)?.focus();
    pending.current = null;
  });
  return (id: string) => {
    pending.current = id;
  };
}

function ReviewStep({
  state,
  review,
  dispatch,
  onConfirm,
}: {
  state: WizardState;
  review: SnapshotReview;
  dispatch: Dispatch;
  onConfirm: () => "locked" | "sent";
}) {
  const saving = state.save === "saving";
  const reason = blockedReason(state);
  const requestFocus = useFocusAfterRender();
  const afterPress = useAfterPress();

  const accuracyRows = review.rows.filter(({ row }) => row.category === "regular");
  const flagRows = review.rows.filter(({ row }) => row.category === "restricted");
  const passageRows = review.rows.filter(({ row }) => row.category === "passage");
  const goesFirst = lowestPassageType(review);

  function confirm() {
    const lock = confirmLock(review);
    if (onConfirm() === "sent" || !lock) return;
    const { fix } = lock;
    if (fix.at === "box") requestFocus(boxId(fix.type));
    else if (fix.at === "add-type") requestFocus("add-type-link");
    else requestFocus(`statement-${STATEMENTS.findIndex(({ statement }) => !review.confirmation[statement])}`);
  }

  const accuracyRow = (entry: ReviewRow, note: ReactNode = null) => (
    <AccuracyRow
      key={entry.row.type}
      entry={entry}
      text={boxText(state, entry.row.type)}
      message={accuracyMessage(state, entry.row.type)}
      note={note}
      dispatch={dispatch}
      onLeave={() => afterPress(() => dispatch({ type: "leaveAccuracyBox", rowType: entry.row.type }))}
    />
  );

  const note = saving
    ? "Saving your plan. This takes a few seconds."
    : state.save === "failed"
      ? "We couldn't save your plan. Check your connection and press Confirm snapshot again."
      : reason;

  return (
    <div className="flex flex-col gap-8">
      <StepHeading
        state={state}
        title="Check what we read"
        lede={<>Compare each value with your screenshots<span className="hidden lg:inline"> on the right</span>.</>}
      />
      <div className="flex flex-col gap-5">
        <SectionHeading section="LR" file={screenshotFile(state, "LR")} />
        <div className="flex flex-col">
          <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-vellum-line px-3 py-1.5 text-caption text-smoke">
            <span>
              Accuracy · {accuracyRows.length} {accuracyRows.length === 1 ? "type" : "types"}
            </span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-2.5 w-3.5 rounded-[3px] border border-dashed border-accent" />
                Read from screenshot
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-2.5 w-3.5 rounded-[3px] border border-ink" />
                Edited by you
              </span>
            </span>
          </div>
          {accuracyRows.map((entry) => accuracyRow(entry))}
          <EmptyListNote state={state} list="accuracy" />
        </div>
        <div className="flex flex-col">
          <div className="flex min-h-7 items-center border-b border-vellum-line px-3 py-1.5 text-caption text-smoke">
            Priority flags · ticked flags go first in your plan
          </div>
          {flagRows.map(({ row }) => row.category === "restricted" && (
            <Checkbox
              key={row.type}
              checked={row.isTopPriority ?? false}
              onChange={() => dispatch({ type: "toggleFlag", rowType: row.type })}
              detail={row.priorityTier && <TierPill tier={row.priorityTier} />}
              className="min-h-9 border-b border-vellum-line px-3 py-1.5"
            >
              {row.type}
            </Checkbox>
          ))}
          <EmptyListNote state={state} list="flags" />
        </div>
        <AddType
          state={state}
          onAdd={(type, list) => {
            dispatch({ type: "addType", rowType: type });
            if (list === "accuracy") requestFocus(boxId(type));
          }}
        />
        <SectionHeading section="RC" file={screenshotFile(state, "RC")} />
        <div className="flex flex-col">
          <div className="flex min-h-7 items-center border-b border-vellum-line px-3 py-1.5 text-caption text-smoke">
            Passage types · lowest goes first in your plan
          </div>
          {passageRows.map((entry) =>
            accuracyRow(
              entry,
              entry.row.type === goesFirst ? (
                <span className="font-sans text-small text-accent">Goes first</span>
              ) : entry.original === null ? (
                "not found"
              ) : null,
            ),
          )}
        </div>
        <div className="flex flex-col gap-2.5 rounded-sm bg-vellum px-4 py-3.5">
          {STATEMENTS.map(({ statement, text }, index) => (
            <Checkbox
              key={statement}
              id={`statement-${index}`}
              checked={review.confirmation[statement]}
              onChange={(checked) => dispatch({ type: "setStatement", statement, checked, at: new Date() })}
            >
              {text}
            </Checkbox>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <button type="button" disabled={saving} onClick={() => dispatch({ type: "back" })} className={SECONDARY}>
            Back
          </button>
          <button
            type="button"
            aria-disabled={reason && !saving ? true : undefined}
            disabled={saving}
            onClick={confirm}
            aria-describedby="confirm-note"
            className={`h-11 flex-1 rounded-sm text-body font-medium transition-colors duration-150 ease-out ${FOCUS} ${
              saving
                ? "cursor-wait bg-graphite-raised text-chalk"
                : reason
                  ? "cursor-not-allowed bg-vellum-line text-smoke"
                  : "bg-ink text-chalk hover:bg-graphite-raised"
            }`}
          >
            {saving ? "Saving…" : "Confirm snapshot"}
          </button>
        </div>
        <p id="confirm-note" role="status" className="text-center text-small text-smoke">
          {note}
        </p>
      </div>
    </div>
  );
}

function screenshotFile(state: WizardState, section: AnalyticsSection) {
  const screenshot = state.screenshots[section];
  return screenshot.status === "none" ? null : screenshot.file;
}

function SectionHeading({ section, file }: { section: AnalyticsSection; file: File | null }) {
  return (
    <div className="flex flex-col gap-3 pt-2">
      <h2 className="px-3 text-body font-semibold text-ink lg:px-3">{SECTION_NAME[section]}</h2>
      {file && <ScreenshotToggle section={section} file={file} />}
    </div>
  );
}

function AccuracyRow({
  entry,
  text,
  message,
  note,
  dispatch,
  onLeave,
}: {
  entry: ReviewRow;
  text: string;
  message: string | null;
  note: ReactNode;
  dispatch: Dispatch;
  onLeave: () => void;
}) {
  const { row, original } = entry;
  const removable = row.category !== "passage";
  const edited = original === null || original.accuracy !== row.accuracy;
  const was = note ?? (edited && original?.accuracy !== undefined ? `was ${original.accuracy}%` : null);
  const id = boxId(row.type);
  const box = message
    ? "border-danger bg-paper"
    : edited
      ? "border-ink bg-paper"
      : "border-dashed border-accent bg-accent/faint";

  return (
    <div className="flex flex-col border-b border-vellum-line focus-within:rounded-sm focus-within:border-transparent focus-within:bg-accent/faint focus-within:outline-[1.5px] focus-within:outline-accent focus-within:outline-solid">
      <div className="flex min-h-[38px] items-center gap-3 py-1 pl-3 pr-1">
        <label htmlFor={id} className="grow text-small text-ink">
          {row.type}
        </label>
        <span className="w-[72px] shrink-0 text-right font-mono text-caption text-smoke">{was}</span>
        <span className={`flex h-[30px] w-16 shrink-0 items-center rounded-sm border px-2 ${box}`}>
          <input
            id={id}
            inputMode="numeric"
            autoComplete="off"
            aria-label={`${row.type} accuracy`}
            value={text}
            onChange={(e) => dispatch({ type: "editAccuracy", rowType: row.type, text: e.target.value })}
            onBlur={onLeave}
            aria-invalid={message ? true : undefined}
            aria-describedby={message ? `${id}-message` : undefined}
            className="w-full min-w-0 bg-transparent text-right font-mono text-mono text-ink outline-none"
          />
          <span aria-hidden className="pl-0.5 font-mono text-mono text-smoke">%</span>
        </span>
        {removable ? (
          <button
            type="button"
            aria-label={`Remove ${row.type}`}
            onClick={() => dispatch({ type: "removeRow", rowType: row.type })}
            className={`grid size-7 shrink-0 place-items-center rounded text-smoke hover:text-ink ${FOCUS}`}
          >
            <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
            </svg>
          </button>
        ) : (
          <span aria-hidden className="size-7 shrink-0" />
        )}
      </div>
      {message && (
        <p id={`${id}-message`} className="px-3 pb-2 text-small text-danger-ink">
          {message}
        </p>
      )}
    </div>
  );
}

function EmptyListNote({ state, list }: { state: WizardState; list: ReviewList }) {
  const note = emptyListNote(state, list);
  return note && <p className="border-b border-vellum-line px-3 py-3.5 text-small text-ink">{note}</p>;
}

const TIER_LABEL: Record<PriorityTier, string> = { highest: "Highest", medium: "Medium", low: "Low" };

function TierPill({ tier }: { tier: PriorityTier }) {
  const highest = tier === "highest";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dashed px-2 py-0.5 text-caption font-medium ${
        highest ? "border-accent text-accent" : "border-fog text-smoke"
      }`}
    >
      {highest && (
        <svg aria-hidden viewBox="0 0 10 10" className="size-2.5" fill="currentColor" stroke="currentColor" strokeLinejoin="round">
          <path d="M2 9V1.5h5.5L6.5 3.5l1 2H2" />
        </svg>
      )}
      {TIER_LABEL[tier]} on 7Sage
    </span>
  );
}

function Checkbox({
  id,
  checked,
  onChange,
  detail,
  className,
  children,
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  detail?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const labelId = useId();
  const detailId = useId();
  return (
    <SharedCheckbox
      id={id}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-labelledby={labelId}
      aria-describedby={detail ? detailId : undefined}
      className={className}
      label={
        <>
          <span id={labelId} className="grow">
            {children}
          </span>
          {detail && <span id={detailId}>{detail}</span>}
        </>
      }
    />
  );
}

const ADD_TYPE_GROUPS: { list: ReviewList; label: string; none: string }[] = [
  { list: "accuracy", label: "Accuracy · you type the percentage", none: "No accuracy types match" },
  { list: "flags", label: "Priority flags · added unticked", none: "No priority flags match" },
];

function AddType({
  state,
  onAdd,
}: {
  state: WizardState;
  onAdd: (type: LRType, list: ReviewList) => void;
}) {
  const requestFocus = useFocusAfterRender();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const options = addTypeOptions(state, query);
  const flat = ADD_TYPE_GROUPS.flatMap(({ list }) => options[list].map((type) => ({ type, list })));
  useEffect(() => {
    document.getElementById(`add-type-option-${active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [active]);

  function close(focusLink = true) {
    setOpen(false);
    setQuery("");
    setActive(0);
    if (focusLink) requestFocus("add-type-link");
  }

  function add(index: number) {
    const option = flat[index];
    if (!option) return;
    onAdd(option.type, option.list);
    close(option.list === "flags");
  }

  function keyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (flat.length === 0) return;
      setActive((active + (event.key === "ArrowDown" ? 1 : -1) + flat.length) % flat.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      add(active);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  if (!open) {
    return (
      <button
        id="add-type-link"
        type="button"
        onClick={() => {
          setOpen(true);
          requestFocus("add-type-search");
        }}
        className={`flex items-center gap-2 self-start px-3 text-small ${LINK_BUTTON}`}
      >
        <svg aria-hidden viewBox="0 0 14 14" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M7 2v10M2 7h10" />
        </svg>
        Add a type the screenshot missed
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          id="add-type-search"
          role="combobox"
          aria-label="Search question types"
          aria-expanded
          aria-controls="add-type-options"
          aria-autocomplete="list"
          aria-activedescendant={flat[active] ? `add-type-option-${active}` : undefined}
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={keyDown}
          className="h-9 min-w-0 grow rounded-sm border-2 border-accent bg-paper px-3 text-small text-ink outline-none"
        />
        <button type="button" onClick={() => close()} className={`h-9 px-3 text-small ${LINK_BUTTON}`}>
          Cancel
        </button>
      </div>
      <div id="add-type-options" role="listbox" aria-label="Question types" className="flex max-h-72 flex-col overflow-y-auto rounded-sm border border-vellum-line bg-paper py-1.5">
        {ADD_TYPE_GROUPS.map(({ list, label, none }, groupIndex) => (
          <div
            key={list}
            role="group"
            aria-labelledby={`add-type-group-${list}`}
            className={groupIndex > 0 ? "mt-1 border-t border-vellum-line pt-1" : undefined}
          >
            <div id={`add-type-group-${list}`} role="presentation" className="px-3 py-1.5 text-caption text-smoke">
              {label}
            </div>
            {options[list].length === 0 && <div className="flex h-9 items-center px-3 text-small text-smoke">{`${none} "${query.trim()}"`}</div>}
            {options[list].map((type) => {
              const optionIndex = flat.findIndex((option) => option.type === type);
              const selected = optionIndex === active;
              return (
                <div
                  key={type}
                  id={`add-type-option-${optionIndex}`}
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(optionIndex)}
                  onClick={() => add(optionIndex)}
                  className={`flex min-h-9 cursor-pointer items-center justify-between px-3 text-small text-ink ${selected ? "bg-vellum" : ""}`}
                >
                  {type}
                  {selected && <span className="font-mono text-caption text-smoke">Enter</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenshotToggle({ section, file }: { section: AnalyticsSection; file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  const shown = useRef<string | null>(null);
  useEffect(() => () => {
    if (shown.current) URL.revokeObjectURL(shown.current);
  }, []);

  function toggle() {
    if (shown.current) URL.revokeObjectURL(shown.current);
    shown.current = url ? null : URL.createObjectURL(file);
    setUrl(shown.current);
  }

  return (
    <div className="flex flex-col gap-3 lg:hidden">
      <button
        type="button"
        aria-expanded={url !== null}
        onClick={toggle}
        className={`flex items-center gap-3 rounded-sm border border-vellum-line bg-paper p-3 text-left ${FOCUS}`}
      >
        <span aria-hidden className="flex h-9 w-11 shrink-0 flex-col justify-center gap-1 rounded bg-vellum px-2">
          <span className="h-0.5 w-6 bg-fog" />
          <span className="h-0.5 w-5 bg-fog" />
          <span className="h-0.5 w-6 bg-fog" />
        </span>
        <span className="flex min-w-0 grow flex-col gap-0.5">
          <span className="text-small font-medium text-ink">{`${url ? "Hide" : "Show"} your ${section} screenshot`}</span>
          <span className="truncate font-mono text-caption text-smoke">{file.name}</span>
        </span>
        <svg aria-hidden viewBox="0 0 16 16" className={`size-4 shrink-0 transition-transform duration-150 ${url ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- a local object URL; next/image cannot load it
        <img src={url} alt={`Your 7Sage ${SECTION_NAME[section]} screenshot`} className="w-full rounded-sm border border-vellum-line" />
      )}
    </div>
  );
}
