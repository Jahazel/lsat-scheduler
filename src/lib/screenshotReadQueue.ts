import { sectionOf } from "./analyticsReview";
import type { SectionReading } from "./practiceTestResult";
import type { ScanUse } from "./scanSpending";
import {
  CANNOT_READ, CONNECTION_LOST, SIGN_IN_EXPIRED, TOOK_TOO_LONG, checkScreenshotType, extractPracticeTestScreenshot, extractScreenshot, stopsLaterScans,
  type ExtractReply, type SectionReply,
} from "./screenshotUpload";
import type { AnalyticsExtractedRow, AnalyticsSection } from "./types";
import type { UnexpectedFailure } from "./unexpectedFailure";

type ReadProblem = "connection-lost" | "cannot-read" | "timed-out" | "no-rows";

export type FileRead<T> =
  | { status: "added" | "waiting" | "reading" | "signed-out" | ReadProblem }
  | { status: "rejected"; message: string }
  | { status: "refused"; message: string; tryAgain: boolean }
  | { status: "failed"; failure: UnexpectedFailure }
  | { status: "read"; value: T };

export type AnalyticsReading = { rows: AnalyticsExtractedRow[]; at: string };

export type QueuedFile<M, S extends keyof M = keyof M> = { [K in S]: { id: number; rowKey: number; slot: K; file: File; read: FileRead<M[K]> } }[S];

export interface ReadQueue<M> {
  files: QueuedFile<M>[];
  reading: number | null;
  nextId: number;
}

export function emptyReadQueue<M>(): ReadQueue<M> {
  return { files: [], reading: null, nextId: 0 };
}

export function slotFiles<M, S extends keyof M>(queue: ReadQueue<M>, slot: S): QueuedFile<M, S>[] {
  return queue.files.filter((file) => file.slot === slot) as QueuedFile<M, S>[];
}

export function slotFile<M, S extends keyof M>(queue: ReadQueue<M>, slot: S): QueuedFile<M, S> | undefined {
  return slotFiles(queue, slot)[0];
}

export function addFile<M>(
  queue: ReadQueue<M>,
  { slot, file, status, replacing }: { slot: keyof M; file: File; status: "added" | "waiting"; replacing?: number },
): ReadQueue<M> {
  const replaced = queue.files.find((entry) => entry.id === replacing);
  const added = { id: queue.nextId, rowKey: replaced?.rowKey ?? queue.nextId, slot, file, read: { status } } as QueuedFile<M>;
  const files = replacing === undefined
    ? [...queue.files, added]
    : queue.files.map((entry) => (entry === replaced ? added : entry));
  return { ...queue, files, nextId: queue.nextId + 1 };
}

export function removeFile<M>(queue: ReadQueue<M>, id: number): ReadQueue<M> {
  return { ...queue, files: queue.files.filter((file) => file.id !== id) };
}

export function moveFiles<M>(queue: ReadQueue<M>, which: (file: QueuedFile<M>) => boolean, status: "added" | "waiting"): ReadQueue<M> {
  return { ...queue, files: queue.files.map((file) => (which(file) ? { ...file, read: { status } } : file)) };
}

export function nextRead<M>(queue: ReadQueue<M>, order: readonly (keyof M)[]): QueuedFile<M> | undefined {
  if (queue.reading !== null) return undefined;
  return order.flatMap((slot) => slotFiles(queue, slot)).find((file) => file.read.status === "waiting");
}

export function startRead<M>(queue: ReadQueue<M>, id: number): ReadQueue<M> {
  const files = queue.files.map((file) => (file.id === id ? { ...file, read: { status: "reading" as const } } : file));
  return { ...queue, files, reading: id };
}

export function endRead<M>(queue: ReadQueue<M>, id: number, read: FileRead<M[keyof M]>): ReadQueue<M> {
  const stopsWaiting = read.status === "refused" && !read.tryAgain;
  const files = queue.files.map((file) =>
    file.id === id || (stopsWaiting && file.read.status === "waiting")
      ? ({ ...file, read } as QueuedFile<M>)
      : file);
  return { ...queue, files, reading: null };
}

