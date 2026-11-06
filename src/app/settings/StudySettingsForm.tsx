"use client";

import { useEffect, useId, useReducer, useRef, type FormEvent, type ReactNode, type Ref } from "react";
import { FailureNotice } from "@/components/FailureNotice";
import { FieldMessage, GoalTestDateSelect, ScoreInput, TestTimeChoice, WeekFields } from "@/components/StudyProfileFields";
import { Button } from "@/components/ui/Button";
import { FOCUS, cx } from "@/components/ui/classes";
import { DAY_ORDER } from "@/lib/engine";
import { attemptMonths, dailyCapacityError, everyDay, type StudySettingsInput, type upcomingTestMonths } from "@/lib/studentProfile";
import {
  addAttempt,
  attemptProblemMessage,
  editAttempt,
  goalScoreMessage,
  removeAttempt,
  toOfficialAttempts,
  type Accommodation,
  type AttemptMessage,
  type AttemptRow,
} from "@/lib/studyProfileDraft";
import type { DayOfWeek } from "@/lib/types";
import { isUnexpectedFailure } from "@/lib/unexpectedFailure";
import type { StudySettingsAnswer } from "./actions";
import { LeaveGuard } from "./LeaveGuard";
import { OfficialAttemptList } from "./OfficialAttemptList";
import { SettingsWeekPreview } from "./SettingsWeekPreview";

const SAVED_HOLD_MS = 6000;
const SAVE_NOTE = "Changes apply to your next weekly schedule.";
const SAVED_NOTE = "Saved. Changes apply to your next weekly schedule.";
const PASSED_NOTICE_ID = "test-month-passed-notice";
const SEND_FAILED_NOTE = "We couldn't save your changes. Check your connection and press Save changes again.";

type Settings = {
  goalScore: string;
  goalTestDate: string;
  accommodationMultiplier: Accommodation;
  dailyCapacityMinutes: Record<DayOfWeek, number>;
  preferredPracticeTestDay: DayOfWeek;
  officialAttempts: AttemptRow[];
};

type Phase = "editing" | "saving" | "savedHold" | "savedLeaving";

interface State {
  currentScore: number;
  stored: Settings;
  draft: Settings;
  allDaysMinutes: number;
  nextAttemptId: number;
  phase: Phase;
  showMessages: boolean;
  sendFailed: boolean;
  answer: StudySettingsAnswer | undefined;
}

type Action =
  | { type: "edit"; values: Partial<Settings> }
  | { type: "setAllDays"; minutes: number }
  | { type: "applyAllDays" }
  | { type: "addAttempt" }
  | { type: "editAttempt"; id: number; values: Partial<Pick<AttemptRow, "score" | "month">> }
  | { type: "removeAttempt"; id: number }
  | { type: "saveRefused" }
  | { type: "saveStarted" }
  | { type: "saveEnded"; sent: Settings; answer: StudySettingsAnswer }
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
      const id = state.nextAttemptId;
      const officialAttempts = addAttempt(state.draft.officialAttempts, { id, score: "", month: "" });
      return officialAttempts ? { ...edit(state, { officialAttempts }), nextAttemptId: id + 1 } : state;
    }
    case "editAttempt":
      return edit(state, { officialAttempts: editAttempt(state.draft.officialAttempts, action.id, action.values) });
    case "removeAttempt":
      return edit(state, { officialAttempts: removeAttempt(state.draft.officialAttempts, action.id) });
    case "saveRefused":
      return { ...state, showMessages: true };
    case "saveStarted":
      return { ...state, phase: "saving", sendFailed: false };
    case "saveEnded":
      if (isUnexpectedFailure(action.answer)) return { ...state, phase: "editing", answer: action.answer };
      if (action.answer?.refused === "goalScore") {
        return { ...state, currentScore: action.answer.currentScore, phase: "editing", showMessages: true, answer: action.answer };
      }
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

function messages(draft: Settings, currentScore: number) {
  const goalScore = goalScoreMessage(currentScore, draft.goalScore);
  const goalTestDate = draft.goalTestDate === "" ? "Choose an upcoming LSAT test month." : null;
  const days: Partial<Record<DayOfWeek, string>> = {};
  for (const day of DAY_ORDER) {
    const message = dailyCapacityError(draft.dailyCapacityMinutes[day]);
    if (message) days[day] = message;
  }
  const attempts: Partial<Record<number, AttemptMessage>> = {};
  for (const row of draft.officialAttempts) {
    const message = attemptProblemMessage(row);
    if (message) attempts[row.id] = message;
  }
  const any = Boolean(goalScore || goalTestDate || Object.keys(days).length > 0 || Object.keys(attempts).length > 0);
  return { goalScore, goalTestDate, days, attempts, any };
}

