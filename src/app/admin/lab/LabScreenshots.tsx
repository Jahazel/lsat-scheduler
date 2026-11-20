"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { problemMessage } from "@/app/dashboard/upload/weeklyUploadText";
import { LastFinishedReadNotice } from "@/components/FailureNotice";
import { ScanningOffNote } from "@/components/ScanningOffNote";
import { ProblemNote } from "@/components/ui/FileRow";
import { FOCUS, cx } from "@/components/ui/classes";
import { reviewPracticeTest, type PracticeTestProblem } from "@/lib/practiceTestResult";
import type { LabRead } from "@/lib/scheduleLab";
import {
  addFile, emptyReadQueue, endRead, nextRead, readMessage, readScreenshot, removeFile, slotFile, slotFiles, startRead,
  type FileRead, type QueuedFile, type ReadQueue, type ScreenshotReads, type ScreenshotSlot,
} from "@/lib/screenshotReadQueue";
import { SCREENSHOT_MEDIA_TYPES } from "@/lib/screenshotUpload";
import type { AnalyticsSection } from "@/lib/types";
import { PRESS } from "../StudentsLedger";

type LabFile = QueuedFile<ScreenshotReads>;

const ACCEPT = SCREENSHOT_MEDIA_TYPES.join(",");
const READ_ORDER: readonly ScreenshotSlot[] = ["LR", "RC", "section"];
const PENDING: FileRead<unknown>["status"][] = ["added", "waiting", "reading"];
const pending = ({ read }: { read: FileRead<unknown> }) => PENDING.includes(read.status);

function practiceTestProblem(problem: PracticeTestProblem) {
  if (problem.problem === "section-missing") return `Section ${problem.section} is missing. Add all 4 sections together.`;
  if (problem.problem === "hidden-pick") return "The cursor hides a result in one section. Use a screenshot without it.";
  return problemMessage(problem);
}

export function useLabScreenshots(serverScanningOff: boolean) {
  const [reads, setReads] = useState<ReadQueue<ScreenshotReads>>(emptyReadQueue);
  const [scanningOff, setScanningOff] = useState(serverScanningOff);
  const lr = slotFile(reads, "LR");
  const rc = slotFile(reads, "RC");
  const pt = useMemo(() => slotFiles(reads, "section"), [reads]);

  useEffect(() => {
    async function read(file: LabFile) {
      setReads((current) => startRead(current, file.id));
      const settled = await readScreenshot(file.file, file.slot, "lab");
      setReads((current) => endRead(current, file.id, settled.read));
      if (settled.scanningOff) setScanningOff(true);
    }

    const next = nextRead(reads, READ_ORDER);
    if (next) void read(next);
  }, [reads]);

  const readSection = (section: AnalyticsSection) => ([file]: File[]) => {
    if (file) setReads((current) => addFile(current, { slot: section, file, status: "waiting", replacing: slotFile(current, section)?.id }));
  };

  const readPracticeTest = (files: File[]) => {
    if (files.length === 0) return;
    setReads((current) => {
      const cleared = slotFiles(current, "section").reduce((next, { id }) => removeFile(next, id), current);
      return files.reduce((next, file) => addFile(next, { slot: "section", file, status: "waiting" }), cleared);
    });
  };

  const review = useMemo(() => {
    const readings = pt.flatMap((file) => (file.read.status === "read" ? [file.read.value] : []));
    return readings.length > 0 && !pt.some(pending) ? reviewPracticeTest(readings) : null;
  }, [pt]);

  const read = useMemo<LabRead | null>(
    () => (lr?.read.status === "read" && rc?.read.status === "read"
      ? { lr: lr.read.value.rows, rc: rc.read.value.rows, practiceTest: review?.ok ? review.result : null }
      : null),
    [lr, rc, review],
  );

  return { reads, lr, rc, pt, review, scanningOff, read, readSection, readPracticeTest };
}

export type LabScreenshotSlots = ReturnType<typeof useLabScreenshots>;

