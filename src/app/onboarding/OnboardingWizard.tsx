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
import { FailureNotice, LastFinishedReadNotice } from "@/components/FailureNotice";
import { ScanningOffNote } from "@/components/ScanningOffNote";
import { PageCue } from "@/components/SiteMotion";
import { Button } from "@/components/ui/Button";
import { SegmentedSwitch } from "@/components/ui/SegmentedSwitch";
import { TAP_AREA, cx } from "@/components/ui/classes";
import { SECTIONS, type Statement } from "@/lib/analyticsReview";
import { callAction } from "@/lib/callAction";
import { analyticsInputs, confirmLock, type ReviewDraft } from "@/lib/reviewDraft";
import { ConfirmBar, boxId, statementId, tierId, useFocusAfterRender } from "@/components/SnapshotReviewFields";
import {
  FieldMessage, GoalTestDateSelect, OfficialAttemptRows, ScoreInput,
} from "@/components/StudyProfileFields";
import {
  activeDraft,
  blockedReason,
  bothRead,
  confirmSnapshotInput,
  goalGain,
  initialWizardState,
  profileWithAttempts,
  scoreMessages,
  previewDrills,
  saveRefusal,
  savedAnswers,
  screenshot,
  weeksToTest,
  wizardReducer,
  type AttemptsDraft,
  type SaveInput,
  type WizardAction,
  type WizardState,
} from "@/lib/onboardingWizard";
import { nextRead } from "@/lib/screenshotReadQueue";
import { SCREENSHOT_LIMITS, SCREENSHOT_NOTICE, checkScreenshotType, extractScreenshot } from "@/lib/screenshotUpload";
import type { AnalyticsSection } from "@/lib/types";
import { slideStep } from "@/lib/pageMotion";
import { isUnexpectedFailure } from "@/lib/unexpectedFailure";
import { MAX_OFFICIAL_ATTEMPTS, type upcomingTestMonths } from "@/lib/studentProfile";
import type { Accommodation } from "@/lib/studyProfileDraft";
import { TEST_TIME_LABEL } from "@/lib/studyWeek";
import type { createStudentProfile } from "./actions";
import { ReviewBars, ReviewStatementList } from "./ReviewBars";
import { RoadToTestDay } from "./RoadToTestDay";
import { PINNED_BAR, ROAD_PANEL, STEP_COLUMN, STEP_CONTENT, STEP_GRID, STEP_SLIDE } from "./shell";
import { StepCount } from "./StepCount";
import { usePinnedBarHeight } from "./usePinnedBarHeight";
import { RevealAction, WeekReveal } from "./WeekReveal";
import { ScreenshotDropArea, WhereToFindIt } from "./ScreenshotDropArea";
import { WEEK_NOTE_ID, WeekStepperTable } from "./WeekStepperTable";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const LINK_BUTTON = `font-medium text-ink underline underline-offset-[3px] disabled:cursor-not-allowed disabled:no-underline aria-disabled:no-underline ${FOCUS}`;

interface OnboardingWizardProps {
  firstName: string;
  today: string;
  goalTestDateOptions: ReturnType<typeof upcomingTestMonths>;
  scanningOff?: boolean;
  admin?: boolean;
  onSave: typeof createStudentProfile;
  extract?: typeof extractScreenshot;
}

type Dispatch = (action: WizardAction) => void;

