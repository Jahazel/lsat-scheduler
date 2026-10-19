export const SCREENSHOT_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type ScreenshotMediaType = (typeof SCREENSHOT_MEDIA_TYPES)[number];

const MAX_SCREENSHOT_MB = 4;
export const MAX_SCREENSHOT_BYTES = MAX_SCREENSHOT_MB * 1024 * 1024;
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

export function mislabeledTypeRejection(name: string): ScreenshotRejection {
  return { reason: "wrong-type", message: `${name} is not a PNG, JPG, or WEBP image. Choose a PNG, JPG, or WEBP screenshot.` };
}

function wrongTypeRejection({ name, type }: ScreenshotFile): ScreenshotRejection {
  const label = (name.includes(".") ? name.split(".").pop() : "") || type.split("/").pop();
  if (!label) return mislabeledTypeRejection(name);
  return { reason: "wrong-type", message: `${name} is a ${label.toUpperCase()}. Choose a PNG, JPG, or WEBP screenshot.` };
}

function megabytesRoundedUp(bytes: number) {
  return (Math.ceil((bytes / (1024 * 1024)) * 10) / 10).toFixed(1);
}

export function checkScreenshot(file: ScreenshotFile): ScreenshotRejection | null {
  if (!isScreenshotMediaType(file.type)) return wrongTypeRejection(file);
  if (file.size > MAX_SCREENSHOT_BYTES) {
    return { reason: "too-large", message: `That file is ${megabytesRoundedUp(file.size)} MB. Choose one that is ${MAX_SCREENSHOT_MB} MB or less.` };
  }
  return null;
}

export function sniffScreenshotType(bytes: Uint8Array): ScreenshotMediaType | null {
  const startsWith = (signature: number[], offset = 0) => signature.every((byte, i) => bytes[offset + i] === byte);
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}
