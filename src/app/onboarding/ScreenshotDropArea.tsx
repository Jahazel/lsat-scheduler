"use client";

import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { PauseGlyph } from "@/components/ScanningOffNote";
import { SIGN_IN_EXPIRED, SignInAgainLink } from "@/components/SignInExpired";
import { ReadingBar, useReadingBar } from "@/components/ui/ReadingBar";
import { ClockGlyph, ReadingGlyph } from "@/components/ui/StatusIcon";
import { FOCUS, TAP_AREA, cx } from "@/components/ui/classes";
import { SECTION_NAME } from "@/lib/analyticsReview";
import type { Screenshot } from "@/lib/onboardingWizard";
import { CONNECTION_LOST, SCREENSHOT_MEDIA_TYPES } from "@/lib/screenshotUpload";
import type { AnalyticsSection } from "@/lib/types";

const ACCEPT = SCREENSHOT_MEDIA_TYPES.join(",");
const SWAP = "drop-area-swap";
const BOX = "flex min-h-[152px] w-full min-w-0 flex-col items-center justify-center gap-3 rounded-xl border bg-paper px-5 py-6 text-center outline-none transition-colors duration-(--duration-fast) ease-out";
const ROUND_BUTTON = cx(
  "inline-flex h-9 shrink-0 items-center rounded-full border border-vellum-line bg-paper px-4 text-small font-medium text-ink transition-[scale,background-color] duration-(--duration-fast) ease-out pointer-hover:bg-vellum active:scale-97",
  TAP_AREA,
  FOCUS,
);
const HINT: Record<AnalyticsSection, string> = {
  LR: "Question types with % or priority. Click to browse, or drop a file here.",
  RC: "Passage types with %. Click to browse, or drop a file here.",
};

type Read = Screenshot["read"];
type Look = "waiting" | "reading" | "read" | "problem" | "refused" | "paused";

const STATUS: Record<Exclude<Read["status"], "read" | "rejected" | "refused">, { text: string; look: Look }> = {
  added: { text: "Waiting to read", look: "waiting" },
  waiting: { text: "Waiting to read", look: "waiting" },
  reading: { text: "Reading your screenshot…", look: "reading" },
  failed: { text: "", look: "problem" },
  "timed-out": { text: "Reading took too long and stopped.", look: "problem" },
  "connection-lost": { text: CONNECTION_LOST, look: "paused" },
  "cannot-read": { text: "We couldn't read the rows in it.", look: "problem" },
  "signed-out": { text: SIGN_IN_EXPIRED, look: "problem" },
  "no-rows": { text: "No question types in this one.", look: "problem" },
};

function readSummary(section: AnalyticsSection, count: number) {
  const noun = section === "LR" ? "question type" : "passage type";
  return `${count} ${noun}${count === 1 ? "" : "s"} found`;
}

function describe(section: AnalyticsSection, read: Read, reading: boolean): { text: string; look: Look } {
  if (reading) return STATUS.reading;
  if (read.status === "read") return { text: readSummary(section, read.value.rows.length), look: "read" };
  if (read.status === "rejected") return { text: read.message, look: "problem" };
  if (read.status === "refused") return { text: read.message, look: "refused" };
  return STATUS[read.status];
}

function useDrag(onFile: (file: File) => void) {
  const [dragging, setDragging] = useState(false);
  return {
    dragging,
    handlers: {
      onDragOver: (event: DragEvent) => {
        event.preventDefault();
        setDragging(true);
      },
      onDragLeave: () => setDragging(false),
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) onFile(file);
      },
    },
  };
}

