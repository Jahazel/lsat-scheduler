import type { AnalyticsExtractedRow } from "./types";

export const SCREENSHOT_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type ScreenshotMediaType = (typeof SCREENSHOT_MEDIA_TYPES)[number];

const MAX_SCREENSHOT_MB = 4;
const MAX_SCREENSHOT_BYTES = MAX_SCREENSHOT_MB * 1024 * 1024;
export const SCREENSHOT_LIMITS = `PNG, JPG, or WEBP · ${MAX_SCREENSHOT_MB} MB or less`;

export type ScreenshotRejection = { reason: "wrong-type" | "too-large"; message: string };

interface ScreenshotFile {
  name: string;
  type: string;
  size: number;
}

function isScreenshotMediaType(type: string): type is ScreenshotMediaType {
  return (SCREENSHOT_MEDIA_TYPES as readonly string[]).includes(type);
}

const CHOOSE_ANOTHER = "Choose a PNG, JPG, or WEBP screenshot.";
const SCREENSHOT_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];

function wrongTypeRejection(name: string): ScreenshotRejection {
  const extension = name.includes(".") ? name.split(".").pop()?.toLowerCase() : undefined;
  const message = extension && !SCREENSHOT_EXTENSIONS.includes(extension)
    ? `${name} is a ${extension.toUpperCase()}. ${CHOOSE_ANOTHER}`
    : `${name} is not a PNG, JPG, or WEBP image. ${CHOOSE_ANOTHER}`;
  return { reason: "wrong-type", message };
}

function megabytesRoundedUp(bytes: number) {
  return (Math.ceil((bytes / (1024 * 1024)) * 10) / 10).toFixed(1);
}

function tooLargeRejection(size: number): ScreenshotRejection | null {
  if (size <= MAX_SCREENSHOT_BYTES) return null;
  return { reason: "too-large", message: `That file is ${megabytesRoundedUp(size)} MB. Choose one that is ${MAX_SCREENSHOT_MB} MB or less.` };
}

export function checkScreenshot(file: ScreenshotFile): ScreenshotRejection | null {
  if (!isScreenshotMediaType(file.type)) return wrongTypeRejection(file.name);
  return tooLargeRejection(file.size);
}

export async function readScreenshot(file: File): Promise<{ bytes: Buffer; mediaType: ScreenshotMediaType } | ScreenshotRejection> {
  const tooLarge = tooLargeRejection(file.size);
  if (tooLarge) return tooLarge;
  const bytes = Buffer.from(await file.arrayBuffer());
  const mediaType = sniffScreenshotType(bytes);
  return mediaType ? { bytes, mediaType } : wrongTypeRejection(file.name);
}

function sniffScreenshotType(bytes: Uint8Array): ScreenshotMediaType | null {
  const startsWith = (signature: number[], offset = 0) => signature.every((byte, i) => bytes[offset + i] === byte);
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

export type ExtractReply =
  | { kind: "rows"; rows: AnalyticsExtractedRow[] }
  | { kind: "rejected"; message: string }
  | { kind: "cannot-read" }
  | { kind: "connection-lost" };

export async function extractScreenshot(file: File): Promise<ExtractReply> {
  const formData = new FormData();
  formData.append("image", file);
  try {
    const res = await fetch("/api/analytics/extract", { method: "POST", body: formData });
    if (res.status === 413 || res.status === 415) return { kind: "rejected", message: (await res.json()).error };
    if (res.status === 502) return { kind: "cannot-read" };
    if (!res.ok) return { kind: "connection-lost" };
    return { kind: "rows", rows: (await res.json()).rows };
  } catch {
    return { kind: "connection-lost" };
  }
}
