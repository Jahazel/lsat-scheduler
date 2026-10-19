"use client";

import {
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { DurationSelect } from "@/components/DailyCapacityFieldset";
import { DAY_ORDER } from "@/lib/engine";
import { accuracyError, type ReviewRow, type Statement } from "@/lib/analyticsReview";
import { formatDuration } from "@/lib/formatDuration";
import {
  DAY_SHORT_LABEL,
  TEST_TIME_LABEL,
  accuracyMessage,
  addTypeOptions,
  blockedReason,
  confirmSnapshotInput,
  emptyListNote,
  initialWizardState,
  practiceTestHint,
  scoreMessages,
  shortDayWarning,
  stepLabel,
  toProfileInput,
  weeklyTotalMinutes,
  wizardReducer,
  type Accommodation,
  type ReviewList,
  type Screenshot,
  type WizardAction,
  type WizardState,
} from "@/lib/onboardingWizard";
import { SCREENSHOT_LIMITS, SCREENSHOT_MEDIA_TYPES, checkScreenshot, extractScreenshot } from "@/lib/screenshotUpload";
import type { AnalyticsExtractedRow, LRType, PriorityTier } from "@/lib/types";
import { DAY_LABEL, type upcomingTestMonths } from "@/lib/studentProfile";
import type { createStudentProfile } from "./actions";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600";
const FIELD = `h-11 w-full rounded-md border bg-white px-3 text-base text-ink-900 ${FOCUS}`;
const SELECT = `h-[34px] min-w-0 flex-1 rounded-md border border-ink-200 bg-white px-2 text-sm text-ink-900 ${FOCUS}`;
const PRIMARY = `h-11 flex-1 rounded-md bg-ink-900 text-base font-medium text-white transition-colors duration-150 ease-out hover:bg-ink-700 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500 ${FOCUS}`;
const SECONDARY = `h-11 w-28 shrink-0 rounded-md border border-ink-200 bg-white text-base font-medium text-ink-900 transition-colors duration-150 ease-out hover:bg-ink-50 disabled:cursor-not-allowed disabled:text-ink-400 ${FOCUS}`;
const SMALL_BUTTON = `h-10 self-start rounded-md border border-ink-200 bg-white px-[18px] text-sm font-medium text-ink-900 transition-colors duration-150 ease-out hover:bg-ink-50 ${FOCUS}`;
const LINK_BUTTON = `font-medium text-ink-900 underline underline-offset-[3px] disabled:cursor-not-allowed disabled:no-underline ${FOCUS}`;
const CHANGE_LATER = "You can change these any time in Study settings.";

interface OnboardingWizardProps {
  goalTestDateOptions: ReturnType<typeof upcomingTestMonths>;
  onSave: typeof createStudentProfile;
  extract?: typeof extractScreenshot;
}

type Dispatch = (action: WizardAction) => void;

export default function OnboardingWizard({ goalTestDateOptions, onSave, extract = extractScreenshot }: OnboardingWizardProps) {
  const [state, dispatch] = useReducer(wizardReducer, undefined, initialWizardState);

  async function readScreenshot(file: File) {
    const rejection = checkScreenshot(file);
    if (rejection) {
      dispatch({ type: "screenshotRejected", message: rejection.message });
      return;
    }
    const attempt = state.readAttempts + 1;
    dispatch({ type: "readStarted", file });
    const reply = await extract(file);
    dispatch({ type: "readEnded", attempt, reply, at: new Date() });
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
    const profile = toProfileInput(state.values);
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
    <div className="lg:grid lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,680px)_1fr]">
      <div className="flex justify-center px-5 py-8 lg:items-center lg:px-10 lg:py-16">
        <div className="w-full lg:max-w-[440px]">
          {state.step === "goal" && <GoalStep state={state} dispatch={dispatch} goalTestDateOptions={goalTestDateOptions} />}
          {state.step === "week" && <WeekStep state={state} dispatch={dispatch} />}
          {state.step === "analytics" && (
            <AnalyticsStep state={state} dispatch={dispatch} onSkip={skipForNow} onFile={readScreenshot} />
          )}
          {state.step === "review" && state.screenshot.status === "read" && (
            <ReviewStep state={state} screenshot={state.screenshot} dispatch={dispatch} onConfirm={confirmSnapshot} />
          )}
        </div>
      </div>
      <div aria-hidden className="hidden bg-ink-50 lg:block" />
    </div>
  );
}

function StepHeading({ state, title, lede }: { state: WizardState; title: string; lede: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const { changedStep } = state;
  useEffect(() => {
    if (changedStep) heading.current?.focus();
  }, [changedStep]);
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-xs uppercase tracking-[0.08em] text-ink-500">{stepLabel(state.step)}</p>
      <h1 ref={heading} tabIndex={-1} className="text-[28px] font-semibold leading-[34px] tracking-[-0.02em] text-ink-900 outline-none">
        {title}
      </h1>
      <p className="text-base text-ink-500">{lede}</p>
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
        <p id="continue-note" className="text-center text-sm text-ink-500">
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
}: {
  state: WizardState;
  dispatch: Dispatch;
  goalTestDateOptions: OnboardingWizardProps["goalTestDateOptions"];
}) {
  const messages = scoreMessages(state);
  const goalMessage = messages.goalScore ?? messages.goalNotAbove;
  const scoreBox = (invalid: boolean) => `${FIELD} ${invalid ? "border-red-700" : "border-ink-200"}`;

  return (
    <StepForm state={state} dispatch={dispatch}>
      <StepHeading state={state} title="Set your target" lede="Where you are now, where you want to be, and when." />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-2">
              <span className="text-sm font-medium text-ink-900">Current PT score</span>
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
              <span className="text-sm font-medium text-ink-900">Goal score</span>
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
            <p id="current-score-message" className="text-sm text-red-700">
              {messages.currentScore}
            </p>
          )}
          {goalMessage && (
            <p id="goal-score-message" className="text-sm text-red-700">
              {goalMessage}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="goal-test-date" className="text-sm font-medium text-ink-900">
            Goal test date
          </label>
          <select
            id="goal-test-date"
            value={state.values.goalTestDate}
            onChange={(e) => dispatch({ type: "edit", values: { goalTestDate: e.target.value } })}
            className={`${FIELD} border-ink-200`}
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
          <legend className="mb-2 text-sm font-medium text-ink-900">Test time</legend>
          <div className="flex gap-1 rounded-md bg-ink-50 p-1">
            {([1, 1.5, 2] satisfies Accommodation[]).map((multiplier) => (
              <label
                key={multiplier}
                className="flex h-9 flex-1 cursor-pointer items-center justify-center rounded text-sm text-ink-500 transition-colors duration-150 ease-out hover:bg-ink-100 hover:text-ink-900 has-[:checked]:bg-white has-[:checked]:font-medium has-[:checked]:text-ink-900 has-[:checked]:shadow-[0_1px_2px_rgb(0_0_0/0.08)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent-600"
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
      </div>
    </StepForm>
  );
}

function WeekStep({ state, dispatch }: { state: WizardState; dispatch: Dispatch }) {
  const { values } = state;
  const warning = shortDayWarning(values);

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
            <tr className="text-xs text-ink-500">
              <th scope="col" className="pb-2 pl-2 text-left font-normal lg:pl-3">Day</th>
              <th scope="col" className="pb-2 text-left font-normal">Study time</th>
              <th scope="col" className="pb-2 text-center font-normal">Practice test</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-ink-50">
              <th scope="row" className="rounded-l-md py-2 pl-2 text-left text-sm font-medium text-ink-900 lg:pl-3">
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
              <td className="rounded-r-md py-2 text-center">
                <button
                  type="button"
                  onClick={() => dispatch({ type: "applyAllDays" })}
                  className={`h-[34px] rounded-md border border-ink-900 bg-white px-2 text-sm font-medium text-ink-900 lg:px-3 hover:bg-ink-50 ${FOCUS}`}
                >
                  Apply
                </button>
              </td>
            </tr>
            {DAY_ORDER.map((day) => (
              <tr key={day} className="border-b border-ink-100">
                <th scope="row" className="py-1 pl-2 text-left text-sm font-medium text-ink-900 lg:pl-3">
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
                      className={`size-5 accent-accent-600 ${FOCUS}`}
                    />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-col gap-1 px-2 pt-5 lg:px-3">
          <p className="flex items-baseline justify-between">
            <span className="text-sm text-ink-500">Weekly total</span>
            <span aria-live="polite" className="text-base font-semibold text-ink-900">
              {formatDuration(weeklyTotalMinutes(values))}
            </span>
          </p>
          {warning ? (
            <p role="status" className="flex gap-2 text-sm text-amber-700">
              <svg aria-hidden viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 2.5 14 13H2L8 2.5Z" strokeLinejoin="round" />
                <path d="M8 6.5v3M8 11.25v.01" strokeLinecap="round" />
              </svg>
              {warning}
            </p>
          ) : (
            <p className="text-sm text-ink-500">{practiceTestHint(values.accommodationMultiplier)}</p>
          )}
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
  onFile: (file: File) => void;
}) {
  const saving = state.save === "saving";
  const { screenshot } = state;
  const picker = useRef<HTMLInputElement>(null);
  const choose = () => picker.current?.click();

  return (
    <div className="flex flex-col gap-8">
      <StepHeading
        state={state}
        title="Add your 7Sage analytics"
        lede="One screenshot shows us which question types to drill first."
      />
      <input
        ref={picker}
        type="file"
        hidden
        aria-label="Screenshot file"
        accept={SCREENSHOT_MEDIA_TYPES.join(",")}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      {screenshot.status === "none" ? (
        <div className="flex flex-col gap-6">
          <DropZone rejection={state.screenshotRejection} onChoose={choose} onFile={onFile} />
          <WhereToFindIt />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <FileRow
            screenshot={screenshot}
            rejection={state.screenshotRejection}
            onChoose={choose}
            onTryAgain={() => onFile(screenshot.file)}
          />
          {screenshot.status === "read" && <RowsFound rows={screenshot.rows} />}
        </div>
      )}
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
            {screenshot.status === "none" ? "Continue" : "Check the values"}
          </button>
        </div>
        {screenshot.status !== "none" && (
          <p className="text-center text-sm text-ink-500">You can replace the screenshot before you confirm.</p>
        )}
        <p className="text-center text-sm text-ink-500">
          <button type="button" disabled={saving} onClick={onSkip} className={LINK_BUTTON}>
            {saving ? "Saving…" : "Skip for now"}
          </button>
          {" · Your schedule starts after you add one."}
        </p>
        <p role="status" className="text-center text-sm text-ink-700">
          {state.save === "failed" && "We couldn't save your plan. Check your connection and press Skip for now again."}
        </p>
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 16V4m0 0-4 4m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The file type is checked on drop, not on drag over, because some browsers hide it during a drag.
function DropZone({ rejection, onChoose, onFile }: { rejection: string | null; onChoose: () => void; onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const zone = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (document.activeElement === document.body) zone.current?.focus();
  }, [rejection]);
  const border = dragging
    ? "border-accent-600 bg-accent-100/40"
    : rejection
      ? "border-red-700 bg-ink-50"
      : "border-ink-400 bg-ink-50 hover:border-ink-900";

  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        ref={zone}
        type="button"
        onClick={onChoose}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          const into = event.relatedTarget;
          if (!(into instanceof Node && event.currentTarget.contains(into))) setDragging(false);
        }}
        onDrop={drop}
        aria-describedby={rejection ? "screenshot-rejection" : undefined}
        className={`flex h-[248px] flex-col items-center justify-center gap-4 rounded-md border-[1.5px] border-dashed p-8 transition-colors duration-150 ease-out ${border} ${FOCUS}`}
      >
        <span
          className={`grid size-12 place-items-center rounded-full border ${dragging ? "border-accent-600 bg-white text-accent-600" : "border-ink-200 bg-white text-ink-900"}`}
        >
          <UploadIcon />
        </span>
        {dragging ? (
          <span className="flex flex-col items-center gap-1">
            <span className="text-base font-semibold text-accent-600">Drop to add it</span>
            <span className="text-sm text-ink-500">{SCREENSHOT_LIMITS}</span>
          </span>
        ) : (
          <span className="flex flex-col items-center gap-1">
            <span className="text-base font-semibold text-ink-900">Drop your screenshot here</span>
            <span className="text-sm text-ink-500">
              or <span className="font-medium text-accent-600 underline underline-offset-[3px]">choose a file</span> · {SCREENSHOT_LIMITS}
            </span>
          </span>
        )}
      </button>
      {rejection && (
        <p id="screenshot-rejection" role="alert" className="text-sm text-red-700">
          {rejection}
        </p>
      )}
    </div>
  );
}

function WhereToFindIt() {
  const steps = [
    "In 7Sage, open the Analytics page you checked most recently.",
    "Find the Logical Reasoning question types list.",
    "Take one screenshot that shows every row, with its percentage or priority tier.",
  ];
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-ink-900">Where to find it</h2>
      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <li key={step} className="flex items-baseline gap-3 text-sm text-ink-900">
            <span aria-hidden className="w-4 shrink-0 font-mono text-xs text-ink-500">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

const FILE_STATUS: Record<Exclude<Screenshot["status"], "none">, { text: string; problem: boolean }> = {
  reading: { text: "Reading your screenshot…", problem: false },
  read: { text: "Done reading.", problem: false },
  "connection-lost": { text: "Connection lost. Your file is still here.", problem: false },
  "cannot-read": { text: "We couldn't read the rows in it.", problem: true },
  "no-rows": { text: "No question types in this one.", problem: true },
};

function FileRow({
  screenshot,
  rejection,
  onChoose,
  onTryAgain,
}: {
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

  return (
    <div className="flex flex-col gap-3">
      <div ref={row} tabIndex={-1} className="flex flex-col gap-4 rounded-md border border-ink-200 p-4 outline-none">
        <div className="flex items-center gap-4">
          <span aria-hidden className="flex h-12 w-16 shrink-0 flex-col justify-center gap-1 rounded border border-ink-200 bg-ink-50 p-2">
            <span className="h-[3px] w-9 rounded-sm bg-ink-900/30" />
            <span className="h-[3px] w-11 rounded-sm bg-ink-900/20" />
            <span className="h-[3px] w-7 rounded-sm bg-ink-900/20" />
            <span className="h-[3px] w-10 rounded-sm bg-ink-900/20" />
          </span>
          <div className="flex min-w-0 grow flex-col gap-0.5 text-sm">
            <span className="truncate font-medium text-ink-900">{screenshot.file.name}</span>
            <span aria-live="polite" className={FILE_STATUS[status].problem ? "text-red-700" : "text-ink-500"}>
              {FILE_STATUS[status].text}
            </span>
          </div>
          <button type="button" onClick={onChoose} className={`shrink-0 text-sm ${LINK_BUTTON}`}>
            Replace
          </button>
        </div>
        {status === "reading" && (
          <div role="progressbar" aria-label="Reading your screenshot" className="h-1 overflow-hidden rounded-sm bg-ink-50">
            <div className="h-1 w-3/5 rounded-sm bg-accent-600" />
          </div>
        )}
        {status === "connection-lost" && (
          <>
            <div aria-hidden className="h-1 overflow-hidden rounded-sm bg-ink-50">
              <div className="h-1 w-3/5 rounded-sm bg-ink-400" />
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
        {status === "no-rows" && (
          <>
            <RightPartExample />
            <button type="button" onClick={onChoose} className={SMALL_BUTTON}>
              Choose another screenshot
            </button>
          </>
        )}
      </div>
      {rejection && (
        <p role="alert" className="text-sm text-red-700">
          {rejection}
        </p>
      )}
    </div>
  );
}

function RightPartExample() {
  const rows: { type: string; value: string; bar?: number }[] = [
    { type: "Diagram", value: "64%", bar: 64 },
    { type: "Conditional reasoning", value: "68%", bar: 68 },
    { type: "Necessary assumption", value: "71%", bar: 71 },
    { type: "Phenomenon-hypothesis", value: "HIGHEST" },
    { type: "Causal reasoning", value: "MEDIUM" },
  ];
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-ink-900">Capture this part of 7Sage Analytics</span>
        <span className="text-xs text-ink-500">Example</span>
      </figcaption>
      <div className="flex flex-col gap-3 rounded-md bg-ink-50 p-4">
        <div aria-hidden className="flex items-center gap-3 opacity-55">
          <span className="h-2 w-11 rounded bg-ink-900/35" />
          <span className="h-2 w-16 rounded bg-ink-900/15" />
          <span className="h-2 w-[52px] rounded bg-ink-900/15" />
        </div>
        <div aria-hidden className="flex h-11 items-end gap-1.5 rounded-md bg-white p-2 opacity-55">
          {[14, 20, 18, 26, 24, 28].map((height, index) => (
            <span key={index} className="w-3.5 rounded-sm bg-ink-900/15" style={{ height }} />
          ))}
        </div>
        <div className="flex flex-col gap-2 rounded-md border-2 border-accent-600 bg-white p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink-900">Logical Reasoning question types</span>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-accent-600 px-2 py-0.5 font-medium text-white">This part</span>
          </div>
          {rows.map((row) => (
            <div key={row.type} className="flex items-center gap-2">
              <span className="w-[148px] shrink-0 text-ink-500">{row.type}</span>
              <span aria-hidden className="flex h-1.5 grow rounded-full bg-ink-50">
                {row.bar !== undefined && <span className="h-1.5 rounded-full bg-ink-900/30" style={{ width: `${row.bar}%` }} />}
              </span>
              <span className="shrink-0 text-right font-mono text-ink-500">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

function RowsFound({ rows }: { rows: AnalyticsExtractedRow[] }) {
  return (
    <div className="flex flex-col gap-6">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="h-7 border-b border-ink-200 text-xs text-ink-500">
            <th scope="col" className="px-3 text-left font-normal">
              Found · {rows.length} {rows.length === 1 ? "row" : "rows"}
            </th>
            <th scope="col" className="px-3 text-right font-normal">Accuracy or priority</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.type} className="h-[38px] border-b border-ink-200">
              <th scope="row" className="px-3 text-left font-normal text-ink-900">{row.type}</th>
              <td className="px-3 text-right">
                <RowValue row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 text-sm text-ink-500">
        Next, you check each value and confirm this is your latest 7Sage analytics. Nothing counts until you confirm.
      </p>
    </div>
  );
}

function RowValue({ row }: { row: AnalyticsExtractedRow }) {
  if (row.accuracy !== undefined) return <span className="font-mono text-[13px] text-ink-900">{row.accuracy}%</span>;
  if (!row.isTopPriority) return <span className="text-ink-500">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700">
      <svg aria-hidden viewBox="0 0 10 10" className="size-2.5" fill="currentColor" stroke="currentColor" strokeLinejoin="round">
        <path d="M2 9V1.5h5.5L6.5 3.5l1 2H2" />
      </svg>
      Highest priority
    </span>
  );
}


type ReadScreenshot = Extract<Screenshot, { status: "read" }>;

const STATEMENTS: { statement: Statement; text: string }[] = [
  { statement: "extractedValuesMatch", text: "I reviewed these values and they match my screenshot." },
  { statement: "isLatestAnalytics", text: "This screenshot contains my latest 7Sage analytics." },
];

const boxId = (type: LRType) => `accuracy-${type.replace(/\W+/g, "-")}`;

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
      setTimeout(() => {
        pressing.current = false;
      });
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
  screenshot,
  dispatch,
  onConfirm,
}: {
  state: WizardState;
  screenshot: ReadScreenshot;
  dispatch: Dispatch;
  onConfirm: () => "locked" | "sent";
}) {
  const { review } = screenshot;
  const saving = state.save === "saving";
  const reason = blockedReason(state);
  const requestFocus = useFocusAfterRender();
  const afterPress = useAfterPress();

  const accuracyRows = review.rows.filter(({ row }) => row.category === "regular");
  const flagRows = review.rows.filter(({ row }) => row.category === "restricted");

  function confirm() {
    if (onConfirm() === "sent") return;
    const wrong = review.rows.find(({ row }) => accuracyError(row));
    const unticked = STATEMENTS.findIndex(({ statement }) => !review.confirmation[statement]);
    requestFocus(wrong ? boxId(wrong.row.type) : `statement-${unticked}`);
  }

  const note = saving
    ? "Saving your plan. This takes a few seconds."
    : state.save === "failed"
      ? "We couldn't save your plan. Check your connection and press Confirm snapshot again."
      : reason;

  return (
    <div className="flex flex-col gap-8">
      <StepHeading state={state} title="Check what we read" lede="Compare each value with your screenshot." />
      <div className="flex flex-col gap-5">
        <ScreenshotToggle file={screenshot.file} />
        <div className="flex flex-col">
          <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-ink-100 px-3 py-1.5 text-xs text-ink-500">
            <span>
              Accuracy · {accuracyRows.length} {accuracyRows.length === 1 ? "type" : "types"}
            </span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-2.5 w-3.5 rounded-[3px] border border-dashed border-accent-600" />
                Read from screenshot
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-2.5 w-3.5 rounded-[3px] border border-ink-900" />
                Edited by you
              </span>
            </span>
          </div>
          {accuracyRows.map((entry) => (
            <AccuracyRow
              key={entry.row.type}
              entry={entry}
              message={accuracyMessage(state, entry.row.type)}
              dispatch={dispatch}
              onLeave={() => afterPress(() => dispatch({ type: "leaveAccuracyBox", rowType: entry.row.type }))}
            />
          ))}
          <EmptyListNote state={state} list="accuracy" />
        </div>
        <div className="flex flex-col">
          <div className="flex min-h-7 items-center border-b border-ink-100 px-3 py-1.5 text-xs text-ink-500">
            Priority flags · ticked flags go first in your plan
          </div>
          {flagRows.map(({ row }) => (
            <Checkbox
              key={row.type}
              checked={row.isTopPriority ?? false}
              onChange={() => dispatch({ type: "toggleFlag", rowType: row.type })}
              detail={row.priorityTier && <TierPill tier={row.priorityTier} />}
              className="min-h-9 items-center border-b border-ink-100 px-3 py-1.5"
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
        <div className="flex flex-col gap-2.5 rounded-md bg-ink-50 px-4 py-3.5">
          {STATEMENTS.map(({ statement, text }, index) => (
            <Checkbox
              key={statement}
              id={`statement-${index}`}
              checked={review.confirmation[statement]}
              onChange={(checked) => dispatch({ type: "setStatement", statement, checked, at: new Date() })}
              className="items-start"
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
            className={`h-11 flex-1 rounded-md text-base font-medium transition-colors duration-150 ease-out ${FOCUS} ${
              saving
                ? "cursor-wait bg-ink-700 text-white"
                : reason
                  ? "cursor-not-allowed bg-ink-200 text-ink-500"
                  : "bg-ink-900 text-white hover:bg-ink-700"
            }`}
          >
            {saving ? "Saving…" : "Confirm snapshot"}
          </button>
        </div>
        <p id="confirm-note" role="status" className={`text-center text-sm ${state.save === "failed" ? "text-ink-700" : "text-ink-500"}`}>
          {note}
        </p>
      </div>
    </div>
  );
}

function AccuracyRow({
  entry,
  message,
  dispatch,
  onLeave,
}: {
  entry: ReviewRow;
  message: string | null;
  dispatch: Dispatch;
  onLeave: () => void;
}) {
  const { row, original } = entry;
  const edited = original?.accuracy !== row.accuracy;
  const was = edited && original?.accuracy !== undefined ? `was ${original.accuracy}%` : null;
  const id = boxId(row.type);
  const box = message
    ? "border-red-700 bg-white"
    : edited
      ? "border-ink-900 bg-white"
      : "border-dashed border-accent-600 bg-accent-100/30";

  return (
    <div className="flex flex-col border-b border-ink-100 focus-within:rounded-sm focus-within:border-transparent focus-within:bg-accent-100/40 focus-within:outline-[1.5px] focus-within:outline-accent-600 focus-within:outline-solid">
      <div className="flex min-h-[38px] items-center gap-3 py-1 pl-3 pr-1">
        <label htmlFor={id} className="grow text-sm text-ink-900">
          {row.type}
        </label>
        <span className="w-[72px] shrink-0 text-right font-mono text-xs text-ink-500">{was}</span>
        <span className={`flex h-[30px] w-16 shrink-0 items-center rounded-md border px-2 ${box}`}>
          <input
            id={id}
            inputMode="numeric"
            autoComplete="off"
            aria-label={`${row.type} accuracy`}
            value={row.accuracy ?? ""}
            onChange={(e) => dispatch({ type: "editAccuracy", rowType: row.type, text: e.target.value })}
            onBlur={onLeave}
            aria-invalid={message ? true : undefined}
            aria-describedby={message ? `${id}-message` : undefined}
            className="w-full min-w-0 bg-transparent text-right font-mono text-[13px] text-ink-900 outline-none"
          />
          <span aria-hidden className="pl-0.5 font-mono text-[13px] text-ink-500">%</span>
        </span>
        <button
          type="button"
          aria-label={`Remove ${row.type}`}
          onClick={() => dispatch({ type: "removeRow", rowType: row.type })}
          className={`grid size-7 shrink-0 place-items-center rounded text-ink-400 hover:text-ink-900 ${FOCUS}`}
        >
          <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
          </svg>
        </button>
      </div>
      {message && (
        <p id={`${id}-message`} className="px-3 pb-2 text-sm text-red-700">
          {message}
        </p>
      )}
    </div>
  );
}

function EmptyListNote({ state, list }: { state: WizardState; list: ReviewList }) {
  const note = emptyListNote(state, list);
  return note && <p className="border-b border-ink-100 px-3 py-3.5 text-sm text-ink-900">{note}</p>;
}

const TIER_LABEL: Record<PriorityTier, string> = { highest: "Highest", medium: "Medium", low: "Low" };

function TierPill({ tier }: { tier: PriorityTier }) {
  const highest = tier === "highest";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dashed px-2 py-0.5 text-xs font-medium ${
        highest ? "border-accent-600 text-accent-700" : "border-ink-400 text-ink-500"
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
  className: string;
  children: ReactNode;
}) {
  const labelId = useId();
  const detailId = useId();
  return (
    <label className={`group flex cursor-pointer gap-3 text-sm text-ink-900 ${className}`}>
      <span className="relative mt-px grid size-4 shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-labelledby={labelId}
          aria-describedby={detail ? detailId : undefined}
          className={`peer size-4 appearance-none rounded-[4px] border border-ink-500 bg-white transition-colors duration-150 ease-out checked:border-ink-900 checked:bg-ink-900 not-checked:group-hover:border-ink-900 not-checked:group-hover:bg-ink-50 ${FOCUS}`}
        />
        <svg aria-hidden viewBox="0 0 10 10" className="pointer-events-none absolute inset-0 m-auto size-2.5 opacity-0 peer-checked:opacity-100" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 5.2l2 2L8 3" />
        </svg>
      </span>
      <span id={labelId} className="grow">
        {children}
      </span>
      {detail && <span id={detailId}>{detail}</span>}
    </label>
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
        className={`flex items-center gap-2 self-start px-3 text-sm ${LINK_BUTTON}`}
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
          className="h-9 min-w-0 grow rounded-md border-2 border-accent-600 bg-white px-3 text-sm text-ink-900 outline-none"
        />
        <button type="button" onClick={() => close()} className={`h-9 px-3 text-sm ${LINK_BUTTON}`}>
          Cancel
        </button>
      </div>
      <div id="add-type-options" role="listbox" aria-label="Question types" className="flex max-h-72 flex-col overflow-y-auto rounded-md border border-ink-200 bg-white py-1.5">
        {ADD_TYPE_GROUPS.map(({ list, label, none }, groupIndex) => (
          <div
            key={list}
            role="group"
            aria-labelledby={`add-type-group-${list}`}
            className={groupIndex > 0 ? "mt-1 border-t border-ink-100 pt-1" : undefined}
          >
            <div id={`add-type-group-${list}`} role="presentation" className="px-3 py-1.5 text-xs text-ink-500">
              {label}
            </div>
            {options[list].length === 0 && <div className="flex h-9 items-center px-3 text-sm text-ink-500">{`${none} "${query.trim()}"`}</div>}
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
                  className={`flex min-h-9 cursor-pointer items-center justify-between px-3 text-sm text-ink-900 ${selected ? "bg-ink-50" : ""}`}
                >
                  {type}
                  {selected && <span className="font-mono text-xs text-ink-500">Enter</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenshotToggle({ file }: { file: File }) {
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
        className={`flex items-center gap-3 rounded-md border border-ink-200 bg-white p-3 text-left ${FOCUS}`}
      >
        <span aria-hidden className="flex h-9 w-11 shrink-0 flex-col justify-center gap-1 rounded bg-ink-50 px-2">
          <span className="h-0.5 w-6 bg-ink-400" />
          <span className="h-0.5 w-5 bg-ink-400" />
          <span className="h-0.5 w-6 bg-ink-400" />
        </span>
        <span className="flex min-w-0 grow flex-col gap-0.5">
          <span className="text-sm font-medium text-ink-900">{url ? "Hide your screenshot" : "Show your screenshot"}</span>
          <span className="truncate font-mono text-xs text-ink-500">{file.name}</span>
        </span>
        <svg aria-hidden viewBox="0 0 16 16" className={`size-4 shrink-0 transition-transform duration-150 ${url ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- a local object URL; next/image cannot load it
        <img src={url} alt="Your 7Sage screenshot" className="w-full rounded-md border border-ink-200" />
      )}
    </div>
  );
}
