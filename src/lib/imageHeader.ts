import type { ScreenshotMediaType } from "./screenshotUpload";

export interface ImageHeader {
  mediaType: ScreenshotMediaType;
  width: number;
  height: number;
  animated: boolean;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const JPEG_FRAME_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

export function readImageHeader(bytes: Uint8Array): ImageHeader | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const startsWith = (signature: number[], offset = 0) => signature.every((byte, i) => bytes[offset + i] === byte);
  const text = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  const header = (mediaType: ScreenshotMediaType, width: number, height: number, animated: boolean) =>
    width > 0 && height > 0 ? { mediaType, width, height, animated } : null;

  if (startsWith(PNG_SIGNATURE)) {
    if (bytes.length < 33 || view.getUint32(8) !== 13 || text(12) !== "IHDR") return null;
    let animated = false;
    for (let offset = 8; offset + 8 <= bytes.length; offset += 12 + view.getUint32(offset)) {
      const type = text(offset + 4);
      if (type === "acTL") animated = true;
      if (type === "IDAT") return header("image/png", view.getUint32(16), view.getUint32(20), animated);
    }
    return null;
  }

  if (startsWith(JPEG_SIGNATURE)) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1];
      if (marker === 0xff) {
        offset += 1;
      } else if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
        offset += 2;
      } else if (JPEG_FRAME_MARKERS.has(marker)) {
        if (offset + 9 > bytes.length) return null;
        return header("image/jpeg", view.getUint16(offset + 7), view.getUint16(offset + 5), false);
      } else if (marker === 0xd9 || marker === 0xda) {
        return null;
      } else {
        offset += 2 + view.getUint16(offset + 2);
      }
    }
    return null;
  }

  if (text(0) === "RIFF" && text(8) === "WEBP" && bytes.length >= 30) {
    switch (text(12)) {
      case "VP8 ":
        if (!startsWith([0x9d, 0x01, 0x2a], 23)) return null;
        return header("image/webp", view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff, false);
      case "VP8L": {
        if (bytes[20] !== 0x2f) return null;
        const bits = view.getUint32(21, true);
        return header("image/webp", (bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1, false);
      }
      case "VP8X": {
        const uint24 = (offset: number) => bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
        return header("image/webp", uint24(24) + 1, uint24(27) + 1, (bytes[20] & 0x02) !== 0);
      }
    }
  }
  return null;
}
