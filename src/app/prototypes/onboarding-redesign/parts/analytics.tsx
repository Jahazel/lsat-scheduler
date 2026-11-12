"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { ReadingBar, useReadingBar } from "@/components/ui/ReadingBar";
import { SegmentedSwitch } from "@/components/ui/SegmentedSwitch";
import { ReadingGlyph } from "@/components/ui/StatusIcon";
import { FOCUS, cx } from "@/components/ui/classes";
import { PauseGlyph, ScanningOffNote } from "@/components/ScanningOffNote";
import { analyticsInputs, type AnalyticsInput } from "@/lib/reviewDraft";
import { MAX_SCREENSHOT_BYTES, SCREENSHOT_LIMITS, SCREENSHOT_MEDIA_TYPES, SCREENSHOT_NOTICE, checkScreenshotType, tooLargeRejection } from "@/lib/screenshotUpload";
import type { Flow, Section, Upload } from "./flow";
import { TypedAnalytics } from "./review";

const SECTIONS: Section[] = ["LR", "RC"];
const NAME: Record<Section, string> = { LR: "Logical Reasoning", RC: "Reading Comprehension" };
const WHAT: Record<Section, string> = { LR: "Every question type with its percentage or priority tier", RC: "Every passage type it lists" };
const SHORT: Record<Section, string> = { LR: "Question types with % or priority", RC: "Passage types with %" };
const FOUND: Record<Section, string> = { LR: "9 question types", RC: "5 passage types" };
const DEMO_FILES: Record<Section, string> = { LR: "7sage-analytics-LR.png", RC: "7sage-analytics-RC.png" };
const CANNOT_READ = "We couldn't read the rows in it.";
const TIMED_OUT = "Reading took too long and stopped.";
// Test data: today's daily-limit refusal (src/lib/scanPlaces.ts) with its limit of 10.
const READ_REFUSED = "You've read 10 screenshots today. You can scan again tomorrow, after midnight Central time.";
const READ_MS = 1800;
const ACCEPT = SCREENSHOT_MEDIA_TYPES.join(",");
const SWAP = "analytics-swap";
const SMALL_BUTTON = cx(
  "h-9 shrink-0 rounded-full border border-vellum-line bg-paper px-4 text-small font-medium text-ink hover:bg-vellum transition-[transform,background-color] duration-(--duration-fast) ease-out active:scale-[0.97]",
  FOCUS,
);

type Picked = { name: string; type: string; size: number };

function FileName({ name, className }: { name: string; className?: string }) {
  const tail = name.length > 18 ? name.slice(-13) : "";
  return (
    <span title={name} className={cx("flex min-w-0 max-w-full", className)}>
      <span className="truncate">{tail ? name.slice(0, -13) : name}</span>
      {tail && <span className="shrink-0 whitespace-pre">{tail}</span>}
    </span>
  );
}

function useAnalytics(flow: Flow) {
  const [rejections, setRejections] = useState<Record<Section, string | null>>({ LR: null, RC: null });
  const start = (section: Section, name: string, again = false) => {
    flow.edit((old) => ({ files: { ...old.files, [section]: { name, read: false } } }));
    setTimeout(() => {
      // The toolbar's read outcome applies to the first read; Try again then reads, so the way back can be felt.
      const outcome = again ? "reads" : flow.cases.read;
      const done: Upload = outcome === "cannot" ? { name, read: false, problem: CANNOT_READ }
        : outcome === "timeout" ? { name, read: false, problem: TIMED_OUT }
        : outcome === "refused" ? { name, read: false, refused: READ_REFUSED }
        : { name, read: true };
      flow.edit((old) => (old.files[section]?.name === name ? { files: { ...old.files, [section]: done } } : {}));
    }, READ_MS);
  };
  const add = (section: Section, file: Picked) => {
    const rejection = checkScreenshotType(file)?.message ?? (file.size > MAX_SCREENSHOT_BYTES ? tooLargeRejection(file.size).message : null);
    setRejections((old) => ({ ...old, [section]: rejection }));
    if (!rejection) start(section, file.name);
  };
  const files = flow.values.files;
  return {
    mode: flow.values.input,
    setMode: (input: AnalyticsInput) => flow.edit({ input }),
    files,
    rejections,
    add,
    retry: (section: Section) => files[section] && start(section, files[section].name, true),
    demo: () => SECTIONS.forEach((s) => !files[s] && start(s, DEMO_FILES[s])),
    added: SECTIONS.filter((s) => files[s]).length,
    read: SECTIONS.filter((s) => files[s]?.read).length,
  };
}
type Analytics = ReturnType<typeof useAnalytics>;

