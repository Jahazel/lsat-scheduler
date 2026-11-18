"use client";

import { useMemo, useRef, useState } from "react";
import { problemMessage } from "@/app/dashboard/upload/weeklyUploadText";
import { ScanningOffNote } from "@/components/ScanningOffNote";
import { ProblemNote } from "@/components/ui/FileRow";
import { FOCUS, cx } from "@/components/ui/classes";
import { reviewPracticeTest, type PracticeTestProblem, type SectionReading } from "@/lib/practiceTestResult";
import type { LabRead } from "@/lib/scheduleLab";
import { NO_LR_ROWS, analyticsRead } from "@/lib/screenshotReadQueue";
import {
  CANNOT_READ, CONNECTION_LOST, SCREENSHOT_MEDIA_TYPES, TOOK_TOO_LONG, checkScreenshotType, extractPracticeTestScreenshot, extractScreenshot,
  type ExtractReply, type SectionReply,
} from "@/lib/screenshotUpload";
import type { AnalyticsExtractedRow, AnalyticsSection } from "@/lib/types";
import { PRESS } from "../StudentsLedger";

type Slot<T> =
  | { state: "empty" }
  | { state: "reading"; name: string }
  | { state: "read"; name: string; value: T }
  | { state: "failed"; name: string; message: string };
type Rows = AnalyticsExtractedRow[];

const EMPTY = { state: "empty" } as const;
const ACCEPT = SCREENSHOT_MEDIA_TYPES.join(",");

function failure(reply: Exclude<ExtractReply | SectionReply, { kind: "rows" } | { kind: "reading" }>) {
  if (reply.kind === "rejected" || reply.kind === "refused") return reply.message;
  if (reply.kind === "timed-out") return TOOK_TOO_LONG;
  if (reply.kind === "connection-lost") return CONNECTION_LOST;
  return CANNOT_READ;
}

function practiceTestProblem(problem: PracticeTestProblem) {
  if (problem.problem === "section-missing") return `Section ${problem.section} is missing. Add all 4 sections together.`;
  if (problem.problem === "hidden-pick") return "The cursor hides a result in one section. Use a screenshot without it.";
  return problemMessage(problem);
}

