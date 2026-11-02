"use client";

import { useEffect, useId, useReducer, useRef, type FormEvent, type ReactNode } from "react";
import { FailureNotice } from "@/components/FailureNotice";
import { FieldMessage, GoalTestDateSelect, ScoreInput, TestTimeChoice, WeekFields } from "@/components/StudyProfileFields";
import { FOCUS, cx } from "@/components/ui/classes";
import { DAY_ORDER } from "@/lib/engine";
import { attemptFieldMessage, type Accommodation } from "@/lib/onboardingWizard";
import {
  attemptMonths,
  dailyCapacityError,
  everyDay,
  goalScoreError,
  MAX_OFFICIAL_ATTEMPTS,
  type StudySettingsInput,
  type upcomingTestMonths,
} from "@/lib/studentProfile";
import type { DayOfWeek } from "@/lib/types";
import { isUnexpectedFailure, type FormState } from "@/lib/unexpectedFailure";
import { OfficialAttemptList, type AttemptDraft, type AttemptMessage } from "./OfficialAttemptList";

const SAVED_HOLD_MS = 6000;
const SAVE_NOTE = "Changes apply to your next weekly schedule.";
const SAVED_NOTE = "Saved. Changes apply to your next weekly schedule.";
const SEND_FAILED_NOTE = "We couldn't save your changes. Check your connection and press Save changes again.";

type Settings = {
  goalScore: string;
  goalTestDate: string;
  accommodationMultiplier: Accommodation;
  dailyCapacityMinutes: Record<DayOfWeek, number>;
  preferredPracticeTestDay: DayOfWeek;
  officialAttempts: AttemptDraft[];
};

type Phase = "editing" | "saving" | "savedHold" | "savedLeaving";

interface State {
  stored: Settings;
  draft: Settings;
  allDaysMinutes: number;
  nextAttemptId: number;
  phase: Phase;
  showMessages: boolean;
  sendFailed: boolean;
  answer: FormState | undefined;
}

type Action =
  | { type: "edit"; values: Partial<Settings> }
  | { type: "setAllDays"; minutes: number }
  | { type: "applyAllDays" }
  | { type: "addAttempt" }
  | { type: "editAttempt"; id: number; values: Partial<Pick<AttemptDraft, "score" | "month">> }
  | { type: "removeAttempt"; id: number }
  | { type: "saveRefused" }
  | { type: "saveStarted" }
  | { type: "saveEnded"; sent: Settings; answer: FormState }
  | { type: "saveNotSent" }
  | { type: "savedHoldEnded" };

const comparable = (settings: Settings) => ({
  ...settings,
  officialAttempts: settings.officialAttempts.map(({ score, month }) => ({ score: score.trim(), month })),
});
const same = (a: Settings, b: Settings) => JSON.stringify(comparable(a)) === JSON.stringify(comparable(b));

function edit(state: State, values: Partial<Settings>): State {
  return { ...state, draft: { ...state.draft, ...values }, sendFailed: false, phase: state.phase === "saving" ? "saving" : "editing" };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "edit":
      return edit(state, action.values);
    case "setAllDays":
      return { ...state, allDaysMinutes: action.minutes };
    case "applyAllDays":
      return edit(state, { dailyCapacityMinutes: everyDay(state.allDaysMinutes) });
    case "addAttempt": {
      const rows = state.draft.officialAttempts;
      if (rows.length >= MAX_OFFICIAL_ATTEMPTS) return state;
      const row = { id: state.nextAttemptId, score: "", month: "" };
      return { ...edit(state, { officialAttempts: [...rows, row] }), nextAttemptId: row.id + 1 };
    }
    case "editAttempt":
      return edit(state, {
        officialAttempts: state.draft.officialAttempts.map((row) => (row.id === action.id ? { ...row, ...action.values } : row)),
      });
    case "removeAttempt":
      return edit(state, { officialAttempts: state.draft.officialAttempts.filter((row) => row.id !== action.id) });
    case "saveRefused":
      return { ...state, showMessages: true };
    case "saveStarted":
      return { ...state, phase: "saving", sendFailed: false };
    case "saveEnded":
      if (isUnexpectedFailure(action.answer)) return { ...state, phase: "editing", answer: action.answer };
      return {
        ...state,
        stored: action.sent,
        phase: same(state.draft, action.sent) ? "savedHold" : "editing",
        showMessages: false,
        answer: action.answer,
      };
    case "saveNotSent":
      return { ...state, phase: "editing", sendFailed: true };
    case "savedHoldEnded":
      return state.phase === "savedHold" ? { ...state, phase: "savedLeaving" } : state;
  }
}