function Pick({ label, slot, multiple, disabled, onFiles }: {
  label: string; slot: string; multiple?: boolean; disabled: boolean; onFiles: (files: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" disabled={disabled} aria-label={`${label} ${slot} screenshot${multiple ? "s" : ""}`} onClick={() => input.current?.click()}
        className={cx("-my-1 h-8 shrink-0 rounded-pill px-2 text-small font-medium text-ink underline underline-offset-[3px] pointer-hover:hover:bg-vellum-line disabled:pointer-events-none disabled:text-fog", PRESS, FOCUS)}>
        {label}
      </button>
      <input ref={input} type="file" accept={ACCEPT} multiple={multiple} hidden data-slot={slot}
        onChange={(e) => { onFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
    </>
  );
}

type Tone = "idle" | "busy" | "done" | "bad";

function Row({ title, detail, tone, action }: { title: string; detail: string; tone: Tone; action: React.ReactNode }) {
  return (
    <li aria-label={title} className={cx("flex items-center gap-3 rounded-sm border px-3 py-2.5",
      tone === "idle" ? "border-dashed border-ink/muted bg-vellum" : tone === "bad" ? "border-danger-ink bg-paper" : "border-vellum-line bg-paper")}>
      <span aria-hidden className={cx("size-2 shrink-0 rounded-pill",
        tone === "done" ? "bg-success-ink" : tone === "busy" ? "animate-pulse bg-accent motion-reduce:animate-none" : tone === "bad" ? "bg-danger-ink" : "bg-fog")} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-small font-medium text-ink">{title}</span>
        <span className="text-caption [overflow-wrap:anywhere] text-smoke">{detail}</span>
      </span>
      {action}
    </li>
  );
}

const shortName = (name: string) => (name.length > 24 ? `${name.slice(0, 12)}…${name.slice(-10)}` : name);

function fileDetail<S extends ScreenshotSlot>(file: QueuedFile<ScreenshotReads, S> | undefined, read: (value: ScreenshotReads[S]) => string) {
  if (!file) return "Not added";
  if (pending(file)) return `Reading ${shortName(file.file.name)}…`;
  if (file.read.status !== "read") return shortName(file.file.name);
  return `${shortName(file.file.name)} · ${read(file.read.value)}`;
}

const fileTone = (file: { read: FileRead<unknown> } | undefined): Tone => (!file ? "idle" : pending(file) ? "busy" : file.read.status === "read" ? "done" : "bad");

function problemNote(file: { read: FileRead<unknown> } | undefined) {
  return file ? readMessage(file.read) : null;
}

export function LabScreenshots({ slots }: { slots: LabScreenshotSlots }) {
  const { reads, lr, rc, pt, review, scanningOff } = slots;
  const ptReading = pt.some(pending);
  const ptRead = pt.filter((file) => file.read.status === "read").length;
  const ptFailed = pt.flatMap((file) => {
    const message = problemNote(file);
    return message ? [`${shortName(file.file.name)}: ${message}`] : [];
  });
  const ptDetail = pt.length === 0 ? "Optional · all 4 sections" : ptReading ? `Reading ${pt.length} files…`
    : review?.ok ? `PT ${review.result.prepTest} · ${review.result.missedQuestions} missed` : `${ptRead} of ${pt.length} read`;
  const ptTone: Tone = pt.length === 0 ? "idle" : ptReading ? "busy" : review?.ok ? "done" : "bad";
  const pickLabel = (empty: boolean) => (empty ? "Choose" : "Replace");
  const lrProblem = problemNote(lr);
  const rcProblem = problemNote(rc);

  return (
    <div className="flex flex-col gap-2">
      {scanningOff && <ScanningOffNote>Sample directions and every typed input still build the week.</ScanningOffNote>}
      <ul aria-label="Screenshots" className="flex flex-col gap-2">
        <Row title="Logical Reasoning" detail={fileDetail(lr, ({ rows }) => `${rows.filter((row) => row.category === "regular").length} types`)} tone={fileTone(lr)}
          action={<Pick label={pickLabel(!lr)} slot="Logical Reasoning" disabled={scanningOff} onFiles={slots.readSection("LR")} />} />
        <Row title="Reading Comprehension" detail={fileDetail(rc, ({ rows }) => `${rows.length} passage types`)} tone={fileTone(rc)}
          action={<Pick label={pickLabel(!rc)} slot="Reading Comprehension" disabled={scanningOff} onFiles={slots.readSection("RC")} />} />
        <Row title="Practice test sections" detail={ptDetail} tone={ptTone}
          action={<Pick label={pickLabel(pt.length === 0)} slot="practice test section" multiple disabled={scanningOff} onFiles={slots.readPracticeTest} />} />
      </ul>
      {lrProblem && <ProblemNote>Logical Reasoning: {lrProblem}</ProblemNote>}
      {rcProblem && <ProblemNote>Reading Comprehension: {rcProblem}</ProblemNote>}
      {ptFailed.map((message) => <ProblemNote key={message}>{message}</ProblemNote>)}
      {review && !review.ok && review.problems.map((problem, i) => <ProblemNote key={i}>{practiceTestProblem(problem)}</ProblemNote>)}
      {reads.files.map((file) => <LastFinishedReadNotice key={file.rowKey} read={file.read} />)}
      <p className="text-caption text-smoke">PNG, JPG, or WEBP. Read, never saved. Each read counts toward the monthly scan limit.</p>
    </div>
  );
}
