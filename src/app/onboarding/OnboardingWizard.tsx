"use client";

import { useEffect, useReducer, useRef, type FormEvent, type ReactNode } from "react";
import { DurationSelect } from "@/components/DailyCapacityFieldset";
import { DAY_ORDER } from "@/lib/engine";
import { formatDuration } from "@/lib/formatDuration";
import {
  DAY_SHORT_LABEL,
  TEST_TIME_LABEL,
  blockedReason,
  initialWizardState,
  practiceTestHint,
  scoreMessages,
  shortDayWarning,
  stepLabel,
  toProfileInput,
  weeklyTotalMinutes,
  wizardReducer,
  type Accommodation,
  type WizardAction,
  type WizardState,
} from "@/lib/onboardingWizard";
import { DAY_LABEL, type upcomingTestMonths } from "@/lib/studentProfile";
import type { createStudentProfile } from "./actions";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600";
const FIELD = `h-11 w-full rounded-md border bg-white px-3 text-base text-ink-900 ${FOCUS}`;
const SELECT = `h-[34px] min-w-0 flex-1 rounded-md border border-ink-200 bg-white px-2 text-sm text-ink-900 ${FOCUS}`;
const PRIMARY = `h-11 flex-1 rounded-md bg-ink-900 text-base font-medium text-white transition-colors duration-150 ease-out hover:bg-ink-700 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500 ${FOCUS}`;
const SECONDARY = `h-11 w-28 shrink-0 rounded-md border border-ink-200 bg-white text-base font-medium text-ink-900 transition-colors duration-150 ease-out hover:bg-ink-50 disabled:cursor-not-allowed disabled:text-ink-400 ${FOCUS}`;
const CHANGE_LATER = "You can change these any time in Study settings.";

interface OnboardingWizardProps {
  goalTestDateOptions: ReturnType<typeof upcomingTestMonths>;
  onSave: typeof createStudentProfile;
}

type Dispatch = (action: WizardAction) => void;

export default function OnboardingWizard({ goalTestDateOptions, onSave }: OnboardingWizardProps) {
  const [state, dispatch] = useReducer(wizardReducer, undefined, initialWizardState);

  async function skipForNow() {
    const profile = toProfileInput(state.values);
    if (!profile || state.save === "saving") return;
    dispatch({ type: "saveStarted" });
    try {
      await onSave({ ...profile, analyticsRows: [], analyticsApproval: null });
    } catch {
      dispatch({ type: "saveFailed" });
    }
  }

  return (
    <div className="lg:grid lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,680px)_1fr]">
      <div className="flex justify-center px-5 py-8 lg:items-center lg:px-10 lg:py-16">
        <div className="w-full lg:max-w-[440px]">
          {state.step === "goal" && <GoalStep state={state} dispatch={dispatch} goalTestDateOptions={goalTestDateOptions} />}
          {state.step === "week" && <WeekStep state={state} dispatch={dispatch} />}
          {state.step === "analytics" && <AnalyticsStep state={state} dispatch={dispatch} onSkip={skipForNow} />}
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

function AnalyticsStep({ state, dispatch, onSkip }: { state: WizardState; dispatch: Dispatch; onSkip: () => void }) {
  const saving = state.save === "saving";
  return (
    <div className="flex flex-col gap-8">
      <StepHeading
        state={state}
        title="Add your 7Sage analytics"
        lede="One screenshot shows us which question types to drill first."
      />
      <div className="flex flex-col gap-4">
        <button type="button" disabled={saving} onClick={() => dispatch({ type: "back" })} className={SECONDARY}>
          Back
        </button>
        <p className="text-sm text-ink-500">
          <button
            type="button"
            disabled={saving}
            onClick={onSkip}
            className={`font-medium text-ink-900 underline underline-offset-4 disabled:cursor-not-allowed disabled:no-underline ${FOCUS}`}
          >
            {saving ? "Saving…" : "Skip for now"}
          </button>
          {" · Your schedule starts after you add one."}
        </p>
        <p role="status" className="text-sm text-ink-700">
          {state.save === "failed" && "We couldn't save your plan. Check your connection and press Skip for now again."}
        </p>
      </div>
    </div>
  );
}