export function useLabScreenshots(serverScanningOff: boolean) {
  const [lr, setLr] = useState<Slot<Rows>>(EMPTY);
  const [rc, setRc] = useState<Slot<Rows>>(EMPTY);
  const [pt, setPt] = useState<Slot<SectionReading>[]>([]);
  const [scanningOff, setScanningOff] = useState(serverScanningOff);
  const latest = useRef({ LR: 0, RC: 0, PT: 0 });
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const readOneAtATime = <T,>(read: () => Promise<T>) => {
    const next = queue.current.then(read);
    queue.current = next.catch(() => undefined);
    return next;
  };

  const failed = (reply: Parameters<typeof failure>[0]) => {
    if (reply.kind === "refused" && reply.refused === "scanning-off") setScanningOff(true);
    return failure(reply);
  };

  const readSection = (section: AnalyticsSection) => async ([file]: File[]) => {
    if (!file) return;
    const set = section === "LR" ? setLr : setRc;
    const turn = ++latest.current[section];
    const wrong = checkScreenshotType(file);
    if (wrong) return set({ state: "failed", name: file.name, message: wrong.message });
    set({ state: "reading", name: file.name });
    const reply = await readOneAtATime(() => extractScreenshot(file, section, "lab"));
    if (turn !== latest.current[section]) return;
    if (reply.kind !== "rows") return set({ state: "failed", name: file.name, message: failed(reply) });
    const read = analyticsRead(reply, section, new Date());
    if (read.status === "read") return set({ state: "read", name: file.name, value: read.value.rows });
    set({ state: "failed", name: file.name, message: read.status === "rejected" ? read.message : NO_LR_ROWS });
  };

  const readPracticeTest = async (files: File[]) => {
    if (files.length === 0) return;
    const turn = ++latest.current.PT;
    setPt(files.map((file) => ({ state: "reading", name: file.name })));
    const read = await Promise.all(files.map(async (file): Promise<Slot<SectionReading>> => {
      const wrong = checkScreenshotType(file);
      if (wrong) return { state: "failed", name: file.name, message: wrong.message };
      const reply = await readOneAtATime(() => extractPracticeTestScreenshot(file, "lab"));
      return reply.kind === "reading" ? { state: "read", name: file.name, value: reply.reading } : { state: "failed", name: file.name, message: failed(reply) };
    }));
    if (turn === latest.current.PT) setPt(read);
  };

  const review = useMemo(() => {
    const readings = pt.flatMap((file) => (file.state === "read" ? [file.value] : []));
    return readings.length > 0 && !pt.some((file) => file.state === "reading") ? reviewPracticeTest(readings) : null;
  }, [pt]);

  const read = useMemo<LabRead | null>(
    () => (lr.state === "read" && rc.state === "read" ? { lr: lr.value, rc: rc.value, practiceTest: review?.ok ? review.result : null } : null),
    [lr, rc, review],
  );

  return { lr, rc, pt, review, scanningOff, read, readSection, readPracticeTest };
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

function slotDetail<T>(slot: Slot<T>, read: (value: T) => string) {
  if (slot.state === "empty") return "Not added";
  if (slot.state === "reading") return `Reading ${shortName(slot.name)}…`;
  if (slot.state === "failed") return shortName(slot.name);
  return `${shortName(slot.name)} · ${read(slot.value)}`;
}

const TONE: Record<Slot<unknown>["state"], Tone> = { empty: "idle", reading: "busy", read: "done", failed: "bad" };

export function LabScreenshots({ slots }: { slots: LabScreenshotSlots }) {
  const { lr, rc, pt, review, scanningOff } = slots;
  const ptReading = pt.some((file) => file.state === "reading");
  const ptRead = pt.filter((file) => file.state === "read").length;
  const ptFailed = pt.flatMap((file) => (file.state === "failed" ? [`${shortName(file.name)}: ${file.message}`] : []));
  const ptDetail = pt.length === 0 ? "Optional · all 4 sections" : ptReading ? `Reading ${pt.length} files…`
    : review?.ok ? `PT ${review.result.prepTest} · ${review.result.missedQuestions} missed` : `${ptRead} of ${pt.length} read`;
  const ptTone: Tone = pt.length === 0 ? "idle" : ptReading ? "busy" : review?.ok ? "done" : "bad";
  const pickLabel = (empty: boolean) => (empty ? "Choose" : "Replace");

  return (
    <div className="flex flex-col gap-2">
      {scanningOff && <ScanningOffNote>Sample directions and every typed input still build the week.</ScanningOffNote>}
      <ul aria-label="Screenshots" className="flex flex-col gap-2">
        <Row title="Logical Reasoning" detail={slotDetail(lr, (rows) => `${rows.filter((row) => row.category === "regular").length} types`)} tone={TONE[lr.state]}
          action={<Pick label={pickLabel(lr.state === "empty")} slot="Logical Reasoning" disabled={scanningOff} onFiles={slots.readSection("LR")} />} />
        <Row title="Reading Comprehension" detail={slotDetail(rc, (rows) => `${rows.length} passage types`)} tone={TONE[rc.state]}
          action={<Pick label={pickLabel(rc.state === "empty")} slot="Reading Comprehension" disabled={scanningOff} onFiles={slots.readSection("RC")} />} />
        <Row title="Practice test sections" detail={ptDetail} tone={ptTone}
          action={<Pick label={pickLabel(pt.length === 0)} slot="practice test section" multiple disabled={scanningOff} onFiles={slots.readPracticeTest} />} />
      </ul>
      {lr.state === "failed" && <ProblemNote>Logical Reasoning: {lr.message}</ProblemNote>}
      {rc.state === "failed" && <ProblemNote>Reading Comprehension: {rc.message}</ProblemNote>}
      {ptFailed.map((message) => <ProblemNote key={message}>{message}</ProblemNote>)}
      {review && !review.ok && review.problems.map((problem, i) => <ProblemNote key={i}>{practiceTestProblem(problem)}</ProblemNote>)}
      <p className="text-caption text-smoke">PNG, JPG, or WEBP. Read, never saved. Each read counts toward the monthly scan limit.</p>
    </div>
  );
}
