import { sectionOf } from "./analyticsReview";
import type { SectionReading } from "./practiceTestResult";
import { stopsLaterScans, type ExtractReply, type SectionReply } from "./screenshotUpload";
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

export type QueuedFile<M, S extends keyof M = keyof M> = { [K in S]: { id: number; slot: K; file: File; read: FileRead<M[K]> } }[S];

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
  const added = { id: queue.nextId, slot, file, read: { status } } as QueuedFile<M>;
  const files = replacing === undefined
    ? [...queue.files, added]
    : queue.files.map((entry) => (entry.id === replacing ? added : entry));
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

export function analyticsRead(reply: ExtractReply, section: AnalyticsSection, at: Date): FileRead<AnalyticsReading> {
  if (reply.kind !== "rows") return failedRead(reply);
  if (section === "RC" && reply.showsPassageTypes !== true) return { status: "rejected", message: NOT_PASSAGE_PAGE };
  const rows = reply.rows.filter((row) => sectionOf(row) === section);
  return section === "LR" && rows.length === 0 ? { status: "no-rows" } : { status: "read", value: { rows, at: at.toISOString() } };
}

export function sectionRead(reply: SectionReply): FileRead<SectionReading> {
  return reply.kind === "reading" ? { status: "read", value: reply.reading } : failedRead(reply);
}