export function ScreenshotDropArea({
  section,
  screenshot,
  rejection,
  onFile,
  onTypeInstead,
}: {
  section: AnalyticsSection;
  screenshot: Screenshot | undefined;
  rejection: string | null;
  onFile: (file: File) => void;
  onTypeInstead: () => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const open = () => picker.current?.click();
  const rejectionId = useId();
  return (
    <div className="flex flex-col gap-2">
      <input
        ref={picker}
        type="file"
        hidden
        aria-label={`${SECTION_NAME[section]} screenshot file`}
        accept={ACCEPT}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      {screenshot
        ? <FilledArea section={section} screenshot={screenshot} onChoose={open} onFile={onFile} onTypeInstead={onTypeInstead} />
        : <IdleArea section={section} rejectionId={rejection ? rejectionId : undefined} onChoose={open} onFile={onFile} />}
      {rejection && <p id={rejectionId} role="alert" className="text-small text-danger-ink">{rejection}</p>}
    </div>
  );
}

function UploadGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6 text-smoke">
      <path d="M12 15V4.5m0 0L8 8.5m4-4 4 4M4.5 14v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IdleArea({ section, rejectionId, onChoose, onFile }: { section: AnalyticsSection; rejectionId: string | undefined; onChoose: () => void; onFile: (file: File) => void }) {
  const zone = useRef<HTMLButtonElement>(null);
  const { dragging, handlers } = useDrag(onFile);
  const id = useId();
  useEffect(() => {
    if (rejectionId && document.activeElement === document.body) zone.current?.focus();
  }, [rejectionId]);
  return (
    <button
      ref={zone}
      type="button"
      onClick={onChoose}
      {...handlers}
      aria-label={`${SECTION_NAME[section]} screenshot`}
      aria-describedby={cx(`${id}-hint`, rejectionId)}
      className={cx(
        BOX,
        "gap-1 border-dashed",
        dragging ? "border-accent bg-accent/faint" : rejectionId ? "border-danger-ink" : "border-fog/35 pointer-hover:border-fog",
        FOCUS,
      )}
    >
      <span className={cx("flex flex-col items-center gap-1", SWAP)}>
        <span className="mb-2"><UploadGlyph /></span>
        <span className="text-small font-medium text-ink">{SECTION_NAME[section]}</span>
        <span id={`${id}-hint`} className="max-w-[240px] text-caption text-smoke">{dragging ? "Drop to add it." : HINT[section]}</span>
      </span>
    </button>
  );
}

function FileName({ name, className }: { name: string; className?: string }) {
  const cut = name.length > 18 ? name.length - (name.at(-14) === " " ? 14 : 13) : name.length;
  const tail = name.slice(cut);
  return (
    <span title={name} className={cx("flex min-w-0 max-w-full", className)}>
      <span className="overflow-hidden text-ellipsis whitespace-pre">{name.slice(0, cut)}</span>
      {tail && <span className="shrink-0 whitespace-pre">{tail}</span>}
    </span>
  );
}