export default function OnboardingWizard({
  firstName,
  today,
  goalTestDateOptions,
  scanningOff = false,
  admin = false,
  onSave,
  extract = extractScreenshot,
}: OnboardingWizardProps) {
  const [state, dispatch] = useReducer(wizardReducer, scanningOff, (off) => off
    ? wizardReducer(initialWizardState(), { type: "chooseInput", input: "typed", at: new Date() })
    : initialWizardState());
  const draft = activeDraft(state);
  const { screenshots } = state;
  const [saveAnswer, setSaveAnswer] = useState<Awaited<ReturnType<typeof onSave>>>();
  const stepRegion = useRef<HTMLDivElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const pinnedBar = usePinnedBarHeight();
  const saved = savedAnswers(state);

  function send(action: WizardAction) {
    const changesStep = (action.type === "continue" || action.type === "back") && wizardReducer(state, action).step !== state.step;
    if (!changesStep) return dispatch(action);
    slideStep(stepRegion.current!, action.type === "continue" ? STEP_SLIDE : -STEP_SLIDE, () => dispatch(action));
  }

  useEffect(() => {
    const next = nextRead(screenshots, SECTIONS);
    if (!next) return;
    dispatch({ type: "readStarted", id: next.id });
    void extract(next.file, next.slot).then((reply) => dispatch({ type: "readEnded", section: next.slot, id: next.id, reply, at: new Date() }));
  }, [screenshots, extract]);

  function readScreenshot(section: AnalyticsSection, file: File) {
    const rejection = checkScreenshotType(file);
    dispatch(rejection ? { type: "screenshotRejected", section, message: rejection.message } : { type: "readQueued", section, file });
  }

  async function save(input: SaveInput) {
    dispatch({ type: "saveStarted" });
    try {
      const answer = await callAction(onSave)(input);
      setSaveAnswer(answer);
      if (isUnexpectedFailure(answer)) dispatch({ type: "saveEnded" });
      else if (answer) dispatch({ type: "saveRefused", message: answer.error });
      else slideStep(column.current!, STEP_SLIDE, () => dispatch({ type: "saved", input }), { opacity: 0 });
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

  const drills = state.step === "analytics" || state.step === "review" ? previewDrills(state, today) : null;

  return (
    <div ref={area} className={STEP_GRID}>
      <PageCue page="onboarding" />
      <StepCount step={saved ? "reveal" : state.step} />
      <div ref={column} data-page-swap data-page-section className={STEP_COLUMN}>
        <div ref={stepRegion} data-onboarding-step className={STEP_CONTENT}>
          <div className="w-full max-w-[440px]">
            {saved ? <WeekReveal saved={saved} today={today} testMonths={goalTestDateOptions} /> : <>
            {state.step === "goal" && <GoalStep state={state} dispatch={send} firstName={firstName} goalTestDateOptions={goalTestDateOptions} today={today} />}
            {state.step === "week" && <WeekStep state={state} dispatch={send} />}
            {state.step === "analytics" && <AnalyticsStep state={state} scanningOff={scanningOff} dispatch={send} onFile={readScreenshot} />}
            {state.step === "review" && draft && <ReviewStep state={state} draft={draft} dispatch={send} />}
            </>}
          </div>
        </div>
        <div ref={pinnedBar} data-pinned-bar className={PINNED_BAR}>
          <div className="mx-auto max-w-[440px]">
            {saved ? <RevealAction admin={admin} area={area} /> : <>
            {(state.step === "goal" || state.step === "week") && <StepActions state={state} dispatch={send} />}
            {state.step === "analytics" && <AnalyticsActions state={state} dispatch={send} onSkip={skipForNow} />}
            {state.step === "review" && draft && <ReviewActions state={state} draft={draft} dispatch={send} onConfirm={confirmSnapshot} />}
            </>}
          </div>
        </div>
      </div>
      <aside data-page-fade aria-label="Road to test day" className={ROAD_PANEL}>
        <div data-page-swap data-page-section className="sticky top-30">
          <RoadToTestDay
            values={state.values}
            firstName={firstName}
            today={today}
            testMonths={goalTestDateOptions}
            weekSet={state.step !== "goal"}
            focusWeek={state.step === "week" && !saved}
            analyticsAdded={(state.step === "analytics" || state.step === "review") && Boolean(draft)}
            drills={saved ? "hidden" : drills}
          />
        </div>
      </aside>
      <FailureNotice answer={saveAnswer} />
      {SECTIONS.map((section) => <LastFinishedReadNotice key={section} read={screenshot(state, section)?.read} />)}
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
      <h1 ref={heading} tabIndex={-1} className="text-h3 font-semibold text-ink outline-none">
        {title}
      </h1>
      <p className="text-body text-smoke">{lede}</p>
    </div>
  );
}

const STEP_FORM = "onboarding-step-form";

function StepForm({ dispatch, children }: { dispatch: Dispatch; children: ReactNode }) {
  function submit(event: FormEvent) {
    event.preventDefault();
    dispatch({ type: "continue" });
  }
  return (
    <form id={STEP_FORM} onSubmit={submit} noValidate className="flex flex-col gap-8">
      {children}
    </form>
  );
}

function StepActions({ state, dispatch }: { state: WizardState; dispatch: Dispatch }) {
  const reason = blockedReason(state);
  const noteInStep = state.step === "week";
  const noteId = noteInStep ? WEEK_NOTE_ID : "continue-note";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        {state.step !== "goal" && (
          <Button variant="outline" onClick={() => dispatch({ type: "back" })}>
            Back
          </Button>
        )}
        <Button type="submit" form={STEP_FORM} disabled={Boolean(reason)} aria-describedby={reason ? noteId : undefined} className="flex-1">
          Continue
        </Button>
      </div>
      {reason && !noteInStep && <p id="continue-note" className="text-center text-small text-smoke">{reason}</p>}
    </div>
  );
}

const TEST_TIMES = ([1, 1.5, 2] satisfies Accommodation[]).map((multiplier) => ({ value: String(multiplier), label: TEST_TIME_LABEL[multiplier], multiplier }));

function GoalStep({
  state,
  dispatch,
  firstName,
  goalTestDateOptions,
  today,
}: {
  state: WizardState;
  dispatch: Dispatch;
  firstName: string;
  goalTestDateOptions: OnboardingWizardProps["goalTestDateOptions"];
  today: string;
}) {
  const messages = scoreMessages(state);
  const goalMessage = messages.goalScore ?? messages.goalNotAbove;
  const gain = goalGain(state.values);
  const weeks = weeksToTest(state.values.goalTestDate, today);
  const edit = (values: Partial<WizardState["values"]>) => dispatch({ type: "edit", values });

  return (
    <StepForm dispatch={dispatch}>
      <StepHeading state={state} title={`Hi ${firstName}, set your goal score`} lede="Where you are now, where you want to be, and when." />
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 items-start gap-3">
          <div className="flex flex-col gap-2">
            <ScoreInput
              label="Current PT score"
              placeholder="150"
              value={state.values.currentScore}
              messageId={messages.currentScore ? "current-score-message" : null}
              onChange={(currentScore) => edit({ currentScore })}
              onBlur={() => dispatch({ type: "leaveScoreBox", box: "currentScore" })}
            />
            {messages.currentScore && <FieldMessage id="current-score-message">{messages.currentScore}</FieldMessage>}
          </div>
          <div className="flex flex-col gap-2">
            <ScoreInput
              label="Goal score"
              placeholder="165"
              value={state.values.goalScore}
              messageId={goalMessage ? "goal-score-message" : null}
              hintId={gain !== null ? "goal-gain" : null}
              onChange={(goalScore) => edit({ goalScore })}
              onBlur={() => dispatch({ type: "leaveScoreBox", box: "goalScore" })}
            />
            {goalMessage ? (
              <FieldMessage id="goal-score-message">{goalMessage}</FieldMessage>
            ) : (
              gain !== null && <p id="goal-gain" className="text-caption font-medium text-accent">{`+${gain} from your current score`}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <GoalTestDateSelect
            label="Goal test date"
            value={state.values.goalTestDate}
            options={goalTestDateOptions}
            noticeId={weeks ? "goal-test-weeks" : null}
            onChange={(goalTestDate) => edit({ goalTestDate })}
          />
          {weeks && <p id="goal-test-weeks" className="text-caption text-smoke">{`About ${weeks} ${weeks === 1 ? "week" : "weeks"} away`}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-x-3 gap-y-0.5 sm:flex-row sm:items-baseline sm:justify-between">
            <span className="text-small font-medium text-ink">Test time</span>
            <span className="text-caption text-smoke sm:text-right">Your approved accommodation, if any.</span>
          </div>
          <SegmentedSwitch
            name="testTime"
            label="Test time"
            options={TEST_TIMES}
            value={String(state.values.accommodationMultiplier)}
            onChange={(value) => edit({ accommodationMultiplier: TEST_TIMES.find((time) => time.value === value)!.multiplier })}
          />
        </div>

        <div className="border-t border-vellum-line pt-6">
          <OfficialAttempts attempts={state.attempts} dispatch={dispatch} today={today} />
        </div>
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-x-3 gap-y-0.5 sm:flex-row sm:items-baseline sm:justify-between">
        <span id={`${id}-label`} className="text-small font-medium text-ink">
          Official LSAT attempts
        </span>
        <span id={`${id}-note`} className="text-caption text-smoke sm:text-right">
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
        <OfficialAttemptRows
          idPrefix={id}
          rows={attempts.rows}
          today={today}
          canRemove={attempts.rows.length > 1}
          canAdd={attempts.rows.length < MAX_OFFICIAL_ATTEMPTS}
          addLabel="Add another attempt"
          onEdit={(rowId, values) => dispatch({ type: "editAttempt", id: rowId, values })}
          onLeave={(rowId, part) => dispatch({ type: "leaveAttempt", id: rowId, part })}
          onRemove={(rowId) => dispatch({ type: "removeAttempt", id: rowId })}
          onAdd={() => dispatch({ type: "addAttempt" })}
        />
      )}
    </div>
  );
}

function WeekStep({ state, dispatch }: { state: WizardState; dispatch: Dispatch }) {
  const { values } = state;

  return (
    <StepForm dispatch={dispatch}>
      <StepHeading state={state} title="Pick your study days" lede="How much time you can study each day. We choose your rest day." />
      <WeekStepperTable
        values={values}
        allDaysMinutes={values.allDaysMinutes}
        accommodation={values.accommodationMultiplier}
        continueBlockedReason={blockedReason(state)}
        onAllDaysChange={(minutes) => dispatch({ type: "edit", values: { allDaysMinutes: minutes } })}
        onApplyAllDays={() => dispatch({ type: "applyAllDays" })}
        onDayChange={(day, minutes) =>
          dispatch({ type: "edit", values: { dailyCapacityMinutes: { ...values.dailyCapacityMinutes, [day]: minutes } } })
        }
        onPracticeTestDayChange={(day) => dispatch({ type: "edit", values: { preferredPracticeTestDay: day } })}
      />
    </StepForm>
  );
}

function AnalyticsStep({
  state,
  scanningOff,
  dispatch,
  onFile,
}: {
  state: WizardState;
  scanningOff: boolean;
  dispatch: Dispatch;
  onFile: (section: AnalyticsSection, file: File) => void;
}) {
  const { typedDraft } = state;
  const typed = state.analyticsInput === "typed";

  return (
    <div className="flex flex-col gap-8">
      <StepHeading
        state={state}
        title="Add your 7Sage analytics"
        lede={typed ? "Type the values from your 7Sage Analytics page. They tell us what to drill first." : "Two screenshots tell us what to drill first."}
      />
      {scanningOff && <ScanningOffNote>Type them below. Your first weekly schedule works the same way as with screenshots.</ScanningOffNote>}
      <SegmentedSwitch
        name="analyticsInput"
        label="How to add your analytics"
        options={analyticsInputs(scanningOff)}
        value={state.analyticsInput}
        onChange={(input) => dispatch({ type: "chooseInput", input, at: new Date() })}
      />
      {typed && typedDraft ? (
        <div className="flex flex-col gap-8">
          <ReviewBars draft={typedDraft} lrRead={[]} files={{}} dispatch={dispatch} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {SECTIONS.map((section) => (
            <ScreenshotDropArea
              key={section}
              section={section}
              screenshot={screenshot(state, section)}
              rejection={state.rejections[section]}
              onFile={(file) => onFile(section, file)}
              onTypeInstead={() => dispatch({ type: "chooseInput", input: "typed", at: new Date() })}
            />
          ))}
          <p className="text-small text-smoke">
            {bothRead(state) ? "Next, you check each value. Nothing counts until you confirm." : `${SCREENSHOT_LIMITS} each.`}
          </p>
          <WhereToFindIt />
          <p className="text-caption text-smoke">{SCREENSHOT_NOTICE}</p>
        </div>
      )}
    </div>
  );
}

function AnalyticsActions({ state, dispatch, onSkip }: { state: WizardState; dispatch: Dispatch; onSkip: () => void }) {
  const saving = state.save === "saving";
  const typed = state.analyticsInput === "typed";
  const reason = blockedReason(state);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <Button variant="outline" disabled={saving} onClick={() => dispatch({ type: "back" })}>
          Back
        </Button>
        <Button
          disabled={saving || Boolean(reason)}
          aria-describedby={typed && reason ? "continue-note" : undefined}
          onClick={() => dispatch({ type: "continue" })}
          className="flex-1"
        >
          Continue
        </Button>
      </div>
      {typed && reason && <p id="continue-note" className="text-center text-small text-smoke">{reason}</p>}
      <p className="text-center text-small text-smoke">
        <Button variant="bare" waiting={saving} waitLabel="Saving…" holdsWidth={false} onClick={onSkip} className={cx(LINK_BUTTON, TAP_AREA)}>
          Skip for now
        </Button>
        {typed ? " · Your schedule starts after you add your analytics." : " · Your schedule starts after you add both."}
      </p>
      <p role="status" className="text-center text-small text-smoke">
        {saving
          ? "Saving your plan. This takes a few seconds."
          : state.save === "failed" ? "We couldn't save your plan. Press Skip for now again." : saveRefusal(state)}
      </p>
    </div>
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

function reviewStatements(state: WizardState) {
  return state.analyticsInput === "typed" ? TYPED_STATEMENTS : STATEMENTS;
}

function ReviewStep({ state, draft, dispatch }: { state: WizardState; draft: ReviewDraft; dispatch: Dispatch }) {
  const typed = state.analyticsInput === "typed";
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
          lede="Compare each value with your screenshots."
        />
      )}
      <ReviewBars
        draft={draft}
        lrRead={readRows(state, "LR")}
        files={{ LR: screenshotFile(state, "LR"), RC: screenshotFile(state, "RC") }}
        dispatch={dispatch}
      />
      <ReviewStatementList draft={draft} statements={reviewStatements(state)} dispatch={dispatch} />
    </div>
  );
}

function ReviewActions({
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
  const statements = reviewStatements(state);

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
      ? "We couldn't save your plan. Press Confirm snapshot again."
      : saveRefusal(state) ?? reason ?? (typed && "Your first weekly schedule uses these values like a scan.");

  return (
    <ConfirmBar
      label="Confirm snapshot"
      saving={saving}
      locked={Boolean(reason)}
      note={note}
      onBack={() => dispatch({ type: "back" })}
      onConfirm={confirm}
    />
  );
}

function screenshotFile(state: WizardState, section: AnalyticsSection) {
  return screenshot(state, section)?.file;
}

function readRows(state: WizardState, section: AnalyticsSection) {
  const read = screenshot(state, section)?.read;
  return read?.status === "read" ? read.value.rows : [];
}