type ScreenshotFailure = Exclude<ExtractReply, { kind: "rows" }>;

function failedRead(reply: ScreenshotFailure): FileRead<never> {
  switch (reply.kind) {
    case "rejected":
      return { status: "rejected", message: reply.message };
    case "refused":
      return { status: "refused", message: reply.message, tryAgain: !stopsLaterScans(reply) };
    case "failed":
      return { status: "failed", failure: reply.failure };
    case "connection-lost":
    case "cannot-read":
    case "timed-out":
    case "signed-out":
      return { status: reply.kind };
    default: {
      const _exhaustive: never = reply;
      return _exhaustive;
    }
  }
}

export const NOT_PASSAGE_PAGE = "No passage types in this one.";
export const NO_LR_ROWS = "We found no LR question types in that screenshot. Choose your Logical Reasoning screenshot.";

/** What a settled read says to the student or admin. Null when the read needs no words, or when the failure notice names it. */
export function readMessage(read: FileRead<unknown>): string | null {
  switch (read.status) {
    case "added":
    case "waiting":
    case "reading":
    case "read":
    case "failed":
      return null;
    case "rejected":
    case "refused":
      return read.message;
    case "connection-lost":
      return CONNECTION_LOST;
    case "cannot-read":
      return CANNOT_READ;
    case "timed-out":
      return TOOK_TOO_LONG;
    case "signed-out":
      return SIGN_IN_EXPIRED;
    case "no-rows":
      return NO_LR_ROWS;
    default: {
      const _exhaustive: never = read;
      return _exhaustive;
    }
  }
}

export type ScreenshotReads = { LR: AnalyticsReading; RC: AnalyticsReading; section: SectionReading };
export type ScreenshotSlot = keyof ScreenshotReads;

export interface SettledRead<T> {
  read: FileRead<T>;
  message: string | null;
  scanningOff: boolean;
}

function settled<T>(read: FileRead<T>, reply: ExtractReply | SectionReply): SettledRead<T> {
  return { read, message: readMessage(read), scanningOff: reply.kind === "refused" && reply.refused === "scanning-off" };
}

function analyticsFileRead(reply: ExtractReply, section: AnalyticsSection, at: Date): FileRead<AnalyticsReading> {
  if (reply.kind !== "rows") return failedRead(reply);
  if (section === "RC" && reply.showsPassageTypes !== true) return { status: "rejected", message: NOT_PASSAGE_PAGE };
  const rows = reply.rows.filter((row) => sectionOf(row) === section);
  return section === "LR" && rows.length === 0 ? { status: "no-rows" } : { status: "read", value: { rows, at: at.toISOString() } };
}

export function settleAnalyticsRead(reply: ExtractReply, section: AnalyticsSection, at: Date): SettledRead<AnalyticsReading> {
  return settled(analyticsFileRead(reply, section, at), reply);
}

export function settleSectionRead(reply: SectionReply): SettledRead<SectionReading> {
  return settled(reply.kind === "reading" ? { status: "read", value: reply.reading } : failedRead(reply), reply);
}

const wrongType = (message: string): SettledRead<never> => ({ read: { status: "rejected", message }, message, scanningOff: false });

export async function readScreenshot(file: File, slot: AnalyticsSection, use?: ScanUse): Promise<SettledRead<AnalyticsReading>>;
export async function readScreenshot(file: File, slot: ScreenshotSlot, use?: ScanUse): Promise<SettledRead<AnalyticsReading> | SettledRead<SectionReading>>;
export async function readScreenshot(file: File, slot: ScreenshotSlot, use: ScanUse = "student") {
  const rejection = checkScreenshotType(file);
  if (rejection) return wrongType(rejection.message);
  if (slot === "section") return settleSectionRead(await extractPracticeTestScreenshot(file, use));
  return settleAnalyticsRead(await extractScreenshot(file, slot, use), slot, new Date());
}