function useSlot(a: Analytics, section: Section) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const upload = a.files[section];
  const bar = useReadingBar(!upload ? "added" : upload.problem ? "cannot-read" : upload.refused ? "refused" : upload.read ? "read" : "reading");
  const element = (
    <input
      ref={input}
      type="file"
      hidden
      accept={ACCEPT}
      aria-label={`${NAME[section]} screenshot file`}
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) a.add(section, file);
      }}
    />
  );
  return {
    input: element,
    open: () => input.current?.click(),
    upload,
    bar,
    reading: !!upload && !upload.problem && !upload.refused && (bar.phase === "reading" || bar.phase === "filling"),
    dragging,
    drop: {
      onDragOver: (e: DragEvent) => { e.preventDefault(); setDragging(true); },
      onDragLeave: () => setDragging(false),
      onDrop: (e: DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) a.add(section, f); },
    },
  };
}

function TrayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6 text-smoke">
      <path d="M12 15V4.5m0 0L8 8.5m4-4 4 4M4.5 14v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const BOX = "flex min-h-[152px] w-full min-w-0 items-center justify-center rounded-xl border px-5 py-6 transition-colors duration-(--duration-fast) ease-out";

type FilledProps = { section: Section; upload: Upload; reading: boolean; bar: ReactNode };

