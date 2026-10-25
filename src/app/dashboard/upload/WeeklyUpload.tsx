"use client";

import { useEffect, useId, useReducer, useRef, useState, type ReactNode } from "react";
import SignInExpired from "@/components/SignInExpired";
import { SnapshotReviewFields } from "@/components/SnapshotReviewFields";
import { DrillList, WeekTiles } from "@/components/WeekPreview";
import { Button } from "@/components/ui/Button";
import { DropZone } from "@/components/ui/DropZone";
import { FileRow, ProblemNote, WaitNote } from "@/components/ui/FileRow";
import { SegmentedSwitch } from "@/components/ui/SegmentedSwitch";
import { CheckGlyph, ClockGlyph, InfoGlyph, ReadingGlyph } from "@/components/ui/StatusIcon";
import { TextInput } from "@/components/ui/TextInput";
import { FOCUS, MOTION, cx } from "@/components/ui/classes";
import { accuracyError, readSection as addAnalyticsSection, reviewedRows, SECTION_NAME, SECTIONS, type SnapshotReview } from "@/lib/analyticsReview";
import { ANALYTICS_INPUTS, reviewDraftReducer, startTypedDraft, typedEntryProblem, type AnalyticsInput } from "@/lib/reviewDraft";
import {
  reviewPracticeTest, type HiddenPick, type PracticeTestProblem, type PracticeTestResult, type SectionReading, type SectionReview,
} from "@/lib/practiceTestResult";
import {
  CANNOT_READ, MAX_SCREENSHOT_MB, SCREENSHOT_MEDIA_TYPES, TOOK_TOO_LONG, checkScreenshotType, extractPracticeTestScreenshot,
  readAnalyticsScreenshot, stopsLaterScans, type ScanRefused,
} from "@/lib/screenshotUpload";
import { DAY_LABEL } from "@/lib/studentProfile";
import { mostMissedType } from "@/lib/engine";
import { mockRules } from "@/lib/mockData";
import type { AnalyticsExtractedRow, AnalyticsSection, AnalyticsSnapshot, LRStemType, WeeklySchedule } from "@/lib/types";
import {
  firstDrills, formatSectionScore, missLabel, missedCountSentence, missedTypesInOrder, parseScore, planText, plannedWeekAnalytics, previewPlannedWeek,
  problemMessage, sectionTitle, weekSummary, weekTiles, MAX_SCORE, MIN_SCORE, type WeeklyUploadBasis,
} from "@/lib/weeklyUpload";

const ACCEPT = SCREENSHOT_MEDIA_TYPES.join(",");
const SECTION_COUNT = 4;
const TOP_TYPES = 3;
const LINK_BUTTON = cx("shrink-0 text-small font-medium text-ink underline underline-offset-3", MOTION, FOCUS);
const SCORE_ERROR = `Enter a score from ${MIN_SCORE} to ${MAX_SCORE}.`;
const SCORE_HINT = `Enter a score from ${MIN_SCORE} to ${MAX_SCORE} to continue.`;
const LIMITS = `PNG, JPG, or WEBP, ${MAX_SCREENSHOT_MB} MB or less each. Tall screenshots are fine.`;

type Read<T> =
  | { status: "added" }
  | { status: "waiting" }
  | { status: "reading" }
  | { status: "read"; value: T }
  | { status: "problem" | "refused"; message: string; tryAgain: boolean }
  | { status: "signed-out" };

const PENDING: Read<unknown>["status"][] = ["added", "waiting", "reading"];

function refusedRead(reply: ScanRefused): Read<never> {
  return { status: "refused", message: reply.message, tryAgain: !stopsLaterScans(reply) };
}

interface Upload<T> { id: number; file: File; read: Read<T> }
type AnalyticsUpload = Upload<{ rows: AnalyticsExtractedRow[]; at: string }>;
type SectionUpload = Upload<SectionReading>;
type RowProblem = Exclude<PracticeTestProblem, { problem: "section-missing" | "hidden-pick" }>;
interface UploadPick { upload: number; missed: number[] }

export interface CheckedPracticeTest {
  result: PracticeTestResult;
  readings: SectionReview[];
  picks: HiddenPick[];
  extractedAt: string;
}

export interface WeeklyUploadRead {
  currentScore: number;
  analytics: SnapshotReview;
  lrRead: AnalyticsExtractedRow[];
  files: Partial<Record<AnalyticsSection, File>>;
  practiceTest: CheckedPracticeTest | null;
}

interface WeeklyUploadProps {
  basis: WeeklyUploadBasis;
  initialScore: number;
  onCheckValues?: (read: WeeklyUploadRead) => void;
}

