import type { SectionReading } from "./practiceTestResult";
import type { ScanRefusal } from "./scanPlaces";
import type { AnalyticsExtractedRow, AnalyticsSection } from "./types";

export const SCREENSHOT_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type ScreenshotMediaType = (typeof SCREENSHOT_MEDIA_TYPES)[number];

export const MAX_SCREENSHOT_MB = 4;
export const MAX_SCREENSHOT_BYTES = MAX_SCREENSHOT_MB * 1024 * 1024;
export const SCREENSHOT_LIMITS = `PNG, JPG, or WEBP · ${MAX_SCREENSHOT_MB} MB or less`;
const MAX_UPLOAD_SIDE = 1568;
export const SCANNING_OFF = "Scanning is off right now. Enter your analytics by hand.";

export type ScreenshotRejection = { reason: "wrong-type" | "too-large" | "image-too-large" | "animated"; message: string };

function isScreenshotMediaType(type: string): type is ScreenshotMediaType {
  return (SCREENSHOT_MEDIA_TYPES as readonly string[]).includes(type);
}

export const WRONG_TYPE: ScreenshotRejection = {
  reason: "wrong-type",
  message: "That file is not a PNG, JPG, or WEBP. Choose a screenshot in one of those types.",
};

function megabytesRoundedUp(bytes: number) {
  return (Math.ceil((bytes / (1024 * 1024)) * 10) / 10).toFixed(1);
}

export function tooLargeRejection(size: number): ScreenshotRejection {
  return { reason: "too-large", message: `That file is ${megabytesRoundedUp(size)} MB. Choose one that is ${MAX_SCREENSHOT_MB} MB or less.` };
}

export function checkScreenshotType(file: { type: string }): ScreenshotRejection | null {
  return isScreenshotMediaType(file.type) ? null : WRONG_TYPE;
}

export function shrunkSize(width: number, height: number) {
  const scale = MAX_UPLOAD_SIDE / Math.max(width, height);
  return scale >= 1 ? null : { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

async function shrinkForUpload(file: File): Promise<File> {
  let image: ImageBitmap;
  try {
    image = await createImageBitmap(file);
  } catch {
    return file;
  }
  const size = shrunkSize(image.width, image.height);
  if (!size) {
    image.close();
    return file;
  }
  try {
    const canvas = new OffscreenCanvas(size.width, size.height);
    canvas.getContext("2d")?.drawImage(image, 0, 0, size.width, size.height);
    const blob = await canvas.convertToBlob({ type: file.type, quality: 0.92 });
    return new File([blob], file.name, { type: blob.type });
  } catch {
    return file;
  } finally {
    image.close();
  }
}

export type ScanRefused = { kind: "refused"; refused: ScanRefusal["refused"]; message: string };

type ScreenshotFailure =
  | { kind: "rejected"; message: string }
  | ScanRefused
  | { kind: "cannot-read" }
  | { kind: "timed-out" }
  | { kind: "signed-out" }
  | { kind: "connection-lost" };

export type ExtractReply = { kind: "rows"; rows: AnalyticsExtractedRow[]; showsPassageTypes?: boolean } | ScreenshotFailure;
export type SectionReply = { kind: "reading"; reading: SectionReading } | ScreenshotFailure;

const REFUSED_FILE_STATUSES = [413, 415, 422];

async function postScreenshot(url: string, file: File, fields: Record<string, string> = {}): Promise<{ kind: "ok"; body: unknown } | ScreenshotFailure> {
  const upload = await shrinkForUpload(file);
  if (upload.size > MAX_SCREENSHOT_BYTES) return { kind: "rejected", message: tooLargeRejection(upload.size).message };
  const formData = new FormData();
  formData.append("image", upload);
  for (const [name, value] of Object.entries(fields)) formData.append(name, value);
  try {
    const res = await fetch(url, { method: "POST", body: formData });
    if (REFUSED_FILE_STATUSES.includes(res.status)) return { kind: "rejected", message: (await res.json()).error };
    if (res.status === 429) {
      const { error, reason } = await res.json();
      return { kind: "refused", refused: reason, message: error };
    }
    if (res.status === 401) return { kind: "signed-out" };
    if (res.status === 502) return { kind: "cannot-read" };
    if (res.status === 504) return { kind: "timed-out" };
    if (!res.ok) return { kind: "connection-lost" };
    return { kind: "ok", body: await res.json() };
  } catch {
    return { kind: "connection-lost" };
  }
}

export async function extractScreenshot(file: File, section: AnalyticsSection): Promise<ExtractReply> {
  const reply = await postScreenshot("/api/analytics/extract", file, { section });
  if (reply.kind !== "ok") return reply;
  const { rows, showsPassageTypes } = reply.body as { rows: AnalyticsExtractedRow[]; showsPassageTypes?: boolean };
  return { kind: "rows", rows, showsPassageTypes };
}

export async function extractPracticeTestScreenshot(file: File): Promise<SectionReply> {
  const reply = await postScreenshot("/api/practice-test/extract", file);
  return reply.kind === "ok" ? { kind: "reading", reading: (reply.body as { reading: SectionReading }).reading } : reply;
}

export const CANNOT_READ = "Couldn't read that screenshot. Try again or a clearer image.";
export const TOOK_TOO_LONG = "Reading took too long and stopped. Try again.";

export const stopsLaterScans = ({ refused }: ScanRefused) => refused === "scanning-off" || refused === "daily-limit" || refused === "monthly-limit";