function toInput(settings: Settings): StudySettingsInput {
  return {
    ...settings,
    goalScore: Number(settings.goalScore),
    officialAttempts: toOfficialAttempts(settings.officialAttempts),
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
  onSave: (input: StudySettingsInput) => Promise<StudySettingsAnswer>;
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
      currentScore,
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
  const { draft, phase, currentScore: knownScore } = state;
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const saveButton = useRef<HTMLButtonElement>(null);
  const runningSave = useRef<Promise<boolean> | null>(null);
  const [focusRequest, requestFocus] = useReducer((count: number) => count + 1, 0);
  const found = messages(draft, knownScore);
  const visible = state.showMessages ? found : null;
  const dirty = !same(draft, state.stored);
  const edit = (values: Partial<Settings>) => dispatch({ type: "edit", values });

  useEffect(() => {
    if (phase !== "savedHold") return;
    const active = document.activeElement;
    if (active === saveButton.current || active === document.body) heading.current?.focus({ preventScroll: true });
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
    runningSave.current = save(draft);
    await runningSave.current;
    runningSave.current = null;
  }

  async function save(sent: Settings) {
    dispatch({ type: "saveStarted" });
    try {
      const answer = await onSave(toInput(sent));
      dispatch({ type: "saveEnded", sent, answer });
      if (answer && "refused" in answer) requestFocus();
      return answer === null;
    } catch {
      dispatch({ type: "saveNotSent" });
      return false;
    }
  }

  const goalMessageId = visible?.goalScore ? "goal-score-message" : null;
  const monthMessageId = visible?.goalTestDate ? "goal-test-date-message" : null;
  const monthPassed = state.stored.goalTestDate === "";

  return (
    <>
      <header data-page-section className="border-b border-vellum-line bg-paper px-5 pt-6 pb-6 md:px-8 md:pt-10 md:pb-8 lg:px-18 lg:pt-12 lg:pb-10">
        <div className="mx-auto flex max-w-content flex-col gap-3">
          <h1 ref={heading} tabIndex={-1} className="text-h3 font-semibold text-ink outline-none md:text-h2">
            Study settings
          </h1>
          <p className="text-body text-smoke md:text-lead">Your goal and your week. Changes apply to your next weekly schedule.</p>
        </div>
      </header>
      <form ref={form} onSubmit={submit} noValidate>
        <div className="flex flex-col md:mx-auto md:box-content md:max-w-content md:gap-6 md:px-8 md:pt-8 md:pb-16 lg:px-18 lg:pt-16 lg:pb-24">
          {monthPassed && (
            <p
              id={PASSED_NOTICE_ID}
              data-page-section
              className="flex items-start gap-2.5 border-y border-warning-line bg-warning-wash px-5 py-3 text-small text-ink md:rounded-xs md:border md:px-4 max-md:[&+section]:border-t-0"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="size-[18px] shrink-0 text-warning-ink" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16.5v.5" />
              </svg>
              Your test month has passed. Choose a new one.
            </p>
          )}
          <Section title="Goal" lede="Where you are now, where you want to be, and when.">
            <div className="grid grid-cols-2 items-start gap-x-4 gap-y-5 md:gap-x-6 lg:grid-cols-4">
              <div className="flex flex-col gap-2">
                <p className="text-small font-medium text-ink">Current PT score</p>
                <p className="flex h-11 items-center text-h4 font-semibold text-ink tabular-nums">{knownScore}</p>
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
                  placeholder="Choose a month"
                  noticeId={monthPassed ? PASSED_NOTICE_ID : null}
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
            <div className="flex items-start gap-10">
              <div className="min-w-0 flex-1 lg:grow-0 lg:basis-[560px]">
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
              <SettingsWeekPreview
                currentScore={knownScore}
                goalScore={draft.goalScore}
                testMonthLabel={goalTestDateOptions.find((option) => option.value === draft.goalTestDate)?.label ?? null}
                week={draft}
                storedWeek={state.stored}
              />
            </div>
          </Section>
        </div>

        <SaveBar
          shown={dirty || phase === "saving" || phase === "savedHold"}
          phase={phase}
          sendFailed={state.sendFailed}
          buttonRef={saveButton}
        />
        <FailureNotice answer={state.answer} />
        <LeaveGuard dirty={dirty} waitForSave={() => runningSave.current ?? Promise.resolve(true)} />
      </form>
    </>
  );
}

function Section({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} data-page-section className="flex flex-col gap-5 border-t-8 border-vellum bg-paper px-5 pt-7 pb-8 md:gap-6 md:rounded-md md:border md:border-vellum-line md:p-6 lg:p-8">
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

function statusText(phase: Phase, sendFailed: boolean) {
  if (phase === "saving") return "Saving…";
  if (phase === "savedHold" || phase === "savedLeaving") return SAVED_NOTE;
  return sendFailed ? SEND_FAILED_NOTE : SAVE_NOTE;
}

function SaveBar({ shown, phase, sendFailed, buttonRef }: { shown: boolean; phase: Phase; sendFailed: boolean; buttonRef: Ref<HTMLButtonElement> }) {
  const saved = phase === "savedHold" || phase === "savedLeaving";
  const saving = phase === "saving";
  return (
    <div data-shown={shown || undefined} inert={!shown} aria-hidden={!shown || undefined} className="save-bar pointer-events-none fixed z-40">
      <div className="pointer-events-auto mx-auto flex min-h-16 max-w-content items-center justify-between gap-3 rounded-md bg-ink py-3 pr-3 pl-4 shadow-e3 md:pl-6">
        <p role="status" className="sr-only">
          {statusText(phase, sendFailed)}
        </p>
        <div aria-hidden className="grid min-w-0 flex-1 text-[13px] leading-4 text-chalk *:col-start-1 *:row-start-1 md:text-small md:leading-[18px]">
          <p data-shown={!saved || undefined} className="save-bar-fade">
            {sendFailed ? SEND_FAILED_NOTE : SAVE_NOTE}
          </p>
          <p data-shown={saved || undefined} className="save-bar-fade flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-success" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M5 12l5 5L19 7" />
            </svg>
            {SAVED_NOTE}
          </p>
        </div>
        <Button
          ref={buttonRef}
          type="submit"
          variant="bare"
          size="md"
          waiting={saving}
          waitLabel="Saving…"
          inert={saved}
          aria-hidden={saved || undefined}
          data-shown={!saved || undefined}
          className={cx("save-bar-fade h-10 shrink-0 rounded-sm bg-paper px-5 text-small font-semibold text-ink", FOCUS)}
        >
          Save changes
        </Button>
      </div>
    </div>
  );
}
