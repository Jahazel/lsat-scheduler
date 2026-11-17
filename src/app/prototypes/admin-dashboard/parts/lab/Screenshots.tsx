"use client";

import { useEffect, useRef, useState } from "react";
import { problemMessage } from "@/app/dashboard/upload/weeklyUploadText";
import { ProblemNote } from "@/components/ui/FileRow";
import { cx } from "@/components/ui/classes";
import { reviewPracticeTest, type PracticeTestProblem, type SectionReading } from "@/lib/practiceTestResult";
import {
  CANNOT_READ, CONNECTION_LOST, SCREENSHOT_MEDIA_TYPES, TOOK_TOO_LONG, checkScreenshotType, extractPracticeTestScreenshot, extractScreenshot,
  type ExtractReply, type SectionReply,
} from "@/lib/screenshotUpload";
import type { AnalyticsExtractedRow, AnalyticsSection } from "@/lib/types";
import { plannedWeekAnalytics, type WeeklyUploadBasis } from "@/lib/weeklyUploadPreview";
import { PRESS } from "../chrome";
import { installFakeReader } from "./fakeReader";
import type { Lab } from "./parts";

type Slot<T> = { state: "empty" } | { state: "reading"; name: string } | { state: "read"; name: string; value: T } | { state: "failed"; name: string; message: string };
const EMPTY = { state: "empty" } as const;
const ACCEPT = SCREENSHOT_MEDIA_TYPES.join(",");

function failure(reply: Exclude<ExtractReply | SectionReply, { kind: "rows" } | { kind: "reading" }>) {
  if (reply.kind === "rejected" || reply.kind === "refused") return reply.message;
  if (reply.kind === "timed-out") return TOOK_TOO_LONG;
  if (reply.kind === "connection-lost") return CONNECTION_LOST;
  return CANNOT_READ;
}

function ptProblem(p: PracticeTestProblem) {
  if (p.problem === "section-missing") return `Section ${p.section} is missing. Add all 4 sections together.`;
  if (p.problem === "hidden-pick") return "The cursor hides a result in one section. Use a screenshot without it.";
  return problemMessage(p);
}

function basisFor(lab: Lab): WeeklyUploadBasis {
  const d = lab.draft;
  return {
    weekOf: d.weekOf, plans: "next_week", startsOn: "MONDAY", hadPracticeTest: true, priorSnapshots: [], priorSchedules: [],
    student: { currentScore: Number(d.current) || 150, goalScore: Number(d.goal) || 165, dailyCapacityMinutes: d.days, preferredPracticeTestDay: d.ptDay, accommodationMultiplier: d.accommodation, goalTestDate: d.testMonth },
  };
}