export default function WeeklyUpload({ basis, initialScore, onCheckValues }: WeeklyUploadProps) {
  const needsSections = basis.hadPracticeTest;
  const text = planText(basis);
  const [scoreText, setScoreText] = useState(String(initialScore));
  const [analytics, setAnalytics] = useState<Partial<Record<AnalyticsSection, AnalyticsUpload>>>({});
  const [sections, setSections] = useState<SectionUpload[]>([]);
  const [rejections, setRejections] = useState<Record<string, string>>({});
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const started = startedAt !== null;
  const [picks, setPicks] = useState<UploadPick[]>([]);
  const [input, setInput] = useState<AnalyticsInput>("screenshots");
  const [typedDraft, dispatchTyped] = useReducer(reviewDraftReducer, null, () => startTypedDraft(new Date()));
  const typed = input === "typed";
  const typedProblem = typed ? typedEntryProblem(typedDraft.review) : null;
  const nextId = useRef(0);

  const reject = (key: string, message: string | null) =>
    setRejections((current) => {
      const next = { ...current };
      if (message) next[key] = message;
      else delete next[key];
      return next;
    });

  const readInFlight = useRef(false);
  const [readsEnded, setReadsEnded] = useState(0);

  useEffect(() => {
    if (readInFlight.current) return;
    const section = SECTIONS.find((key) => analytics[key]?.read.status === "waiting");
    const sectionUpload = sections.find(({ read }) => read.status === "waiting");

    function stopWaiting(reply: ScanRefused) {
      if (!stopsLaterScans(reply)) return;
      const stopped = refusedRead(reply);
      setAnalytics((current) => {
        const next = { ...current };
        for (const key of SECTIONS) {
          const upload = current[key];
          if (upload?.read.status === "waiting") next[key] = { ...upload, read: stopped };
        }
        return next;
      });
      setSections((current) => current.map((upload) => (upload.read.status === "waiting" ? { ...upload, read: stopped } : upload)));
    }

    async function readAnalytics(section: AnalyticsSection, upload: AnalyticsUpload) {
      const set = (read: AnalyticsUpload["read"]) =>
        setAnalytics((current) => (current[section]?.id === upload.id ? { ...current, [section]: { ...upload, read } } : current));
      set({ status: "reading" });
      const result = await readAnalyticsScreenshot(upload.file, section);
      switch (result.kind) {
        case "rows": return set({ status: "read", value: { rows: result.rows, at: new Date().toISOString() } });
        case "problem": return set({ status: "problem", message: result.message, tryAgain: result.tryAgain });
        case "refused":
          set(refusedRead(result));
          return stopWaiting(result);
        case "signed-out": return set({ status: "signed-out" });
      }
    }

    async function readSectionFile(upload: SectionUpload) {
      const set = (read: SectionUpload["read"]) =>
        setSections((current) => current.map((entry) => (entry.id === upload.id ? { ...entry, read } : entry)));
      set({ status: "reading" });
      const reply = await extractPracticeTestScreenshot(upload.file);
      switch (reply.kind) {
        case "reading": return set({ status: "read", value: reply.reading });
        case "rejected": return set({ status: "problem", message: reply.message, tryAgain: false });
        case "refused":
          set(refusedRead(reply));
          return stopWaiting(reply);
        case "signed-out": return set({ status: "signed-out" });
        case "timed-out": return set({ status: "problem", message: TOOK_TOO_LONG, tryAgain: true });
        case "cannot-read":
        case "connection-lost": return set({ status: "problem", message: CANNOT_READ, tryAgain: true });
      }
    }

    const analyticsUpload = section && analytics[section];
    const next = section && analyticsUpload ? readAnalytics(section, analyticsUpload) : sectionUpload && readSectionFile(sectionUpload);
    if (!next) return;
    readInFlight.current = true;
    void next.finally(() => {
      readInFlight.current = false;
      setReadsEnded((count) => count + 1);
    });
  }, [analytics, sections, readsEnded]);

  const queued: Read<never> = started ? { status: "waiting" } : { status: "added" };

  function addAnalytics(section: AnalyticsSection, file: File) {
    const rejection = checkScreenshotType(file);
    reject(section, rejection?.message ?? null);
    if (rejection) return;
    const upload: AnalyticsUpload = { id: nextId.current++, file, read: queued };
    setAnalytics((current) => ({ ...current, [section]: upload }));
  }

  function addSectionFiles(files: File[], key: string, room: number) {
    const accepted = files.filter((file) => !checkScreenshotType(file));
    const firstRejection = files.map(checkScreenshotType).find(Boolean)?.message;
    const uploads = accepted.slice(0, room).map((file): SectionUpload => ({ id: nextId.current++, file, read: queued }));
    reject(key, firstRejection ?? (accepted.length > room ? "Add one screenshot per section, 4 in all. Replace a section to change it." : null));
    setSections((current) => [...current, ...uploads]);
  }

  function replaceSection(id: number, file: File) {
    const rejection = checkScreenshotType(file);
    reject(`file-${id}`, rejection?.message ?? null);
    if (rejection) return;
    const upload: SectionUpload = { id: nextId.current++, file, read: queued };
    setSections((current) => current.map((entry) => (entry.id === id ? upload : entry)));
  }

  function setAnalyticsReads(from: Read<unknown>["status"][], read: Read<never>) {
    setAnalytics((current) => {
      const next = { ...current };
      for (const section of SECTIONS) {
        const upload = current[section];
        if (upload && from.includes(upload.read.status)) next[section] = { ...upload, read };
      }
      return next;
    });
  }

  function startReading() {
    setStartedAt(new Date().toISOString());
    if (!typed) setAnalyticsReads(["added"], { status: "waiting" });
    setSections((current) => current.map((upload) => ({ ...upload, read: { status: "waiting" } })));
  }

  function chooseInput(next: AnalyticsInput) {
    setInput(next);
    if (next === "typed") setAnalyticsReads(["waiting"], { status: "added" });
  }

  function tryAgain(section: AnalyticsSection | null, id: number) {
    const waiting = <T extends { id: number }>(upload: T) => (upload.id === id ? { ...upload, read: { status: "waiting" as const } } : upload);
    if (section) setAnalytics((current) => ({ ...current, [section]: current[section] && waiting(current[section]) }));
    else setSections((current) => current.map(waiting));
  }

  const score = parseScore(scoreText);
  const tileRejection = sections.map((upload) => rejections[`file-${upload.id}`]).find(Boolean);
  const scoreError = score === null ? SCORE_ERROR : undefined;

  const readSections = sections.flatMap((upload) => (upload.read.status === "read" ? [{ upload, reading: upload.read.value }] : []));
  const sectionsSettled = started && sections.every(({ read }) => !PENDING.includes(read.status));
  const anyUnreadable = readSections.length < sections.length;
  const readings = readSections.map(({ reading }) => reading);
  const hiddenPicks = readSections.flatMap(({ upload, reading }): HiddenPick[] => {
    const pick = picks.find((entry) => entry.upload === upload.id);
    return pick && reading.page === "section_review" ? [{ section: reading.section, missed: pick.missed }] : [];
  });
  const review = needsSections && sectionsSettled ? reviewPracticeTest(readings, hiddenPicks) : null;
  const unpicked = needsSections && sectionsSettled ? reviewPracticeTest(readings) : null;
  const problems = review && !review.ok ? review.problems : [];
  const rowProblem = new Map(problems.flatMap((problem) =>
    problem.problem === "section-missing" || problem.problem === "hidden-pick" ? [] : [[readSections[problem.file].upload.id, problem] as const]));
  const missing = problems.flatMap((problem) => (problem.problem === "section-missing" ? [problem.section] : []));
  const pickQuestions = unpicked && !unpicked.ok
    ? unpicked.problems.flatMap((problem) => (problem.problem === "hidden-pick" ? [{ ...problem, upload: readSections[problem.file].upload }] : []))
    : [];
  const practiceTest = review?.ok ? review.result : null;
  const prepTest = practiceTest?.prepTest
    ?? readings.find((reading): reading is Extract<SectionReading, { page: "section_review" }> => reading.page === "section_review")?.prepTest;

  const analyticsRead = SECTIONS.every((section) => analytics[section]?.read.status === "read");
  const analyticsReady = typed ? typedProblem === null : started && analyticsRead;
  const allAdded = (typed || SECTIONS.every((section) => analytics[section])) && (!needsSections || sections.length >= SECTION_COUNT);
  const shownAnalytics = typed ? {} : analytics;
  const uploads = [...SECTIONS.flatMap((section) => shownAnalytics[section] ?? []), ...sections];
  const unreadAnalytics = started && !typed && SECTIONS.some((section) => analytics[section]?.read.status === "added");
  const queuedOrDone = uploads.filter(({ read }) => read.status !== "added");
  const anyReading = started && queuedOrDone.some(({ read }) => read.status === "waiting" || read.status === "reading");
  const offerRead = unreadAnalytics && !anyReading;
  const readCount = (group: { read: Read<unknown> }[]) => `${group.filter(({ read }) => read.status === "read").length} of ${group.length} read`;
  const settledCount = queuedOrDone.filter(({ read }) => !PENDING.includes(read.status)).length;
  const found = analyticsReady && (!needsSections || (started && practiceTest !== null && !anyUnreadable));
  const replacementRejected = SECTIONS.some((section) => !typed && rejections[section])
    || sections.some((upload) => rejections[`file-${upload.id}`]);
  const summarized = found && !replacementRejected;
  const ready = found && score !== null;

  const analyticsRows = typed
    ? reviewedRows(typedDraft.review).filter((row) => !accuracyError(row))
    : SECTIONS.flatMap((section) => {
      const read = analytics[section]?.read;
      return read?.status === "read" ? read.value.rows : [];
    });
  const trend = found ? plannedWeekAnalytics(basis, analyticsRows) : null;
  const goesFirst = trend ? mostMissedType(practiceTest?.missedStemTypeCounts, trend, mockRules) : undefined;
  const schedule = trend && score !== null ? previewPlannedWeek(basis, trend, score, practiceTest?.missedStemTypeCounts) : null;

  function checkValues() {
    if (!ready || score === null) return;
    const checked = {
      currentScore: score,
      practiceTest: practiceTest && startedAt !== null ? {
        result: practiceTest,
        readings: readings.flatMap((reading) => (reading.page === "section_review" ? [reading] : [])),
        picks: hiddenPicks,
        extractedAt: startedAt,
      } : null,
    };
    if (typed) {
      onCheckValues?.({ ...checked, analytics: typedDraft.review, lrRead: [], files: {} });
      return;
    }
    const lr = analytics.LR?.read;
    const rc = analytics.RC?.read;
    if (lr?.status !== "read" || rc?.status !== "read") return;
    const withLr = addAnalyticsSection(null, "LR", lr.value.rows, { source: "7sage_screenshot", extractedAt: lr.value.at });
    onCheckValues?.({
      ...checked,
      analytics: addAnalyticsSection(withLr, "RC", rc.value.rows, { source: "7sage_screenshot", extractedAt: rc.value.at }),
      lrRead: lr.value.rows,
      files: { LR: analytics.LR?.file, RC: analytics.RC?.file },
    });
  }

  const start = text.startSentence;
  const lead = !started
    ? needsSections
      ? `${start} Add ${text.lastWeek}'s screenshots, and we build your weekly schedule from them.`
      : typed
        ? `${start} ${text.LastWeek} had no practice test, so we need only your analytics.`
        : `${start} ${text.LastWeek} had no practice test, so we need only your 2 analytics screenshots.`
    : found
      ? `${start} We read ${typed ? "all 4 sections" : needsSections ? "all 6 screenshots" : "both screenshots"}. Check them, then build your weekly schedule.`
      : anyReading
        ? `${start} We read your screenshots one at a time.${unreadAnalytics ? "" : " You don't need to click anything."}`
        : unreadAnalytics
          ? `${start} Read your analytics screenshots, then check them.`
          : typedProblem
            ? `${start} Fix the ${needsSections && sectionsSettled && (anyUnreadable || problems.some(({ problem }) => problem !== "hidden-pick")) ? "values and screenshots" : "values"} marked below, then check them.`
            : `${start} Fix the screenshots marked below, then check them.`;

  const hint = typed && !started
    ? needsSections && !allAdded && typedDraft.review.rows.every(({ row }) => row.category === "passage")
      ? "Add at least one Logical Reasoning type and all 4 section screenshots. Next, you check every value before it counts."
      : typedProblem ?? (!allAdded
        ? "Add all 4 section screenshots to continue. You check every value before it counts."
        : score === null ? SCORE_HINT : "Next, you check every value before it counts.")
    : !started
    ? !allAdded
      ? needsSections
        ? "Add all 6 screenshots, or type your analytics and add the 4 sections. You check every value before it counts."
        : "Add both screenshots, or type your analytics. You check every value before it counts."
      : score === null ? SCORE_HINT : "You check every value before it counts."
    : ready
      ? "Next, you check what we read. Nothing changes until you confirm."
      : offerRead
        ? "Read your analytics screenshots to continue."
        : typedProblem ?? (anyReading
          ? "Each screenshot takes up to 30 seconds."
          : found
            ? SCORE_HINT
            : pickQuestions.length > 0 && problems.every((problem) => problem.problem === "hidden-pick")
              ? "Choose the question you missed to continue."
              : "Fix the screenshots marked above to continue.");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] bg-paper lg:min-h-[calc(100vh-var(--spacing-18))] lg:grid-cols-[minmax(0,680px)_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
      <div className="flex flex-col gap-10 px-5 pt-8 lg:px-30 lg:pt-18">
        <header className="flex flex-col gap-2">
          <h1 className="text-h3 font-semibold text-ink">{text.title}</h1>
          <p className="text-body text-smoke">{lead}</p>
        </header>

        <TextInput
          inline
          label="Current score"
          inputMode="numeric"
          value={scoreText}
          onChange={(event) => setScoreText(event.target.value)}
          error={scoreError}
          helper={prepTest !== undefined
            ? `Your score on practice test ${prepTest}? Type it here. We save it to your study settings.`
            : "From your study settings. Type a new score if your latest practice test changed it. We save it there too."}
        />

        {summarized && (needsSections || !typed) && (
          <ReadSummary analytics={shownAnalytics} sections={sections} onAnalytics={addAnalytics} onReplace={replaceSection} />
        )}

        <UploadGroup
          title="7Sage analytics"
          count={typed ? "Typed by you" : started ? readCount(SECTIONS.flatMap((section) => analytics[section] ?? [])) : "Screenshots or typed"}
          className={summarized && !typed ? "max-md:hidden" : undefined}
        >
          <SegmentedSwitch name="analyticsInput" label="How to add your analytics" options={ANALYTICS_INPUTS} value={input} onChange={chooseInput} />
          {typed ? (
            <div className="flex flex-col gap-5">
              <SnapshotReviewFields idPrefix="typed-" draft={typedDraft} lrRead={[]} files={{}} dispatch={dispatchTyped} />
            </div>
          ) : (
            <>
              {SECTIONS.map((section) => (
                <AnalyticsRow
                  key={section}
                  section={section}
                  upload={analytics[section]}
                  rejection={rejections[section]}
                  onFile={(file) => addAnalytics(section, file)}
                  onTryAgain={(id) => tryAgain(section, id)}
                />
              ))}
              {!needsSections && !analytics.LR && !analytics.RC && <p className="text-small text-smoke">{LIMITS}</p>}
            </>
          )}
        </UploadGroup>

        {needsSections ? (
          <UploadGroup
            title="Practice test review"
            count={started
              ? readCount(sections)
              : <><span className="md:hidden">One per section</span><span className="hidden md:inline">4 screenshots, one per section</span></>}
            className={summarized ? "max-md:hidden" : undefined}
          >
            {!started ? (
              <>
                {sections.length < SECTION_COUNT && (
                  <DropZone
                    multiple
                    label="All 4 section screenshots"
                    accept={ACCEPT}
                    error={rejections.sections}
                    onFiles={(files) => addSectionFiles(files, "sections", SECTION_COUNT - sections.length)}
                  />
                )}
                <ol className="grid grid-cols-4 gap-2">
                  {Array.from({ length: SECTION_COUNT }, (_, index) => {
                    const upload = sections[index];
                    return (
                      <li key={upload?.id ?? `waiting-${index}`} className="flex min-w-0 flex-col gap-0.5 rounded-sm border border-dashed border-ink/20 px-3 py-2.5">
                        {upload ? (
                          <>
                            <span className="truncate text-small font-medium text-ink">{upload.file.name}</span>
                            <ReplaceButton file={upload.file} onFile={(file) => replaceSection(upload.id, file)} className="self-start text-caption" />
                          </>
                        ) : (
                          <>
                            <span className="text-small font-medium text-ink"><span className="md:hidden">S{index + 1}</span><span className="hidden md:inline">Section {index + 1}</span></span>
                            <span className="text-caption text-smoke">Waiting</span>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {tileRejection && <p role="alert" className="text-small text-danger-ink">{tileRejection}</p>}
                <p className="text-small text-smoke">{LIMITS}</p>
              </>
            ) : (
              <SectionRows
                sections={sections}
                rowProblem={rowProblem}
                missing={anyUnreadable ? [] : missing}
                rejections={rejections}
                pickQuestions={pickQuestions}
                picks={picks}
                onPick={setPicks}
                onReplace={replaceSection}
                onTryAgain={(id) => tryAgain(null, id)}
                onRemove={(id) => setSections((current) => current.filter((entry) => entry.id !== id))}
                onAddMissing={(section, file) => addSectionFiles([file], `missing-${section}`, 1)}
              />
            )}
            {started && prepTest !== undefined && (
              <p className="text-small text-smoke">Practice test {prepTest}. You can replace any screenshot before you confirm.</p>
            )}
            {anyReading && <p className="text-small text-smoke">You can replace a screenshot while you wait. It keeps its place in line.</p>}
          </UploadGroup>
        ) : (
          <UploadGroup title="Practice test review" count="Not needed this week">
            <div className="flex gap-3 rounded-md bg-vellum p-5">
              <InfoGlyph className="mt-0.5" />
              <div className="flex flex-col gap-1">
                <p className="text-small font-medium text-ink">No practice test on {text.lastWeek}&apos;s plan</p>
                <p className="text-small text-smoke">{text.Week}&apos;s order comes from your analytics only. No question type goes first from a practice test.</p>
              </div>
            </div>
          </UploadGroup>
        )}
      </div>

      <aside className="flex flex-col gap-6 px-5 pt-10 lg:row-span-2 lg:border-l lg:border-vellum-line lg:bg-vellum lg:p-18">
        {trend && practiceTest && (
          <WhatWeFound result={practiceTest} analytics={trend} goesFirst={goesFirst} score={score} week={text.week} />
        )}
        {trend && (schedule ? (
          <PlannedWeek schedule={schedule} basis={basis} goesFirst={goesFirst} typed={typed} />
        ) : (
          <p className="text-small text-smoke">Enter a score from {MIN_SCORE} to {MAX_SCORE} to see {text.week}.</p>
        ))}
        {!found && <WhereToFind needsSections={needsSections} lastWeek={text.lastWeek} />}
      </aside>

      <div className="flex flex-col gap-4 px-5 pt-10 pb-12 lg:px-30 lg:pb-18">
        {offerRead ? (
          <Button className="w-full" onClick={() => setAnalyticsReads(["added"], { status: "waiting" })}>Read my screenshots</Button>
        ) : started || (typed && !needsSections) ? (
          <Button className="w-full" disabled={!ready} onClick={checkValues}>
            {anyReading ? `Reading ${Math.min(settledCount + 1, queuedOrDone.length)} of ${queuedOrDone.length}…` : "Check the values"}
          </Button>
        ) : (
          <Button className="w-full" disabled={!allAdded || score === null || typedProblem !== null} onClick={startReading}>
            {typed ? `Read my ${SECTION_COUNT} sections` : "Read my screenshots"}
          </Button>
        )}
        <p className="text-center text-small text-smoke">{hint}</p>
      </div>
    </div>
  );
}

function UploadGroup({ title, count, className, children }: { title: string; count: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cx("flex flex-col gap-3", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-body font-semibold text-ink">{title}</h2>
        <span className="text-small text-smoke">{count}</span>
      </div>
      {children}
    </section>
  );
}

function ReadSummary({ analytics, sections, onAnalytics, onReplace }: {
  analytics: Partial<Record<AnalyticsSection, AnalyticsUpload>>;
  sections: SectionUpload[];
  onAnalytics: (section: AnalyticsSection, file: File) => void;
  onReplace: (id: number, file: File) => void;
}) {
  const rows = [
    ...SECTIONS.flatMap((section) => {
      const upload = analytics[section];
      return upload?.read.status === "read"
        ? [{ upload, label: `${section} analytics`, value: `${upload.read.value.rows.length} types`, onFile: (file: File) => onAnalytics(section, file) }]
        : [];
    }),
    ...[...sections].sort((a, b) => sortKey(a) - sortKey(b)).flatMap((upload) => {
      const reading = upload.read.status === "read" ? upload.read.value : null;
      return reading?.page === "section_review"
        ? [{
          upload,
          label: `PT ${reading.prepTest} · Section ${reading.section} · ${reading.kind}`,
          value: formatSectionScore(reading.score),
          onFile: (file: File) => onReplace(upload.id, file),
        }]
        : [];
    }),
  ];
  return (
    <UploadGroup title="Screenshots" count={`${rows.length} of ${SECTIONS.filter((section) => analytics[section]).length + sections.length} read`} className="md:hidden">
      <ul className="flex flex-col rounded-md border border-vellum-line px-4">
        {rows.map(({ upload, label, value, onFile }) => (
          <li key={upload.id} className="flex h-12 items-center gap-2.5 border-b border-vellum-line last:border-b-0">
            <span className="flex w-3.5 shrink-0"><CheckGlyph /></span>
            <span className="min-w-0 grow truncate text-small text-ink">{label}</span>
            <span className="shrink-0 text-small text-smoke">{value}</span>
            <span className="flex w-14 shrink-0 justify-end"><ReplaceButton file={upload.file} onFile={onFile} /></span>
          </li>
        ))}
      </ul>
    </UploadGroup>
  );
}

function ReplaceButton({ file, onFile, className }: { file: File; onFile: (file: File) => void; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" aria-label={`Replace ${file.name}`} onClick={() => input.current?.click()} className={cx(LINK_BUTTON, className)}>
        Replace
      </button>
      <input
        ref={input}
        type="file"
        hidden
        aria-label={`Replacement for ${file.name}`}
        accept={ACCEPT}
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          event.target.value = "";
          if (chosen) onFile(chosen);
        }}
      />
    </>
  );
}

function Detail({ file, status, read = false, children }: {
  file: File;
  status: Read<unknown>["status"];
  read?: boolean;
  children?: ReactNode;
}) {
  return (
    <span aria-live="polite" className={cx("flex min-w-0 items-center gap-1.5", status === "reading" ? "text-accent" : "text-smoke")}>
      {read && <CheckGlyph />}
      {status === "waiting" && <ClockGlyph />}
      {status === "reading" && <ReadingGlyph />}
      <span className="truncate">
        {file.name}
        {status === "waiting" ? " · Waiting to read" : status === "reading" ? " · Reading now" : children && <> · {children}</>}
      </span>
    </span>
  );
}

const rowTone = (read: Read<unknown>, rejection: string | undefined) =>
  read.status === "problem" || read.status === "signed-out" || rejection ? "danger" : read.status === "refused" ? "warning" : "default";

function ReadNote({ read, onTryAgain }: { read: Read<unknown>; onTryAgain: () => void }) {
  if (read.status === "refused") {
    return (
      <div className="flex flex-col gap-2.5">
        <WaitNote>{read.message}</WaitNote>
        {read.tryAgain && <button type="button" onClick={onTryAgain} className={cx(LINK_BUTTON, "self-start pl-5.5")}>Try again</button>}
      </div>
    );
  }
  if (read.status !== "problem") return null;
  return (
    <>
      <ProblemNote>{read.message}</ProblemNote>
      {read.tryAgain && <Button variant="outline" size="md" className="self-start" onClick={onTryAgain}>Try again</Button>}
    </>
  );
}

function AnalyticsRow({ section, upload, rejection, onFile, onTryAgain }: {
  section: AnalyticsSection;
  upload: AnalyticsUpload | undefined;
  rejection: string | undefined;
  onFile: (file: File) => void;
  onTryAgain: (id: number) => void;
}) {
  if (!upload) {
    return <DropZone label={`${SECTION_NAME[section]} screenshot`} accept={ACCEPT} error={rejection} onFile={onFile} />;
  }
  const { read, file } = upload;
  const noun = section === "LR" ? "question types" : "passage types";
  return (
    <FileRow
      data-file-row=""
      tone={rowTone(read, rejection)}
      title={SECTION_NAME[section]}
      detail={(
        <Detail file={file} status={read.status} read={read.status === "read"}>
          {read.status === "read" ? `${read.value.rows.length} ${noun}` : read.status === "refused" && "not read"}
        </Detail>
      )}
      action={<ReplaceButton file={file} onFile={onFile} />}
    >
      <ReadNote read={read} onTryAgain={() => onTryAgain(upload.id)} />
      {read.status === "signed-out" && <SignInExpired />}
      {rejection && <ProblemNote>{rejection}</ProblemNote>}
    </FileRow>
  );
}

type PickQuestion = Extract<PracticeTestProblem, { problem: "hidden-pick" }> & { upload: SectionUpload };

function sortKey(upload: SectionUpload) {
  return upload.read.status === "read" && upload.read.value.page === "section_review" ? upload.read.value.section : SECTION_COUNT + 1;
}

function SectionRows({ sections, rowProblem, missing, rejections, pickQuestions, picks, onPick, onReplace, onTryAgain, onRemove, onAddMissing }: {
  sections: SectionUpload[];
  rowProblem: Map<number, RowProblem>;
  missing: number[];
  rejections: Record<string, string>;
  pickQuestions: PickQuestion[];
  picks: UploadPick[];
  onPick: (picks: UploadPick[]) => void;
  onReplace: (id: number, file: File) => void;
  onTryAgain: (id: number) => void;
  onRemove: (id: number) => void;
  onAddMissing: (section: number, file: File) => void;
}) {
  const rows: ({ key: number; upload: SectionUpload } | { key: number; missingSection: number })[] = [
    ...sections.map((upload) => ({ key: sortKey(upload), upload })),
    ...missing.map((section) => ({ key: section, missingSection: section })),
  ].sort((a, b) => a.key - b.key);

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => {
        if ("missingSection" in row) {
          const section = row.missingSection;
          return (
            <DropZone
              key={`missing-${section}`}
              label={`Section ${section} is missing`}
              accept={ACCEPT}
              error={rejections[`missing-${section}`] ?? `Add Section ${section} to continue.`}
              onFile={(file) => onAddMissing(section, file)}
            />
          );
        }
        const { upload } = row;
        const pick = pickQuestions.find((question) => question.upload.id === upload.id);
        return (
          <div key={upload.id} className="flex flex-col gap-2">
            <SectionRow
              upload={upload}
              problem={rowProblem.get(upload.id)}
              rejection={rejections[`file-${upload.id}`]}
              onReplace={(file) => onReplace(upload.id, file)}
              onTryAgain={() => onTryAgain(upload.id)}
              onRemove={() => onRemove(upload.id)}
            />
            {pick && <HiddenPickBox question={pick} picks={picks} onPick={onPick} />}
          </div>
        );
      })}
    </div>
  );
}

function SectionRow({ upload, problem, rejection, onReplace, onTryAgain, onRemove }: {
  upload: SectionUpload;
  problem: RowProblem | undefined;
  rejection: string | undefined;
  onReplace: (file: File) => void;
  onTryAgain: () => void;
  onRemove: () => void;
}) {
  const { read, file } = upload;
  const reading = read.status === "read" && read.value.page === "section_review" ? read.value : null;
  const title = problem?.problem === "wrong-page" || (read.status === "read" && !reading) ? "Not a practice test review"
    : problem?.problem === "same-section-twice" ? `Section ${problem.section} · again`
      : problem?.problem === "different-prep-test" && reading ? `Section ${reading.section} · practice test ${problem.prepTest}`
        : reading ? sectionTitle(reading.section, reading.kind)
          : PENDING.includes(read.status) ? "Practice test section"
            : read.status === "refused" ? "Not read yet" : "We couldn't read this screenshot";
  const detail = problem?.problem === "cut-off" && problem.lastQuestion !== null ? `ends at Q${problem.lastQuestion}`
    : reading && (!problem || problem.problem === "score-mismatch") ? `score ${formatSectionScore(reading.score)}`
      : read.status === "refused" && "not read";
  return (
    <FileRow
      data-file-row=""
      tone={problem ? "danger" : rowTone(read, rejection)}
      title={title}
      detail={<Detail file={file} status={read.status} read={Boolean(reading) && !problem}>{detail}</Detail>}
      action={problem?.problem === "same-section-twice"
        ? <button type="button" aria-label={`Remove ${file.name}`} onClick={onRemove} className={LINK_BUTTON}>Remove</button>
        : <ReplaceButton file={file} onFile={onReplace} />}
    >
      {problem ? <ProblemNote>{problemMessage(problem)}</ProblemNote> : <ReadNote read={read} onTryAgain={onTryAgain} />}
      {read.status === "signed-out" && <SignInExpired />}
      {rejection && <ProblemNote>{rejection}</ProblemNote>}
    </FileRow>
  );
}

const questionList = (questions: number[]) => {
  const names = questions.map((question) => `Q${question}`);
  return names.length <= 2 ? names.join(" and ") : `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
};

function HiddenPickBox({ question, picks, onPick }: { question: PickQuestion; picks: UploadPick[]; onPick: (picks: UploadPick[]) => void }) {
  const titleId = useId();
  const reading = question.upload.read.status === "read" ? question.upload.read.value : null;
  const score = reading?.page === "section_review" ? reading.score : 0;
  const upload = question.upload.id;
  const chosen = picks.find((pick) => pick.upload === upload)?.missed ?? [];
  const choose = (number: number) => {
    const missed = chosen.includes(number)
      ? chosen.filter((picked) => picked !== number)
      : question.pick === 1 ? [number] : [...chosen, number].slice(-question.pick);
    onPick([...picks.filter((pick) => pick.upload !== upload), { upload, missed }]);
  };
  return (
    <div role="group" aria-labelledby={titleId} className="flex flex-col gap-3.5 rounded-md border border-accent bg-accent/4 p-4">
      <div className="flex flex-col gap-1">
        <p id={titleId} className="text-small font-medium text-ink">Section {question.section}: which question did you miss?</p>
        <p className="text-small text-smoke">
          The cursor hides {questionList(question.candidates.map(({ question: number }) => number))}. The score of {formatSectionScore(score)} says you missed {question.pick === 1 ? "one" : question.pick} of them.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {question.candidates.map(({ question: number, stemTypes }) => {
          const pressed = chosen.includes(number);
          return (
            <button
              key={number}
              type="button"
              aria-pressed={pressed}
              onClick={() => choose(number)}
              className={cx(
                "flex min-h-9 flex-1 items-center justify-center rounded-sm border px-3 py-2 text-small text-ink",
                pressed ? "border-ink bg-paper font-medium" : "border-vellum-line bg-paper hover:border-fog",
                MOTION,
                FOCUS,
              )}
            >
              {[`Q${number}`, ...stemTypes].join(" · ")}
            </button>
          );
        })}
      </div>
      <p className="text-caption text-smoke">Or replace the screenshot with the cursor moved away.</p>
    </div>
  );
}

function WhatWeFound({ result, analytics, goesFirst, score, week }: {
  result: PracticeTestResult;
  analytics: AnalyticsSnapshot;
  goesFirst: LRStemType | undefined;
  score: number | null;
  week: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const types = missedTypesInOrder(result.missedStemTypes, goesFirst);
  const shown = showAll ? types : types.slice(0, TOP_TYPES);
  const rcSections = result.sections.filter(({ kind }) => kind === "RC");
  return (
    <section aria-label="What we found" className="flex flex-col gap-4 lg:rounded-md lg:bg-paper lg:p-7 lg:shadow-e2">
      <div className="flex flex-col gap-1.5">
        <p className="text-small text-smoke max-md:hidden">What we found · practice test {result.prepTest}{score !== null && ` · score ${score}`}</p>
        <h2 className="text-h5 font-semibold text-ink md:text-h4">
          {types.length > 0 ? `${types[0].type} goes first ${week}.` : `No question type goes first ${week}.`}
        </h2>
        <p className="text-small text-smoke">
          {types.length > 0
            ? <><span className="md:hidden">Practice test {result.prepTest}. </span>{missedCountSentence(types, analytics)}</>
            : `You missed no Logical Reasoning question on practice test ${result.prepTest}.`}
        </p>
      </div>
      {types.length > 0 && (
        <ul className="flex flex-col border-t border-vellum-line">
          {shown.map(({ type, misses }, index) => (
            <li
              key={type}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-b border-vellum-line py-2.5 sm:flex sm:items-center"
            >
              <span className={cx("min-w-0 flex-1 text-small text-ink", index === 0 && "font-medium")}>{type}</span>
              <span className="col-start-1 font-mono text-caption text-smoke sm:w-40">{misses.map(missLabel).join(" · ")}</span>
              <span className={cx("col-start-2 row-start-1 text-right text-small sm:w-18", index === 0 ? "font-semibold text-ink" : "text-smoke")}>
                {misses.length} missed
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-small text-ink">
          <CheckGlyph />
          {result.missedQuestions} missed in all · each section matches its 7Sage score
        </p>
        {types.length > TOP_TYPES && (
          <button type="button" aria-expanded={showAll} onClick={() => setShowAll(!showAll)} className={cx(LINK_BUTTON, "self-start")}>
            {showAll ? `Show the top ${TOP_TYPES}` : `See all ${types.length} types`}
          </button>
        )}
      </div>
      {rcSections.map(({ section }) => (
        <p key={section} className="text-small text-smoke">Section {section} is Reading Comprehension. It does not change your plan.</p>
      ))}
    </section>
  );
}

function PlannedWeek({ schedule, basis, goesFirst, typed }: {
  schedule: WeeklySchedule;
  basis: WeeklyUploadBasis;
  goesFirst: LRStemType | undefined;
  typed: boolean;
}) {
  const drills = firstDrills(schedule, goesFirst);
  const { Week } = planText(basis);
  return (
    <section aria-label={Week} className="flex flex-col gap-3">
      <p className="hidden flex-wrap items-baseline gap-x-3 md:flex">
        <span className="text-h6 font-semibold text-ink">{Week}</span>
        <span className="text-small text-smoke">{weekSummary(schedule, basis.startsOn)}</span>
      </p>
      <WeekTiles className="hidden md:flex" days={weekTiles(schedule, basis.startsOn)} highlight={drills?.day ?? null} />
      <div className="flex flex-col gap-2.5 rounded-sm border border-vellum-line bg-paper p-4 md:p-5">
        {drills ? (
          <DrillList
            title={<>{DAY_LABEL[drills.day]}&apos;s drills<span className="md:hidden"> · {drills.date}</span></>}
            tag={typed ? "From the values you typed · not confirmed" : "Read from your screenshots · not confirmed"}
            items={drills.items}
          />
        ) : (
          <p className="text-small text-smoke">{Week} has no drilling day.</p>
        )}
      </div>
    </section>
  );
}

const steps = (lastWeek: string) => [
  `In 7Sage, open the practice test you took ${lastWeek}. Go to its Review page.`,
  "Take one tall screenshot for each section. Start at the section title. End below the last question.",
  "Move the cursor off the Result column first. It can hide a result.",
];

function WhereToFind({ needsSections, lastWeek }: { needsSections: boolean; lastWeek: string }) {
  const [open, setOpen] = useState(false);
  const title = needsSections ? "Where to find them" : "Where to find it";
  return (
    <div className="flex flex-col gap-5 rounded-md border border-vellum-line p-5 lg:max-w-[560px] lg:rounded-none lg:border-0 lg:p-0">
      <h2 className="hidden text-h5 font-semibold text-ink lg:block">{title}</h2>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={cx("flex items-center justify-between gap-4 text-left lg:hidden", FOCUS)}>
        <span className="flex flex-col gap-1">
          <span className="text-body font-medium text-ink">{title}</span>
          <span className="text-small text-smoke">{needsSections ? "Steps and a sample section screenshot" : "Your 7Sage Analytics page"}</span>
        </span>
        <svg aria-hidden viewBox="0 0 12 12" className={cx("size-3 shrink-0 text-ink", open && "rotate-180")}>
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" className="stroke-current" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className={cx("flex-col gap-8", open ? "flex" : "hidden lg:flex")}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h3 className="text-small font-medium text-ink">7Sage analytics</h3>
            <p className="text-small text-smoke">Same as when you signed up: the Logical Reasoning and Reading Comprehension parts of your Analytics page.</p>
          </div>
          {needsSections && (
            <div className="flex flex-col gap-2.5">
              <h3 className="text-small font-medium text-ink">Practice test review</h3>
              <ol className="flex flex-col gap-2.5">
                {steps(lastWeek).map((step, index) => (
                  <li key={step} className="flex gap-3 text-small text-ink">
                    <span aria-hidden className="w-4 shrink-0 text-caption leading-small text-smoke">{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
        {needsSections && <GoodScreenshot />}
      </div>
    </div>
  );
}

const EXAMPLE_ROWS = [
  { code: "PT158.S3.Q1", tags: ["An", "Flaw"], result: "correct" },
  { code: "PT158.S3.Q3", tags: ["An", "CausR", "MC"], result: "wrong" },
  { code: "PT158.S3.Q25", tags: ["CondR", "PSAa"], result: "unanswered" },
] as const;

function ResultDot({ result }: { result: (typeof EXAMPLE_ROWS)[number]["result"] }) {
  return (
    <svg aria-hidden viewBox="0 0 18 18" className="size-4.5 shrink-0">
      <circle cx="9" cy="9" r="9" className={result === "correct" ? "fill-success" : "fill-danger"} />
      <path
        d={result === "correct" ? "M5.5 9.2l2.3 2.3 4.7-5" : result === "wrong" ? "M6.3 6.3l5.4 5.4M11.7 6.3l-5.4 5.4" : "M5.8 9h6.4"}
        fill="none"
        className="stroke-paper"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GoodScreenshot() {
  const marks = ["Section title and score in view", "Every question, with its tags", "No result hidden by the cursor"];
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-small font-medium text-ink">A good section screenshot</figcaption>
      <div className="flex flex-col gap-5 sm:flex-row">
        <div aria-hidden className="flex w-full max-w-80 flex-col gap-2.5 rounded-md border border-vellum-line bg-paper px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-body font-semibold text-ink">Section 3</span>
              <span className="rounded-pill border border-vellum-line px-1.5 py-0.5 text-caption font-semibold text-smoke">LR</span>
            </span>
            <span className="flex flex-col items-center rounded-sm border border-vellum-line px-2.5 py-1">
              <span className="text-label tracking-label text-smoke">SCORE</span>
              <span className="text-small font-semibold text-ink">−4</span>
            </span>
          </div>
          <ul className="flex flex-col border-t border-vellum-line">
            {EXAMPLE_ROWS.map(({ code, tags, result }, index) => (
              <li key={code} className="flex flex-col">
                {index === EXAMPLE_ROWS.length - 1 && (
                  <span className="border-b border-vellum-line py-2 text-caption text-fog">… every row down to the last question</span>
                )}
                <span className={cx("flex items-center gap-3 py-2", index < EXAMPLE_ROWS.length - 1 && "border-b border-vellum-line")}>
                  <span className="flex grow flex-col gap-1">
                    <span className="font-mono text-caption text-accent">{code}</span>
                    <span className="flex gap-1">
                      {tags.map((tag) => (
                        <span key={tag} className="rounded-pill border border-vellum-line px-1.5 py-0.5 text-caption text-smoke">{tag}</span>
                      ))}
                    </span>
                  </span>
                  <ResultDot result={result} />
                </span>
              </li>
            ))}
          </ul>
        </div>
        <ul className="flex max-w-50 flex-col gap-4 sm:justify-between sm:pt-5 sm:pb-4">
          {marks.map((mark) => (
            <li key={mark} className="flex items-start gap-2 text-small text-ink">
              <span aria-hidden className="mt-2.25 h-px w-3 shrink-0 bg-ink" />
              {mark}
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