function parseScore(text: string): number | null {
  return /^\d+$/.test(text.trim()) ? Number(text) : null;
}

function messages(draft: Settings, currentScore: number) {
  const goal = parseScore(draft.goalScore);
  const goalScore =
    goal === null || goal < 120 || goal > 180
      ? "LSAT scores go from 120 to 180. Check your goal score."
      : goalScoreError(currentScore, goal);
  const goalTestDate = draft.goalTestDate === "" ? "Choose an upcoming LSAT test month." : null;
  const days: Partial<Record<DayOfWeek, string>> = {};
  for (const day of DAY_ORDER) {
    const message = dailyCapacityError(draft.dailyCapacityMinutes[day]);
    if (message) days[day] = message;
  }
  const attempts: Partial<Record<number, AttemptMessage>> = {};
  for (const row of draft.officialAttempts) {
    const message = attemptFieldMessage(row);
    if (message) attempts[row.id] = message;
  }
  const any = Boolean(goalScore || goalTestDate || Object.keys(days).length > 0 || Object.keys(attempts).length > 0);
  return { goalScore, goalTestDate, days, attempts, any };
}

function toInput(settings: Settings): StudySettingsInput {
  return {
    ...settings,
    goalScore: Number(settings.goalScore),
    officialAttempts: settings.officialAttempts.map(({ score, month }) => ({ score: Number(score), month })),
  };
}

