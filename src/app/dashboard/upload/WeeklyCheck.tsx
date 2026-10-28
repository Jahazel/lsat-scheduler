"use client";

import { useReducer, useState, useTransition } from "react";
import { PauseGlyph } from "@/components/ScanningOffNote";
import SignInExpired from "@/components/SignInExpired";
import {
  ConfirmBar, ListCaption, ReviewLine, ReviewStatements, ScreenshotCard, SnapshotReviewFields,
  boxId, statementId, tierId, useFocusAfterRender,
} from "@/components/SnapshotReviewFields";
import { DrillList } from "@/components/WeekPreview";
import { FOCUS } from "@/components/ui/classes";
import { accuracyError, isTyped, reviewedRows, SECTIONS, snapshotApproval, type Statement } from "@/lib/analyticsReview";
import { mostMissedType } from "@/lib/engine";
import { mockRules } from "@/lib/mockData";
import type { HiddenResult, PracticeTestResult } from "@/lib/practiceTestResult";
import { confirmLock, reviewDraftReducer, startDraft } from "@/lib/reviewDraft";
import { DAY_LABEL } from "@/lib/studentProfile";
import type { LRStemType } from "@/lib/types";
import type { PracticeTestApprovalInput } from "@/lib/weeklyUpload";
import {
  plannedWeekAnalytics, previewPlannedWeek, MAX_SCORE, MIN_SCORE, type WeeklyUploadBasis,
} from "@/lib/weeklyUploadPreview";
import type { confirmWeeklyUpload, WeeklyUploadConfirmResult } from "./actions";
import type { WeeklyUploadRead } from "./WeeklyUpload";
import { checkPreviewDrills, formatSectionScore, parseScore, planText } from "./weeklyUploadText";

const SCORE_ID = "current-score";
const SCORE_MESSAGE = `Enter a score from ${MIN_SCORE} to ${MAX_SCORE}.`;
const VALUE_BOX = "flex h-[30px] w-16 shrink-0 items-center justify-end rounded-sm border px-2 font-mono text-mono text-ink";
const NOTE = "min-w-0 text-right text-caption text-smoke sm:w-[150px] sm:shrink-0";
const LABEL = "grow whitespace-nowrap text-small text-ink";

export type CheckSource = "7sage_screenshot" | "admin_sample";

type PracticeTestPart = "read" | "skipped" | "none";

function statementsFor(source: CheckSource, typed: boolean, part: PracticeTestPart, lastWeek: string): { statement: Statement; text: string }[] {
  const latest = (withTest: string, alone: string) =>
    part === "read" ? withTest : part === "skipped" ? `${alone} I'm skipping ${lastWeek}'s practice test.` : alone;
  if (typed) {
    return [
      { statement: "extractedValuesMatch", text: "I copied these values from my 7Sage Analytics page." },
      { statement: "isLatestAnalytics", text: latest(`These are my latest analytics and ${lastWeek}'s practice test.`, "These are my latest 7Sage analytics.") },
    ];
  }
  if (source === "admin_sample") {
    return [
      { statement: "extractedValuesMatch", text: "I reviewed and approved these sample values." },
      { statement: "isLatestAnalytics", text: latest(`Use this sample as my latest analytics and ${lastWeek}'s practice test.`, "Use this sample as my latest analytics.") },
    ];
  }
  return [
    { statement: "extractedValuesMatch", text: "I reviewed these values and they match my screenshots." },
    { statement: "isLatestAnalytics", text: latest(`These are my latest analytics and ${lastWeek}'s practice test.`, "These screenshots show my latest 7Sage analytics.") },
  ];
}

function hiddenNote({ section, question, result, settledBy }: HiddenResult, score: number) {
  const hid = `The cursor hid Section ${section} Q${question}.`;
  if (settledBy === "student") return `${hid} You said ${result === "missed" ? "you missed it" : "it was right"}.`;
  return `${hid} Its score of ${formatSectionScore(score)} says Q${question} was ${result === "missed" ? "missed" : "right"}.`;
}

