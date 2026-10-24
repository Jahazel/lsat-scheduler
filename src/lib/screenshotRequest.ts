import { NextResponse } from "next/server";
import { readImageHeader } from "./imageHeader";
import {
  MAX_SCREENSHOT_BYTES, WRONG_TYPE, tooLargeRejection, type ScreenshotMediaType, type ScreenshotRejection,
} from "./screenshotUpload";

const MAX_REQUEST_BYTES = 4.5 * 1024 * 1024;
const MAX_SIDE = 8000;
const MAX_PIXELS = 25_000_000;

const STATUS: Record<ScreenshotRejection["reason"], number> = {
  "too-large": 413,
  "wrong-type": 415,
  "image-too-large": 422,
  animated: 422,
};

interface Screenshot {
  bytes: Buffer;
  mediaType: ScreenshotMediaType;
}

type Refusal = { refusal: NextResponse };

const refused = ({ reason, message }: ScreenshotRejection): Refusal =>
  ({ refusal: NextResponse.json({ error: message, reason }, { status: STATUS[reason] }) });

const noImage = (): Refusal => ({ refusal: NextResponse.json({ error: "No image provided" }, { status: 400 }) });

async function readLimitedBody(request: Request): Promise<Buffer | Refusal> {
  const declared = request.headers.get("content-length");
  if (declared === null || !/^\d+$/.test(declared)) {
    return { refusal: NextResponse.json({ error: "Send the screenshot with its length" }, { status: 411 }) };
  }
  if (Number(declared) > MAX_REQUEST_BYTES) return refused(tooLargeRejection(Number(declared)));
  if (!request.body) return Buffer.alloc(0);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    size += chunk.value.byteLength;
    if (size > MAX_REQUEST_BYTES) {
      await reader.cancel();
      return refused(tooLargeRejection(size));
    }
    chunks.push(chunk.value);
  }
  return Buffer.concat(chunks);
}

function imageTooLarge(width: number, height: number): ScreenshotRejection | null {
  const take = `Take a screenshot up to ${MAX_SIDE.toLocaleString("en-US")} px on each side.`;
  if (height > MAX_SIDE) return { reason: "image-too-large", message: `That image is ${height.toLocaleString("en-US")} px tall. ${take}` };
  if (width > MAX_SIDE) return { reason: "image-too-large", message: `That image is ${width.toLocaleString("en-US")} px wide. ${take}` };
  if (width * height > MAX_PIXELS) {
    return {
      reason: "image-too-large",
      message: `That image is ${Math.ceil((width * height) / 100_000) / 10} megapixels. Take a screenshot up to ${MAX_PIXELS / 1_000_000} megapixels.`,
    };
  }
  return null;
}

async function checkScreenshotFile(file: File): Promise<Screenshot | ScreenshotRejection> {
  if (file.size > MAX_SCREENSHOT_BYTES) return tooLargeRejection(file.size);
  const bytes = Buffer.from(await file.arrayBuffer());
  const header = readImageHeader(bytes);
  if (!header) return WRONG_TYPE;
  const tooLarge = imageTooLarge(header.width, header.height);
  if (tooLarge) return tooLarge;
  if (header.animated) return { reason: "animated", message: "That image is animated. Choose a still screenshot." };
  return { bytes, mediaType: header.mediaType };
}

export async function readScreenshotForm(request: Request): Promise<{ form: FormData; screenshot: Screenshot } | Refusal> {
  const body = await readLimitedBody(request);
  if ("refusal" in body) return body;

  let form: FormData;
  try {
    form = await new Response(new Uint8Array(body), { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
  } catch {
    return noImage();
  }
  const file = form.get("image");
  if (!(file instanceof File)) return noImage();

  const screenshot = await checkScreenshotFile(file);
  return "reason" in screenshot ? refused(screenshot) : { form, screenshot };
}