function Badge({ look }: { look: Look }) {
  const circle = "grid size-9 shrink-0 place-items-center rounded-full";
  switch (look) {
    case "read":
      return (
        <span aria-hidden className={cx(circle, "bg-success/12 text-success-ink")}>
          <svg viewBox="0 0 20 20" className="size-[18px]"><path d="m5.5 10.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      );
    case "reading":
      return <span aria-hidden className={cx(circle, "bg-accent/8 text-accent")}><ReadingGlyph /></span>;
    case "waiting":
      return <span aria-hidden className={cx(circle, "bg-vellum text-smoke")}><ClockGlyph /></span>;
    case "refused":
      return <span aria-hidden className={cx(circle, "bg-warning/12")}><PauseGlyph /></span>;
    case "paused":
      return <span aria-hidden className={cx(circle, "bg-vellum text-body font-semibold text-smoke")}>!</span>;
    case "problem":
      return <span aria-hidden className={cx(circle, "bg-danger/10 text-body font-semibold text-danger-ink")}>!</span>;
    default: {
      const exhaustive: never = look;
      return exhaustive;
    }
  }
}

function FileGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 shrink-0 text-smoke">
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="m3 11 3-3 2.5 2.5L10.5 8.5 13 11" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function FilledArea({
  section,
  screenshot,
  onChoose,
  onFile,
  onTypeInstead,
}: {
  section: AnalyticsSection;
  screenshot: Screenshot;
  onChoose: () => void;
  onFile: (file: File) => void;
  onTypeInstead: () => void;
}) {
  const { read, file } = screenshot;
  const bar = useReadingBar(read.status);
  const { text, look } = describe(section, read, bar.phase === "filling");
  const { dragging, handlers } = useDrag(onFile);
  const area = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (document.activeElement === document.body) area.current?.focus();
  }, [look]);
  const tryAgain = () => onFile(file);
  const notRead = read.status === "failed" || read.status === "refused";
  const pill = look === "read" || look === "reading" || look === "waiting";

  return (
    <div
      ref={area}
      role="group"
      aria-label={notRead ? `${SECTION_NAME[section]} · not read` : SECTION_NAME[section]}
      tabIndex={-1}
      {...handlers}
      className={cx(
        BOX,
        dragging ? "border-dashed border-accent bg-accent/faint"
          : look === "problem" ? "border-danger/45"
          : look === "refused" ? "border-warning/45"
          : "border-vellum-line",
      )}
    >
      <span key={look} className={cx("flex flex-col items-center gap-3", SWAP)}>
        <Badge look={look} />
      </span>
      <span className="flex w-full min-w-0 flex-col items-center gap-0.5">
        <span className="text-small font-semibold text-ink">
          {SECTION_NAME[section]}
          {notRead && <span className="font-regular text-smoke"> · not read</span>}
        </span>
        <span
          aria-live="polite"
          className={cx(
            "max-w-[320px] text-caption",
            look === "problem" ? "text-danger-ink" : look === "refused" ? "text-warning-ink" : look === "reading" ? "text-accent" : "text-smoke",
          )}
        >
          {text && <span key={text} className={cx("block", SWAP)}>{text}</span>}
        </span>
        {!pill && <FileName name={file.name} className="text-caption text-smoke" />}
      </span>
      <span key={`${look}-actions`} className={cx("flex w-full min-w-0 flex-col items-center gap-3", SWAP)}>
        {pill && (
          <span className="flex h-8 max-w-full items-center gap-2 rounded-full border border-vellum-line pl-3 pr-1">
            <FileGlyph />
            <FileName name={file.name} className="text-caption text-ink" />
            <button
              type="button"
              onClick={onChoose}
              className={cx("flex h-6 shrink-0 items-center rounded-full bg-vellum px-2.5 text-caption font-medium text-ink transition-[scale] duration-(--duration-fast) ease-out active:scale-97", TAP_AREA, FOCUS)}
            >
              Replace
            </button>
          </span>
        )}
        <Actions section={section} read={read} look={look} onChoose={onChoose} onTryAgain={tryAgain} onTypeInstead={onTypeInstead} />
      </span>
      <span className="-mt-3 w-full max-w-[240px]">
        <ReadingBar label={`Reading your ${SECTION_NAME[section]} screenshot`} {...bar} />
      </span>
    </div>
  );
}

function Actions({
  section,
  read,
  look,
  onChoose,
  onTryAgain,
  onTypeInstead,
}: {
  section: AnalyticsSection;
  read: Read;
  look: Look;
  onChoose: () => void;
  onTryAgain: () => void;
  onTypeInstead: () => void;
}) {
  if (look === "reading") return null;
  const buttons: ReactNode[] = [];
  const add = (label: string, onClick: () => void) => buttons.push(
    <button key={label} type="button" onClick={onClick} className={ROUND_BUTTON}>{label}</button>,
  );
  switch (read.status) {
    case "connection-lost":
    case "timed-out":
    case "failed":
      add("Try again", onTryAgain);
      break;
    case "cannot-read":
      add("Try again", onTryAgain);
      add("Choose a sharper screenshot", onChoose);
      break;
    case "refused":
      if (read.tryAgain) add("Try again", onTryAgain);
      add("Type them instead", onTypeInstead);
      break;
    case "rejected":
      add("Choose another screenshot", onChoose);
      break;
    case "signed-out":
      return <SignInAgainLink className={ROUND_BUTTON} />;
    case "no-rows":
      return (
        <>
          <RightPartExample section={section} />
          <button type="button" onClick={onChoose} className={ROUND_BUTTON}>Choose another screenshot</button>
        </>
      );
    default:
      return null;
  }
  return <span className="mt-1 flex flex-wrap justify-center gap-2">{buttons}</span>;
}