function PracticeTestBlock({ result, goesFirst }: { result: PracticeTestResult; goesFirst: LRStemType | undefined }) {
  const scoreOf = (section: number) => result.sections.find((entry) => entry.section === section)?.score ?? 0;
  return (
    <section aria-label={`Practice test ${result.prepTest}`} className="flex flex-col">
      <h2 className="px-3 pt-2 pb-3 text-body font-semibold text-ink">Practice test {result.prepTest}</h2>
      <ListCaption>Sections · each missed count must match its 7Sage score</ListCaption>
      {result.sections.map(({ section, kind, score, missed }) => (
        <ReviewLine key={section}>
          <span className={LABEL}>Section {section} · {kind}</span>
          <span className={NOTE}>{kind === "RC" ? "Does not change your plan" : `${missed} missed · matches`}</span>
          <span aria-label={`Section ${section} score`} className={`${VALUE_BOX} border-dashed border-accent bg-accent/faint`}>{formatSectionScore(score)}</span>
          <span aria-hidden className="size-7 shrink-0" />
        </ReviewLine>
      ))}
      {result.hiddenResults.map((hidden) => (
        <p key={`${hidden.section}-${hidden.question}`} className="border-b border-vellum-line px-3 py-1.5 text-caption text-smoke">
          {hiddenNote(hidden, scoreOf(hidden.section))}
        </p>
      ))}
      <ReviewLine className="pr-3">
        {goesFirst ? (
          <>
            <span className="grow text-small text-ink">{goesFirst}</span>
            <span className="shrink-0 text-right text-caption font-medium text-accent">
              {result.missedStemTypeCounts[goesFirst]} missed · goes first
            </span>
          </>
        ) : (
          <span className="text-small text-smoke">You missed no Logical Reasoning question. No question type goes first.</span>
        )}
      </ReviewLine>
    </section>
  );
}

function NoPracticeTestBlock({ text }: { text: ReturnType<typeof planText> }) {
  return (
    <section aria-label="Practice test" className="flex flex-col">
      <h2 className="px-3 pt-2 pb-3 text-body font-semibold text-ink">Practice test</h2>
      <div className="flex flex-col gap-1 border-y border-vellum-line px-3 py-3">
        <p className="text-small font-medium text-ink">No practice test on {text.lastWeek}&apos;s plan</p>
        <p className="text-small text-smoke">{text.Week}&apos;s order comes from your analytics only. No question type goes first from a practice test.</p>
      </div>
    </section>
  );
}

function SkippedPracticeTestBlock({ text }: { text: ReturnType<typeof planText> }) {
  return (
    <section aria-label="Practice test" className="flex flex-col">
      <h2 className="px-3 pt-2 pb-3 text-body font-semibold text-ink">Practice test</h2>
      <div className="flex gap-3 border-y border-vellum-line px-3 py-3">
        <PauseGlyph className="mt-px" />
        <p className="text-small text-smoke">
          Skipped {text.lastWeek} because scanning is off. {text.Week}&apos;s schedule won&apos;t put a missed question type first.
        </p>
      </div>
    </section>
  );
}