function Pick({ label, multiple, onFiles }: { label: string; multiple?: boolean; onFiles: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" onClick={() => input.current?.click()} className={cx("-my-1 h-8 shrink-0 rounded-pill px-2 text-small font-medium text-ink underline underline-offset-[3px] pointer-hover:hover:bg-vellum-line", PRESS)}>{label}</button>
      <input ref={input} type="file" accept={ACCEPT} multiple={multiple} hidden onChange={(e) => { onFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
    </>
  );
}

function Row({ title, detail, tone, action }: { title: string; detail: string; tone: "idle" | "busy" | "done" | "bad"; action: React.ReactNode }) {
  return (
    <li className={cx("flex items-center gap-3 rounded-sm border px-3 py-2.5", tone === "idle" ? "border-dashed border-ink/muted bg-vellum" : tone === "bad" ? "border-danger-ink bg-paper" : "border-vellum-line bg-paper")}>
      <span aria-hidden className={cx("size-2 shrink-0 rounded-pill", tone === "done" ? "bg-success-ink" : tone === "busy" ? "animate-pulse bg-accent motion-reduce:animate-none" : tone === "bad" ? "bg-danger-ink" : "bg-fog")} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-small font-medium text-ink">{title}</span>
        <span className="text-caption [overflow-wrap:anywhere] text-smoke">{detail}</span>
      </span>
      {action}
    </li>
  );
}

const shortName = (name: string) => (name.length > 24 ? `${name.slice(0, 12)}…${name.slice(-10)}` : name);
const slotDetail = <T,>(slot: Slot<T>, read: (value: T) => string) =>
  slot.state === "empty" ? "Not added" : slot.state === "reading" ? `Reading ${shortName(slot.name)}…` : slot.state === "failed" ? shortName(slot.name) : `${shortName(slot.name)} · ${read(slot.value)}`;
const slotTone = <T,>(slot: Slot<T>) => (slot.state === "empty" ? "idle" : slot.state === "reading" ? "busy" : slot.state === "failed" ? "bad" : "done");

export function Screenshots({ lab }: { lab: Lab }) {
  const [lr, setLr] = useState<Slot<AnalyticsExtractedRow[]>>(EMPTY);
  const [rc, setRc] = useState<Slot<AnalyticsExtractedRow[]>>(EMPTY);
  const [pt, setPt] = useState<{ files: Slot<SectionReading>[] }>({ files: [] });
  useEffect(() => installFakeReader(), []);

  const readSection = (section: AnalyticsSection, set: typeof setLr) => async ([file]: File[]) => {
    if (!file) return;
    const wrong = checkScreenshotType(file);
    if (wrong) return set({ state: "failed", name: file.name, message: wrong.message });
    set({ state: "reading", name: file.name });
    const reply = await extractScreenshot(file, section);
    set(reply.kind === "rows" ? { state: "read", name: file.name, value: reply.rows } : { state: "failed", name: file.name, message: failure(reply) });
  };
  const readPracticeTest = async (files: File[]) => {
    setPt({ files: files.map((f) => ({ state: "reading", name: f.name })) });
    const read = await Promise.all(files.map(async (file): Promise<Slot<SectionReading>> => {
      const wrong = checkScreenshotType(file);
      if (wrong) return { state: "failed", name: file.name, message: wrong.message };
      const reply = await extractPracticeTestScreenshot(file);
      return reply.kind === "reading" ? { state: "read", name: file.name, value: reply.reading } : { state: "failed", name: file.name, message: failure(reply) };
    }));
    setPt({ files: read });
  };

  const readings = pt.files.flatMap((f) => (f.state === "read" ? [f.value] : []));
  const ptReading = pt.files.some((f) => f.state === "reading");
  const ptReview = readings.length > 0 && !ptReading ? reviewPracticeTest(readings) : null;
  const ptFailed = pt.files.flatMap((f) => (f.state === "failed" ? [`${shortName(f.name)}: ${f.message}`] : []));

  const lrRows = lr.state === "read" ? lr.value : null;
  const rcRows = rc.state === "read" ? rc.value : null;
  const missed = ptReview?.ok ? ptReview.result.missedStemTypeCounts : undefined;
  const key = lrRows && rcRows ? `${lr.state === "read" && lr.name}|${rc.state === "read" && rc.name}|${ptReview?.ok ? ptReview.result.prepTest : "-"}` : null;
  const applied = useRef<string | null>(null);
  useEffect(() => {
    if (!key && applied.current !== null) {
      applied.current = null;
      lab.set({ analytics: { kind: "upload" } });
    }
    if (!key || !lrRows || !rcRows || applied.current === key) return;
    applied.current = key;
    const rows = [...lrRows, ...rcRows];
    const parts = [`${lrRows.filter((r) => r.category === "regular").length} LR types`, `${rcRows.length} RC types`];
    if (ptReview?.ok) parts.push(`PT ${ptReview.result.prepTest}, ${ptReview.result.missedQuestions} missed`);
    lab.set({ analytics: { kind: "screenshots", snapshot: plannedWeekAnalytics(basisFor(lab), rows), missed, summary: parts.join(" · ") } });
  });

  const ptDetail = pt.files.length === 0 ? "Optional · all 4 sections" : ptReading ? `Reading ${pt.files.length} files…`
    : ptReview?.ok ? `PT ${ptReview.result.prepTest} · ${ptReview.result.missedQuestions} missed` : `${readings.length} of ${pt.files.length} read`;
  const ptTone = pt.files.length === 0 ? "idle" : ptReading ? "busy" : ptReview?.ok ? "done" : "bad";

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        <Row title="Logical Reasoning" detail={slotDetail(lr, (rows) => `${rows.filter((r) => r.category === "regular").length} types`)} tone={slotTone(lr)}
          action={<Pick label={lr.state === "empty" ? "Choose" : "Replace"} onFiles={readSection("LR", setLr)} />} />
        <Row title="Reading Comprehension" detail={slotDetail(rc, (rows) => `${rows.length} passage types`)} tone={slotTone(rc)}
          action={<Pick label={rc.state === "empty" ? "Choose" : "Replace"} onFiles={readSection("RC", setRc)} />} />
        <Row title="Practice test sections" detail={ptDetail} tone={ptTone}
          action={<Pick label={pt.files.length === 0 ? "Choose" : "Replace"} multiple onFiles={readPracticeTest} />} />
      </ul>
      {lr.state === "failed" && <ProblemNote>Logical Reasoning: {lr.message}</ProblemNote>}
      {rc.state === "failed" && <ProblemNote>Reading Comprehension: {rc.message}</ProblemNote>}
      {ptFailed.map((m) => <ProblemNote key={m}>{m}</ProblemNote>)}
      {ptReview && !ptReview.ok && ptReview.problems.map((p, i) => <ProblemNote key={i}>{ptProblem(p)}</ProblemNote>)}
      <p className="text-caption text-smoke">PNG, JPG, or WEBP. Read, never saved. Each read counts toward the monthly scan limit.</p>
    </div>
  );
}
