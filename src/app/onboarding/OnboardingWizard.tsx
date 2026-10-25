"use client";

import {
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { DurationSelect } from "@/components/DailyCapacityFieldset";
import { IconButton } from "@/components/ui/Button";
import { DropZone } from "@/components/ui/DropZone";
import { FileRow, WaitNote } from "@/components/ui/FileRow";
import { SegmentedSwitch } from "@/components/ui/SegmentedSwitch";
import { CheckGlyph, ClockGlyph, ReadingGlyph } from "@/components/ui/StatusIcon";
import { DAY_ORDER } from "@/lib/engine";
import { SECTION_NAME, SECTIONS, type Statement } from "@/lib/analyticsReview";
import { ANALYTICS_INPUTS, confirmLock, type ReviewDraft } from "@/lib/reviewDraft";
import {
  ConfirmBar, ReviewStatements, STEP_PRIMARY as PRIMARY, STEP_SECONDARY as SECONDARY, SnapshotReviewFields,
  boxId, statementId, tierId, useDeferWhilePointerDown, useFocusAfterRender,
} from "@/components/SnapshotReviewFields";
import { formatDuration } from "@/lib/formatDuration";
import {
  DAY_SHORT_LABEL,
  TEST_TIME_LABEL,
  activeDraft,
  attemptMessage,
  blockedReason,
  confirmSnapshotInput,
  initialWizardState,
  practiceTestFact,
  profileWithAttempts,
  scoreMessages,
  stepLabel,
  weeklyTotalMinutes,
  wizardReducer,
  type Accommodation,
  type AttemptsDraft,
  type Screenshot,
  type WizardAction,
  type WizardState,
} from "@/lib/onboardingWizard";
import { SIGN_IN_EXPIRED, SignInAgainLink } from "@/components/SignInExpired";
import { SCREENSHOT_LIMITS, SCREENSHOT_MEDIA_TYPES, checkScreenshotType, extractScreenshot } from "@/lib/screenshotUpload";
import type { AnalyticsExtractedRow, AnalyticsSection } from "@/lib/types";
import { DAY_LABEL, MAX_OFFICIAL_ATTEMPTS, attemptMonths, type upcomingTestMonths } from "@/lib/studentProfile";
import type { createStudentProfile } from "./actions";
import LivePreview from "./LivePreview";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const FIELD = `h-11 w-full rounded-sm border bg-paper px-3 text-body text-ink ${FOCUS}`;
const SELECT = `h-[34px] min-w-0 flex-1 rounded-sm border border-vellum-line bg-paper px-2 text-small text-ink ${FOCUS}`;
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
  const draft = activeDraft(state);
  const readInFlight = useRef(false);
  const [readsEnded, setReadsEnded] = useState(0);
  const { screenshots, readAttempts } = state;

  useEffect(() => {
    if (readInFlight.current) return;
    const section = SECTIONS.find((key) => screenshots[key].status === "waiting");
    const screenshot = section && screenshots[section];
    if (!section || screenshot?.status !== "waiting") return;
    const attempt = readAttempts[section];
    async function read(section: AnalyticsSection, file: File) {
      dispatch({ type: "readStarted", section });
      const reply = await extract(file, section);
      dispatch({ type: "readEnded", section, attempt, reply, at: new Date() });
    }
    readInFlight.current = true;
    void read(section, screenshot.file).finally(() => {
      readInFlight.current = false;
      setReadsEnded((count) => count + 1);
    });
  }, [screenshots, readAttempts, extract, readsEnded]);

  function readScreenshot(section: AnalyticsSection, file: File) {
    const rejection = checkScreenshotType(file);
    dispatch(rejection ? { type: "screenshotRejected", section, message: rejection.message } : { type: "readQueued", section, file });
  }

  async function save(input: Parameters<typeof onSave>[0]) {
    dispatch({ type: "saveStarted" });
    try {
      const refusal = await onSave(input);
      if (refusal) dispatch({ type: "saveRefused", message: refusal.error });
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
          {state.step === "review" && draft && <ReviewStep state={state} draft={draft} dispatch={dispatch} onConfirm={confirmSnapshot} />}
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
  const deferWhilePointerDown = useDeferWhilePointerDown();
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
                  if (!e.currentTarget.contains(e.relatedTarget)) deferWhilePointerDown(() => dispatch({ type: "leaveAttempt", id: row.id, part: "row" }));
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
                      onBlur={() => deferWhilePointerDown(() => dispatch({ type: "leaveAttempt", id: row.id, part: "score" }))}
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
  const { screenshots, typedDraft } = state;
  const typed = state.analyticsInput === "typed";
  const anyAdded = !typed && SECTIONS.some((section) => screenshots[section].status !== "none");
  const lrRead = screenshots.LR.status === "read" ? screenshots.LR : null;
  const reason = blockedReason(state);

  return (
    <div className="flex flex-col gap-8">
      <StepHeading state={state} title="Add your 7Sage analytics" lede="Two screenshots, or the same values typed by you, tell us what to drill first." />
      <SegmentedSwitch
        name="analyticsInput"
        label="How to add your analytics"
        options={ANALYTICS_INPUTS}
        value={state.analyticsInput}
        onChange={(input) => dispatch({ type: "chooseInput", input, at: new Date() })}
      />
      {typed && typedDraft ? (
        <div className="flex flex-col gap-5">
          <SnapshotReviewFields draft={typedDraft} lrRead={[]} files={{}} dispatch={dispatch} />
        </div>
      ) : (
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
      )}
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <button type="button" disabled={saving} onClick={() => dispatch({ type: "back" })} className={SECONDARY}>
            Back
          </button>
          <button
            type="button"
            disabled={saving || Boolean(reason)}
            aria-describedby={typed ? "continue-note" : undefined}
            onClick={() => dispatch({ type: "continue" })}
            className={PRIMARY}
          >
            {anyAdded ? "Check the values" : "Continue"}
          </button>
        </div>
        {anyAdded && <p className="text-center text-small text-smoke">You can replace either screenshot before you confirm.</p>}
        {typed && reason && <p id="continue-note" className="text-center text-small text-smoke">{reason}</p>}
        <p className="text-center text-small text-smoke">
          <button type="button" disabled={saving} onClick={onSkip} className={LINK_BUTTON}>
            {saving ? "Saving…" : "Skip for now"}
          </button>
          {typed ? " · Your schedule starts after you add your analytics." : " · Your schedule starts after you add both."}
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
      <ScreenshotFileRow
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
  waiting: { text: "Waiting to read", problem: false },
  reading: { text: "Reading now", problem: false },
  refused: { text: "not read", problem: false },
  "timed-out": { text: "Reading took too long and stopped.", problem: true },
  "connection-lost": { text: "Connection lost. Your file is still here.", problem: false },
  "cannot-read": { text: "We couldn't read the rows in it.", problem: true },
  "signed-out": { text: SIGN_IN_EXPIRED, problem: true },
  "no-rows": { text: "No question types in this one.", problem: true },
};

function readSummary(section: AnalyticsSection, count: number) {
  const noun = section === "LR" ? "question type" : "passage type";
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function ScreenshotFileRow({
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
    : FILE_STATUS[status].text;

  return (
    <div className="flex flex-col gap-3">
      <FileRow
        ref={row}
        tabIndex={-1}
        className="gap-4"
        tone={status === "refused" ? "warning" : "default"}
        title={SECTION_NAME[section]}
        detail={
          <span
            aria-live="polite"
            className={`flex min-w-0 items-center gap-1.5 ${problem ? "text-danger-ink" : status === "reading" ? "text-accent" : "text-smoke"}`}
          >
            {status === "read" && <CheckGlyph />}
            {status === "waiting" && <ClockGlyph />}
            {status === "reading" && <ReadingGlyph />}
            <span className="truncate">
              {screenshot.file.name} · {statusText}
            </span>
          </span>
        }
        action={
          <button type="button" onClick={onChoose} className={`shrink-0 text-small ${LINK_BUTTON}`}>
            Replace
          </button>
        }
      >
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
        {(status === "cannot-read" || status === "timed-out") && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onTryAgain} className={SMALL_BUTTON}>
              Try again
            </button>
            {status === "cannot-read" && (
              <button type="button" onClick={onChoose} className={SMALL_BUTTON}>
                Choose a sharper screenshot
              </button>
            )}
          </div>
        )}
        {screenshot.status === "refused" && (
          <div className="flex flex-col gap-2.5">
            <WaitNote>{screenshot.message}</WaitNote>
            {screenshot.tryAgain && (
              <button type="button" onClick={onTryAgain} className={`self-start pl-5.5 text-small ${LINK_BUTTON}`}>
                Try again
              </button>
            )}
          </div>
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
      </FileRow>
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
const TYPED_STATEMENTS: { statement: Statement; text: string }[] = [
  { statement: "extractedValuesMatch", text: "I copied these values from my 7Sage Analytics page." },
  { statement: "isLatestAnalytics", text: "These are my latest 7Sage analytics." },
];

function ReviewStep({
  state,
  draft,
  dispatch,
  onConfirm,
}: {
  state: WizardState;
  draft: ReviewDraft;
  dispatch: Dispatch;
  onConfirm: () => "locked" | "sent";
}) {
  const saving = state.save === "saving";
  const reason = blockedReason(state);
  const requestFocus = useFocusAfterRender();
  const { review } = draft;
  const typed = state.analyticsInput === "typed";
  const statements = typed ? TYPED_STATEMENTS : STATEMENTS;

  function confirm() {
    const lock = confirmLock(review);
    if (onConfirm() === "sent" || !lock) return;
    const { fix } = lock;
    if (fix.at === "box") requestFocus(boxId(fix.type));
    else if (fix.at === "tier") requestFocus(tierId(fix.type));
    else if (fix.at === "add-type") requestFocus("add-type-link");
    else requestFocus(statementId(statements.findIndex(({ statement }) => !review.confirmation[statement])));
  }

  const note = saving
    ? "Saving your plan. This takes a few seconds."
    : state.save === "failed"
      ? "We couldn't save your plan. Check your connection and press Confirm snapshot again."
      : typeof state.save === "object" ? state.save.refused : reason ?? (typed && "Your first weekly schedule uses these values like a scan.");

  return (
    <div className="flex flex-col gap-8">
      {typed ? (
        <StepHeading
          state={state}
          title="Check your analytics"
          lede="These are the values you typed. Fix any value here. Nothing counts until you confirm."
        />
      ) : (
        <StepHeading
          state={state}
          title="Check what we read"
          lede={<>Compare each value with your screenshots<span className="hidden lg:inline"> on the right</span>.</>}
        />
      )}
      <div className="flex flex-col gap-5">
        <SnapshotReviewFields
          draft={draft}
          lrRead={readRows(state, "LR")}
          files={{ LR: screenshotFile(state, "LR"), RC: screenshotFile(state, "RC") }}
          dispatch={dispatch}
        />
        <ReviewStatements draft={draft} statements={statements} dispatch={dispatch} />
      </div>
      <ConfirmBar
        label="Confirm snapshot"
        saving={saving}
        locked={Boolean(reason)}
        note={note}
        onBack={() => dispatch({ type: "back" })}
        onConfirm={confirm}
      />
    </div>
  );
}

function screenshotFile(state: WizardState, section: AnalyticsSection) {
  const screenshot = state.screenshots[section];
  return screenshot.status === "none" ? undefined : screenshot.file;
}

function readRows(state: WizardState, section: AnalyticsSection) {
  const screenshot = state.screenshots[section];
  return screenshot.status === "read" ? screenshot.rows : [];
}