export default function WeeklyCheck({ basis, read, source, onBack, onConfirm, onSent }: {
  basis: WeeklyUploadBasis;
  read: WeeklyUploadRead;
  source: CheckSource;
  onBack: () => void;
  onConfirm: typeof confirmWeeklyUpload;
  onSent?: () => void;
}) {
  const [draft, dispatch] = useReducer(reviewDraftReducer, read.analytics, startDraft);
  const [scoreText, setScoreText] = useState(String(read.currentScore));
  const [reply, setReply] = useState<WeeklyUploadConfirmResult | null>(null);
  const [saving, startSaving] = useTransition();
  const requestFocus = useFocusAfterRender();
  const { review } = draft;
  const practiceTest = read.practiceTest;
  const text = planText(basis);
  const typed = isTyped(read.analytics);
  const part: PracticeTestPart = practiceTest ? "read" : basis.hadPracticeTest ? "skipped" : "none";
  const statements = statementsFor(source, typed, part, text.lastWeek);

  const score = parseScore(scoreText);
  const lock = confirmLock(review);
  const reason = lock && lock.fix.at !== "statements" ? lock.reason
    : score === null ? "Enter a score from 120 to 180 to confirm."
      : lock?.reason ?? null;

  const trend = plannedWeekAnalytics(basis, reviewedRows(review).filter((row) => !accuracyError(row)));
  const counts = practiceTest?.result.missedStemTypeCounts;
  const goesFirst = mostMissedType(counts, trend, mockRules);
  const drills = score === null ? null : checkPreviewDrills(previewPlannedWeek(basis, trend, score, counts), goesFirst, trend);

  function confirm() {
    const approval = snapshotApproval(review);
    if (reason || score === null || !approval) {
      dispatch({ type: "confirmBlocked" });
      if (lock && lock.fix.at === "box") requestFocus(boxId(lock.fix.type));
      else if (lock && lock.fix.at === "tier") requestFocus(tierId(lock.fix.type));
      else if (lock && lock.fix.at === "add-type") requestFocus("add-type-link");
      else if (score === null) requestFocus(SCORE_ID);
      else requestFocus(statementId(statements.findIndex(({ statement }) => !review.confirmation[statement])));
      return;
    }
    const practiceTestApproval: PracticeTestApprovalInput | null = practiceTest && {
      readings: practiceTest.readings,
      picks: practiceTest.picks,
      extraction: { source, extractedAt: practiceTest.extractedAt },
      confirmation: { extractedValuesMatch: true, isThisWeeksPracticeTest: true, confirmedAt: approval.confirmation.confirmedAt },
    };
    setReply(null);
    startSaving(async () => {
      onSent?.();
      setReply(await onConfirm({
        weekOf: basis.weekOf,
        currentScore: score,
        analytics: { rows: reviewedRows(review), ...approval },
        practiceTest: practiceTestApproval,
      }));
    });
  }

  const note = saving
    ? `Saving and building ${text.week}. This takes a few seconds.`
    : reply && "error" in reply
      ? <span className="text-danger-ink">{reply.error}</span>
      : reason ?? (typed && "Your weekly schedule uses these values like a scan.");

  return (
    <div className="bg-paper lg:grid lg:min-h-[calc(100vh-var(--spacing-18))] lg:grid-cols-[520px_minmax(0,1fr)] xl:grid-cols-[680px_minmax(0,1fr)]">
      <div className="flex justify-center px-5 py-8 lg:px-10 lg:py-16">
        <div className="flex w-full flex-col gap-8 lg:max-w-[440px]">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-label uppercase text-smoke">{text.title} · {typed ? "Check your values" : "Check"}</p>
            <h1 className="text-h3 font-semibold text-ink">{typed ? "Check your values" : "Check what we read"}</h1>
            <p className="text-body text-smoke">
              {!typed
                ? "Compare each value with your screenshots. Nothing counts until you confirm."
                : practiceTest
                  ? `These are the values you typed and what we read from practice test ${practiceTest.result.prepTest}. Fix any value here. Nothing counts until you confirm.`
                  : "These are the values you typed. Fix any value here. Nothing counts until you confirm."}
            </p>
          </div>
          <div className="flex flex-col gap-5">
            <SnapshotReviewFields draft={draft} lrRead={read.lrRead} files={read.files} dispatch={dispatch} />
            {practiceTest ? <PracticeTestBlock result={practiceTest.result} goesFirst={goesFirst} />
              : part === "skipped" ? <SkippedPracticeTestBlock text={text} /> : <NoPracticeTestBlock text={text} />}
            <section aria-label="Current score" className="flex flex-col">
              <h2 className="px-3 pt-2 pb-3 text-body font-semibold text-ink">Current score</h2>
              <div className="flex flex-col border-y border-vellum-line">
                <div className="flex min-h-[38px] items-center gap-3 py-1 pl-3 pr-1">
                  <label htmlFor={SCORE_ID} className={LABEL}>
                    {practiceTest ? `Practice test ${practiceTest.result.prepTest}` : "Your current score"}
                  </label>
                  <span className={NOTE}>Saved to study settings</span>
                  <input
                    id={SCORE_ID}
                    inputMode="numeric"
                    autoComplete="off"
                    value={scoreText}
                    onChange={(event) => setScoreText(event.target.value)}
                    aria-invalid={score === null ? true : undefined}
                    aria-describedby={score === null ? `${SCORE_ID}-message` : undefined}
                    className={`${VALUE_BOX} bg-paper text-right ${FOCUS} ${score === null ? "border-danger" : "border-ink"}`}
                  />
                  <span aria-hidden className="size-7 shrink-0" />
                </div>
                {score === null && (
                  <p id={`${SCORE_ID}-message`} className="px-3 pb-2 text-small text-danger-ink">{SCORE_MESSAGE}</p>
                )}
              </div>
            </section>
            <ReviewStatements draft={draft} statements={statements} dispatch={dispatch} />
          </div>
          <ConfirmBar
            label={`Confirm and build ${text.week}`}
            saving={saving}
            locked={Boolean(reason)}
            note={note}
            onBack={onBack}
            onConfirm={confirm}
          />
          {reply && "signedOut" in reply && <SignInExpired />}
        </div>
      </div>
      <aside aria-label={`Your screenshots and ${text.preview}`} className="hidden flex-col gap-4 bg-vellum px-8 pb-12 pt-32 lg:flex xl:px-18">
        {SECTIONS.map((section) => {
          const file = read.files[section];
          return file ? <ScreenshotCard key={section} section={section} file={file} /> : null;
        })}
        <div className="flex flex-col gap-2.5 rounded-sm border border-vellum-line bg-paper p-4">
          {drills ? (
            <DrillList title={`${text.previewDay} ${DAY_LABEL[drills.day]} from these values`} tag="Not confirmed yet" items={drills.items} />
          ) : (
            <p className="text-small text-smoke">
              {score === null ? `Enter a score from ${MIN_SCORE} to ${MAX_SCORE} to see ${text.week}.` : `${text.Week} has no drilling day.`}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