const EXAMPLE: Record<AnalyticsSection, { title: string; rows: { type: string; value: string; bar?: number }[] }> = {
  LR: {
    title: "Logical Reasoning question types",
    rows: [
      { type: "Diagram", value: "64%", bar: 64 },
      { type: "Conditional reasoning", value: "68%", bar: 68 },
      { type: "Necessary assumption", value: "71%", bar: 71 },
      { type: "Phenomenon-hypothesis", value: "HIGHEST" },
      { type: "Causal reasoning", value: "MEDIUM" },
    ],
  },
  RC: {
    title: "Reading Comprehension passage types",
    rows: [
      { type: "Law", value: "58%", bar: 58 },
      { type: "Comparative", value: "70%", bar: 70 },
      { type: "Science", value: "64%", bar: 64 },
      { type: "Humanities", value: "81%", bar: 81 },
      { type: "Art", value: "77%", bar: 77 },
    ],
  },
};

function RightPartExample({ section }: { section: AnalyticsSection }) {
  const { title, rows } = EXAMPLE[section];
  return (
    <figure className="flex w-full flex-col gap-3 text-left">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-small font-semibold text-ink">Capture this part of 7Sage Analytics</span>
        <span className="text-caption text-smoke">Example</span>
      </figcaption>
      <div className="flex flex-col gap-3 rounded-sm bg-vellum p-4">
        <div aria-hidden className="flex items-center gap-3 opacity-55">
          <span className="h-2 w-11 rounded bg-ink/35" />
          <span className="h-2 w-16 rounded bg-ink/15" />
          <span className="h-2 w-[52px] rounded bg-ink/15" />
        </div>
        <div aria-hidden className="flex h-11 items-end gap-1.5 rounded-sm bg-paper p-2 opacity-55">
          {[14, 20, 18, 26, 24, 28].map((height, index) => (
            <span key={index} className="w-3.5 rounded-sm bg-ink/15" style={{ height }} />
          ))}
        </div>
        <div className="flex flex-col gap-2 rounded-sm border-2 border-accent bg-paper p-3 text-caption">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 font-semibold text-ink">{title}</span>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-ink px-2 py-0.5 font-medium text-chalk">This part</span>
          </div>
          {rows.map((row) => (
            <div key={row.type} className="flex items-center gap-2">
              <span className="w-[148px] min-w-0 shrink text-smoke">{row.type}</span>
              <span aria-hidden className="flex h-1.5 grow rounded-full bg-vellum">
                {row.bar !== undefined && <span className="h-1.5 rounded-full bg-ink/30" style={{ width: `${row.bar}%` }} />}
              </span>
              <span className="shrink-0 text-right font-mono text-smoke">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

const WHERE_STEPS = [
  "In 7Sage, open the Analytics page you checked most recently.",
  "Screenshot the Logical Reasoning section. Show every question type with its percentage or priority tier.",
  "Screenshot the Reading Comprehension section. Show every passage type it lists.",
];

export function WhereToFindIt() {
  return (
    <details className="group rounded-md border border-vellum-line px-4 open:pb-4">
      <summary className={cx("flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-small font-medium text-ink [&::-webkit-details-marker]:hidden", FOCUS)}>
        Where to find these in 7Sage
        <span aria-hidden className="text-smoke transition-transform duration-(--duration-fast) ease-out group-open:rotate-45">+</span>
      </summary>
      <ol className="flex flex-col gap-3 pt-1">
        {WHERE_STEPS.map((step, index) => (
          <li key={step} className="flex items-baseline gap-3 text-small text-ink">
            <span aria-hidden className="w-4 shrink-0 font-mono text-caption text-smoke">{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
    </details>
  );
}