export function StudySettingsForm({
  currentScore,
  saved,
  today,
  goalTestDateOptions,
  onSave,
}: {
  currentScore: number;
  saved: StudySettingsInput;
  today: string;
  goalTestDateOptions: ReturnType<typeof upcomingTestMonths>;
  onSave: (input: StudySettingsInput) => Promise<FormState>;
}) {
  const [state, dispatch] = useReducer(reducer, null, (): State => {
    const offered = goalTestDateOptions.some((option) => option.value === saved.goalTestDate);
    const attemptMonthOffered = new Set(attemptMonths(today).map((month) => month.value));
    const stored: Settings = {
      ...saved,
      goalScore: String(saved.goalScore),
      goalTestDate: offered ? saved.goalTestDate : "",
      officialAttempts: saved.officialAttempts.map(({ score, month }, id) => ({
        id,
        score: String(score),
        month: attemptMonthOffered.has(month) ? month : "",
      })),
    };
    return {
      stored,
      draft: stored,
      allDaysMinutes: saved.dailyCapacityMinutes.MONDAY,
      nextAttemptId: stored.officialAttempts.length,
      phase: "editing",
      showMessages: false,
      sendFailed: false,
      answer: undefined,
    };
  });
  const { draft, phase } = state;
  const form = useRef<HTMLFormElement>(null);
  const [focusRequest, requestFocus] = useReducer((count: number) => count + 1, 0);
  const found = messages(draft, currentScore);
  const visible = state.showMessages ? found : null;
  const dirty = !same(draft, state.stored);
  const edit = (values: Partial<Settings>) => dispatch({ type: "edit", values });

  useEffect(() => {
    if (phase !== "savedHold") return;
    const timer = setTimeout(() => dispatch({ type: "savedHoldEnded" }), SAVED_HOLD_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (focusRequest === 0) return;
    const first = form.current?.querySelector<HTMLElement>("[aria-invalid='true']");
    if (!first) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    first.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    first.focus({ preventScroll: true });
  }, [focusRequest]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (phase === "saving") return;
    if (found.any) {
      dispatch({ type: "saveRefused" });
      requestFocus();
      return;
    }
    const sent = draft;
    dispatch({ type: "saveStarted" });
    try {
      dispatch({ type: "saveEnded", sent, answer: await onSave(toInput(sent)) });
    } catch {
      dispatch({ type: "saveNotSent" });
    }
  }

  const goalMessageId = visible?.goalScore ? "goal-score-message" : null;
  const monthMessageId = visible?.goalTestDate ? "goal-test-date-message" : null;

  return (
    <form ref={form} onSubmit={submit} noValidate>
      <div className="flex flex-col md:mx-auto md:box-content md:max-w-content md:gap-6 md:px-8 md:pt-8 md:pb-16 lg:px-18 lg:pt-16 lg:pb-24">
        <Section title="Goal" lede="Where you are now, where you want to be, and when.">
          <div className="grid grid-cols-2 items-start gap-x-4 gap-y-5 md:gap-x-6 lg:grid-cols-4">
            <div className="flex flex-col gap-2">
              <p className="text-small font-medium text-ink">Current PT score</p>
              <p className="flex h-11 items-center text-h4 font-semibold text-ink tabular-nums">{currentScore}</p>
              <p className="text-caption text-smoke">Updates with each weekly upload</p>
            </div>
            <div className="flex flex-col gap-2">
              <ScoreInput
                label="Goal score"
                value={draft.goalScore}
                messageId={goalMessageId}
                onChange={(goalScore) => edit({ goalScore })}
              />
              {goalMessageId && (
                <FieldMessage id={goalMessageId} icon>
                  {visible?.goalScore}
                </FieldMessage>
              )}
            </div>
            <div className="col-span-2 flex flex-col gap-2 md:col-span-1">
              <GoalTestDateSelect
                label="Goal test month"
                value={draft.goalTestDate}
                options={goalTestDateOptions}
                messageId={monthMessageId}
                onChange={(goalTestDate) => edit({ goalTestDate })}
              />
              {monthMessageId && (
                <FieldMessage id={monthMessageId} icon>
                  {visible?.goalTestDate}
                </FieldMessage>
              )}
            </div>
            <div className="col-span-2 md:col-span-1">
              <TestTimeChoice value={draft.accommodationMultiplier} onChange={(accommodationMultiplier) => edit({ accommodationMultiplier })} />
            </div>
          </div>
          <OfficialAttemptList
            rows={draft.officialAttempts}
            nextId={state.nextAttemptId}
            today={today}
            messages={visible?.attempts}
            onEdit={(id, values) => dispatch({ type: "editAttempt", id, values })}
            onAdd={() => dispatch({ type: "addAttempt" })}
            onRemove={(id) => dispatch({ type: "removeAttempt", id })}
          />
        </Section>

        <Section title="Week" lede="How much time you can study each day. Each day needs at least 30 min.">
          <div className="lg:max-w-[560px]">
            <WeekFields
              values={draft}
              allDaysMinutes={state.allDaysMinutes}
              accommodation={draft.accommodationMultiplier}
              dayMessages={visible?.days}
              hintShortPracticeTestDay
              onAllDaysChange={(minutes) => dispatch({ type: "setAllDays", minutes })}
              onApplyAllDays={() => dispatch({ type: "applyAllDays" })}
              onDayChange={(day, minutes) => edit({ dailyCapacityMinutes: { ...draft.dailyCapacityMinutes, [day]: minutes } })}
              onPracticeTestDayChange={(preferredPracticeTestDay) => edit({ preferredPracticeTestDay })}
            />
          </div>
        </Section>
      </div>

      <SaveBar shown={dirty || phase === "saving" || phase === "savedHold"} phase={phase} sendFailed={state.sendFailed} />
      <FailureNotice answer={state.answer} />
    </form>
  );
}

function Section({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5 border-t-8 border-vellum bg-paper px-5 pt-7 pb-8 md:gap-6 md:rounded-md md:border md:border-vellum-line md:p-6 lg:p-8">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-h4 font-semibold text-ink">
          {title}
        </h2>
        <p className="text-body text-smoke">{lede}</p>
      </div>
      {children}
    </section>
  );
}

function SaveBar({ shown, phase, sendFailed }: { shown: boolean; phase: Phase; sendFailed: boolean }) {
  const saved = phase === "savedHold" || phase === "savedLeaving";
  const saving = phase === "saving";
  return (
    <div data-shown={shown || undefined} inert={!shown} aria-hidden={!shown || undefined} className="save-bar pointer-events-none fixed z-40">
      <div className="pointer-events-auto mx-auto flex min-h-16 max-w-content items-center justify-between gap-3 rounded-md bg-ink py-3 pr-3 pl-4 shadow-e3 md:pl-6">
        <div role="status" className="grid min-w-0 flex-1 text-[13px] leading-4 text-chalk *:col-start-1 *:row-start-1 md:text-small md:leading-[18px]">
          <p data-shown={!saved || undefined} aria-hidden={saved || undefined} className="save-bar-fade">
            {sendFailed ? SEND_FAILED_NOTE : SAVE_NOTE}
          </p>
          <p data-shown={saved || undefined} aria-hidden={!saved || undefined} className="save-bar-fade flex items-center gap-2">
            <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0 text-success" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M5 12l5 5L19 7" />
            </svg>
            {SAVED_NOTE}
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          inert={saved}
          aria-hidden={saved || undefined}
          data-shown={!saved || undefined}
          className={cx(
            "save-bar-fade h-10 shrink-0 rounded-sm bg-paper px-5 text-small font-semibold text-ink disabled:opacity-60",
            FOCUS,
          )}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