function QuietBox({ a, section }: { a: Analytics; section: Section }) {
  const slot = useSlot(a, section);
  const { upload, reading } = slot;
  const rejection = a.rejections[section];
  const tone = slot.dragging ? "border-dashed border-accent bg-accent/faint"
    : upload?.problem ? "border-danger-ink/40 bg-paper"
    : upload ? "border-vellum-line bg-paper"
    : rejection ? "border-dashed border-danger-ink bg-paper"
    : "border-dashed border-fog/35 bg-paper hover:border-fog";

  if (upload?.problem) {
    return (
      <div {...slot.drop} className={cx(BOX, tone)}>
        {slot.input}
        <div key="problem" className={cx("flex w-full min-w-0 flex-col items-center gap-1 text-center", SWAP)}>
          <span aria-hidden className="mb-2 grid size-9 place-items-center rounded-full bg-danger/10 text-body font-semibold text-danger-ink">!</span>
          <span className="text-small font-semibold text-ink">{NAME[section]}</span>
          <span role="alert" className="text-caption text-danger-ink">{upload.problem}</span>
          <FileName name={upload.name} className="text-caption text-fog" />
          <span className="mt-2 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => a.retry(section)} className={SMALL_BUTTON}>Try again</button>
            {upload.problem === CANNOT_READ && <button type="button" onClick={slot.open} className={SMALL_BUTTON}>Choose a sharper screenshot</button>}
          </span>
        </div>
      </div>
    );
  }

  if (upload?.refused) {
    return (
      <div className={cx(BOX, "border-warning/45 bg-paper")}>
        <div key="refused" className={cx("flex w-full min-w-0 flex-col items-center gap-1 text-center", SWAP)}>
          <span aria-hidden className="mb-2 grid size-9 place-items-center rounded-full bg-warning/12"><PauseGlyph /></span>
          <span className="text-small font-semibold text-ink">{NAME[section]} · <span className="font-regular text-smoke">not read</span></span>
          <span role="status" className="max-w-[320px] text-caption text-warning-ink">{upload.refused}</span>
          <FileName name={upload.name} className="text-caption text-fog" />
          <span className="mt-2 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => a.setMode("typed")} className={SMALL_BUTTON}>Type them instead</button>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {slot.input}
      <button type="button" onClick={slot.open} {...slot.drop} aria-describedby={rejection ? `${section}-rejection` : undefined} className={cx(BOX, tone, FOCUS)}>
        {!upload ? (
          <span key="idle" className={cx("flex flex-col items-center gap-1 text-center", SWAP)}>
            <span className="mb-2"><TrayIcon /></span>
            <span className="text-small font-medium text-ink">{NAME[section]}</span>
            <span className="max-w-[240px] text-caption text-fog">{SHORT[section]}. Click to browse, or drop a file here.</span>
          </span>
        ) : (
          <span key={reading ? "reading" : "read"} aria-live="polite" className={cx("flex w-full min-w-0", SWAP)}>
            <Filled section={section} upload={upload} reading={reading} bar={<ReadingBar label={`Reading your ${NAME[section]} screenshot`} {...slot.bar} />} />
          </span>
        )}
      </button>
      {rejection && <p id={`${section}-rejection`} role="alert" className="text-small text-danger-ink">{rejection}</p>}
    </div>
  );
}

function SuccessBadge({ reading, size = "size-9" }: { reading: boolean; size?: string }) {
  return (
    <span className={cx("grid shrink-0 place-items-center rounded-full", size, reading ? "bg-accent/8 text-accent" : "bg-success/12 text-success-ink")}>
      {reading ? <ReadingGlyph /> : (
        <svg viewBox="0 0 20 20" aria-hidden className="size-[18px]"><path d="m5.5 10.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      )}
    </span>
  );
}

function FileGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 shrink-0 text-smoke">
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="m3 11 3-3 2.5 2.5L10.5 8.5 13 11" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function Filled({ section, upload, reading, bar }: FilledProps) {
  return (
    <span className="flex w-full min-w-0 flex-col items-center gap-3 text-center">
      <SuccessBadge reading={reading} />
      <span className="flex flex-col items-center gap-0.5">
        <span className="text-small font-semibold text-ink">{NAME[section]}</span>
        <span className={cx("text-caption", reading ? "text-accent" : "text-smoke")}>{reading ? "Reading your screenshot…" : `${FOUND[section]} found`}</span>
      </span>
      <span className="flex h-8 max-w-full items-center gap-2 rounded-full border border-vellum-line pl-3 pr-1">
        <FileGlyph />
        <FileName name={upload.name} className="text-caption text-ink" />
        <span className="flex h-6 shrink-0 items-center rounded-full bg-vellum px-2.5 text-caption font-medium text-ink">Replace</span>
      </span>
      <span className="w-32">{bar}</span>
    </span>
  );
}

export function AnalyticsStep({ flow }: { flow: Flow }) {
  const a = useAnalytics(flow);
  return (
    <div className="flex flex-col gap-6">
      {flow.cases.scanOff && <ScanningOffNote>Type them below. Your first weekly schedule works the same way as with screenshots.</ScanningOffNote>}
      <SegmentedSwitch name="analyticsInput" label="How to add your analytics" options={analyticsInputs(flow.cases.scanOff)} value={a.mode} onChange={a.setMode} />
      {a.mode === "typed" ? (
        <TypedAnalytics flow={flow} />
      ) : (
        <div className="flex flex-col gap-3">
          {SECTIONS.map((s) => <QuietBox key={s} a={a} section={s} />)}
          <p className="text-small text-smoke">{a.read === 2 ? "Next, you check each value. Nothing counts until you confirm." : `${SCREENSHOT_LIMITS} each.`}</p>
          <details className="group rounded-md border border-vellum-line px-4 open:pb-4">
            <summary className={cx("flex h-11 cursor-pointer list-none items-center justify-between text-small font-medium text-ink [&::-webkit-details-marker]:hidden", FOCUS)}>
              Where to find these in 7Sage
              <span aria-hidden className="text-smoke transition-transform duration-(--duration-fast) ease-out group-open:rotate-45">+</span>
            </summary>
            <ol className="flex flex-col gap-3 pt-1">
              {["Open the 7Sage Analytics page you checked most recently.", `Screenshot Logical Reasoning: ${WHAT.LR.toLowerCase()}.`, `Screenshot Reading Comprehension: ${WHAT.RC.toLowerCase()}.`].map((step, i) => (
                <li key={step} className="flex items-baseline gap-3 text-small text-ink">
                  <span aria-hidden className="w-4 shrink-0 font-mono text-caption text-smoke">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </details>
          <p className="text-caption text-smoke">{SCREENSHOT_NOTICE}</p>
          {a.added < 2 && (
            <button type="button" onClick={a.demo} className={cx("self-start text-caption text-fog underline underline-offset-[3px]", FOCUS)}>
              Prototype only: add demo screenshots
            </button>
          )}
        </div>
      )}
    </div>
  );
}
