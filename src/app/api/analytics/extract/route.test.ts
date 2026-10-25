import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { fixture, png as pngOf, screenshotRequest } from "@/lib/screenshotFixtures/files";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  constructClient: vi.fn(),
  createMessage: vi.fn(),
  extractor: vi.fn(),
  takeScanPlace: vi.fn(),
  freeScanPlace: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/scanPlaces", () => ({ takeScanPlace: mocks.takeScanPlace, freeScanPlace: mocks.freeScanPlace }));
vi.mock("@/lib/screenshotExtractor", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/screenshotExtractor")>();
  return {
    ...original,
    extractAnalyticsRows: (...args: Parameters<typeof original.extractAnalyticsRows>) => {
      mocks.extractor(...args);
      return original.extractAnalyticsRows(...args);
    },
  };
});

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    static APIConnectionTimeoutError = class extends Error {};

    messages = { create: mocks.createMessage };

    constructor(options?: { apiKey?: string }) {
      mocks.constructClient(options);
    }
  },
}));

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=",
  "base64",
);

const URL = "http://localhost/api/analytics/extract";

const replyUsage = { input_tokens: 1000, output_tokens: 100 };

function imageRequest(file = new File([png], "analytics.png", { type: "image/png" }), section: string | null = "LR") {
  return screenshotRequest(URL, section === null ? { image: file } : { image: file, section });
}

function rowsFromAnthropic() {
  mocks.createMessage.mockResolvedValue({
    usage: replyUsage,
    content: [{ type: "tool_use", name: "record_analytics_rows", input: { rows: [{ type: "Strengthen", accuracy: 72 }] } }],
  });
}

describe("POST /api/analytics/extract", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    vi.stubEnv("SCREENSHOT_EXTRACTOR", undefined);
    mocks.auth.mockResolvedValue({ user: { id: "student-account", role: "student" } });
    mocks.createMessage.mockResolvedValue({ usage: replyUsage, content: [] });
    mocks.takeScanPlace.mockImplementation(async (subject: string, kind: string, startedAt: Date) => ({ subject, kind, startedAt }));
    mocks.freeScanPlace.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns the fake extractor's fixed rows without a network call", async () => {
    vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake");
    vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-anthropic-key");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { POST } = await import("./route");
    const response = await POST(await imageRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      rows: [
        { type: "Strengthen", category: "regular", accuracy: 68 },
        { type: "Necessary assumption", category: "regular", accuracy: 74 },
        { type: "Causal reasoning", category: "restricted", isTopPriority: true, priorityTier: "highest" },
        { type: "Link assumption", category: "restricted", isTopPriority: false, priorityTier: "medium" },
        { type: "Conditional reasoning", category: "regular", accuracy: 81 },
      ],
    });
    expect(mocks.constructClient).not.toHaveBeenCalled();
    expect(mocks.createMessage).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the fake extractor's 5 passage types for an RC screenshot", async () => {
    vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake");

    const { POST } = await import("./route");
    const response = await POST(await imageRequest(undefined, "RC"));

    expect(response.status).toBe(200);
    expect((await response.json()).rows.map((row: { type: string; category: string }) => [row.type, row.category])).toEqual([
      ["Law", "passage"],
      ["Comparative", "passage"],
      ["Science", "passage"],
      ["Humanities", "passage"],
      ["Art", "passage"],
    ]);
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });

  it.each([null, "Writing"])("refuses a screenshot whose section is %j", async (section) => {
    vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake");

    const { POST } = await import("./route");
    const response = await POST(await imageRequest(undefined, section));

    expect(response.status).toBe(400);
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });

  it("reads RC passage types from Anthropic for an RC screenshot", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-anthropic-key");
    mocks.createMessage.mockResolvedValue({
      usage: replyUsage,
      content: [{
        type: "tool_use",
        name: "record_analytics_rows",
        input: { rows: [{ type: "Law", accuracy: 58 }, { type: "Art", accuracy: 77 }] },
      }],
    });

    const { POST } = await import("./route");
    const response = await POST(await imageRequest(undefined, "RC"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      rows: [
        { type: "Law", category: "passage", accuracy: 58 },
        { type: "Art", category: "passage", accuracy: 77 },
      ],
    });
    expect(mocks.createMessage.mock.calls[0][0].tools[0].input_schema.properties.rows.items.properties.type.enum)
      .toEqual(["Art", "Humanities", "Science", "Law", "Comparative"]);
  });

  it("returns no rows and the plain failure when Anthropic's reply does not fit the tool's format", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-anthropic-key");
    mocks.createMessage.mockResolvedValue({
      usage: replyUsage,
      content: [{ type: "tool_use", name: "record_analytics_rows", input: { rows: [{ type: "Law", accuracy: 58 }, { type: "Strengthen", accuracy: 70 }] } }],
    });

    const { POST } = await import("./route");
    const response = await POST(await imageRequest(undefined, "RC"));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Couldn't read that screenshot" });
  });

  it.each(["fake-failure", "anthropic"])("returns the plain failure for extractor setting %j without calling Anthropic", async (setting) => {
    vi.stubEnv("SCREENSHOT_EXTRACTOR", setting);
    vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-anthropic-key");

    const { POST } = await import("./route");
    const response = await POST(await imageRequest());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Couldn't read that screenshot" });
    expect(mocks.constructClient).not.toHaveBeenCalled();
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });

  it.each([undefined, ""])("loads with key %j and rejects a screenshot without sending a request", async (apiKey) => {
    vi.stubEnv("ANTHROPIC_API_KEY", apiKey);

    const { POST } = await import("./route");
    expect(mocks.constructClient).not.toHaveBeenCalled();

    const response = await POST(await imageRequest());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Couldn't read that screenshot" });
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });

  it.each([undefined, ""])("returns extracted analytics rows from Anthropic with extractor setting %j and a key", async (setting) => {
    vi.stubEnv("SCREENSHOT_EXTRACTOR", setting);
    vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-anthropic-key");
    mocks.createMessage.mockResolvedValue({
      usage: replyUsage,
      content: [{
        type: "tool_use",
        name: "record_analytics_rows",
        input: {
          rows: [
            { type: "Strengthen", accuracy: 72 },
            { type: "Causal reasoning", priority: "HIGHEST" },
            { type: "Link assumption", priority: "MEDIUM" },
            { type: "Phenomenon-hypothesis (LR)", priority: "LOW" },
            { type: "Conditional reasoning", accuracy: 85 },
          ],
        },
      }],
    });

    const { POST } = await import("./route");
    expect(mocks.constructClient).not.toHaveBeenCalled();

    const response = await POST(await imageRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      rows: [
        { type: "Strengthen", category: "regular", accuracy: 72 },
        { type: "Causal reasoning", category: "restricted", isTopPriority: true, priorityTier: "highest" },
        { type: "Link assumption", category: "restricted", isTopPriority: false, priorityTier: "medium" },
        { type: "Phenomenon-hypothesis (LR)", category: "restricted", isTopPriority: false, priorityTier: "low" },
        { type: "Conditional reasoning", category: "regular", accuracy: 85 },
      ],
    });
    expect(mocks.constructClient).toHaveBeenCalledWith({ apiKey: "synthetic-anthropic-key", maxRetries: 0, timeout: 30_000 });
    expect(mocks.createMessage).toHaveBeenCalledOnce();
    expect(mocks.takeScanPlace).toHaveBeenCalledWith("student-account", "analytics", expect.any(Date));
    expect(mocks.freeScanPlace).toHaveBeenCalledWith(expect.objectContaining({ kind: "analytics" }), 0.0015);
  });

  it("says a read that took over 30 seconds stopped, and frees the running-scan place", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-anthropic-key");
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    mocks.createMessage.mockRejectedValue(new Anthropic.APIConnectionTimeoutError());

    const { POST } = await import("./route");
    const response = await POST(await imageRequest());

    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ error: "Reading took too long and stopped. Try again." });
    expect(mocks.createMessage).toHaveBeenCalledOnce();
    expect(mocks.freeScanPlace).toHaveBeenCalledWith({ subject: "student-account", kind: "analytics", startedAt: expect.any(Date) }, null);
  });

  it.each([
    ["daily-limit", "You've read 10 screenshots today. You can scan again tomorrow, after midnight Central time.", 3_600_000, "3600"],
    ["monthly-limit", "You've read 40 screenshots this month. You can scan again on Nov 1.", 86_400_000, "86400"],
    ["still-reading", "We're still reading your last screenshot. Wait a moment, then try this one.", 1_500, "2"],
    ["site-busy", "Many students are scanning right now. Wait a moment, then try this one.", 90_000, "90"],
  ])("refuses a %s scan with 429 and Retry-After, without running the extractor", async (refused, message, waitMs, retryAfter) => {
    vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake");
    mocks.takeScanPlace.mockImplementation(async (_subject: string, _kind: string, realNow: Date) => ({
      refused, message, retryAt: new Date(realNow.getTime() + waitMs),
    }));

    const { POST } = await import("./route");
    const response = await POST(await imageRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe(retryAfter);
    expect(await response.json()).toEqual({ error: message, reason: refused });
    expect(mocks.extractor).not.toHaveBeenCalled();
    expect(mocks.freeScanPlace).not.toHaveBeenCalled();
  });

  it("refuses a scan while scanning is off with 429 and no Retry-After, without running the extractor", async () => {
    vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake");
    mocks.takeScanPlace.mockResolvedValue({ refused: "scanning-off", message: "Scanning is off right now. Enter your analytics by hand." });

    const { POST } = await import("./route");
    const response = await POST(await imageRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeNull();
    expect(await response.json()).toEqual({ error: "Scanning is off right now. Enter your analytics by hand.", reason: "scanning-off" });
    expect(mocks.extractor).not.toHaveBeenCalled();
  });

  it("keeps a finished read's rows when its running-scan place cannot be freed", async () => {
    vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake");
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.freeScanPlace.mockRejectedValue(new Error("synthetic connection loss"));

    const { POST } = await import("./route");
    const response = await POST(await imageRequest());

    expect(response.status).toBe(200);
    expect((await response.json()).rows).toHaveLength(5);
  });

  it("counts no scan for a screenshot with a wrong section", async () => {
    vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake");

    const { POST } = await import("./route");
    await POST(await imageRequest(undefined, "Writing"));

    expect(mocks.takeScanPlace).not.toHaveBeenCalled();
  });

  it("handles a client creation failure as a plain screenshot error", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-anthropic-key");
    mocks.constructClient.mockImplementation(() => {
      throw new Error("synthetic client configuration failure");
    });

    const { POST } = await import("./route");
    const response = await POST(await imageRequest());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Couldn't read that screenshot" });
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });

  it.each([
    ["anonymous", null],
    ["without a user", { user: undefined }],
  ])("refuses a request whose session is %s before reading the file", async (_case, session) => {
    vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-anthropic-key");
    mocks.auth.mockResolvedValue(session);

    const { POST } = await import("./route");
    const response = await POST(await imageRequest());

    expect(response.status).toBe(401);
    expect(mocks.extractor).not.toHaveBeenCalled();
  });

  describe("checks the file from its bytes before calling Anthropic", () => {
    const WRONG_TYPE = "That file is not a PNG, JPG, or WEBP. Choose a screenshot in one of those types.";
    const take = "Take a screenshot up to 8,000 px on each side.";

    function webpHeaderOnly() {
      const bytes = Buffer.alloc(30);
      bytes.write("RIFF", 0);
      bytes.writeUInt32LE(22, 4);
      bytes.write("WEBPVP8X", 8);
      bytes.writeUInt32LE(10, 16);
      return bytes;
    }

    beforeEach(() => {
      vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-anthropic-key");
      rowsFromAnthropic();
    });

    async function send(bytes: Buffer, name = "analytics.png", type = "image/png") {
      const { POST } = await import("./route");
      return POST(await imageRequest(new File([new Uint8Array(bytes)], name, { type })));
    }

    it.each([
      ["a PDF", Buffer.from("%PDF-1.7"), "study-notes.pdf", "application/pdf"],
      ["a GIF the model could read", Buffer.from("GIF89a\x01\x00\x01\x00"), "loop.gif", "image/gif"],
      ["a PDF labelled as a PNG", Buffer.from("%PDF-1.7"), "renamed.png", "image/png"],
      ["a PNG cut off before its pixels", pngOf(40, 30).subarray(0, 33), "cut.png", "image/png"],
      ["a PNG signature with no header", pngOf(40, 30).subarray(0, 8), "empty.png", "image/png"],
      ["a JPEG cut off before its frame header", fixture("still.jpg").subarray(0, 20), "cut.jpg", "image/jpeg"],
      ["a WebP with no image chunk", Buffer.from("RIFF\x16\x00\x00\x00WEBPJUNK\x0a\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"), "junk.webp", "image/webp"],
      ["a PNG cut off just after its pixel chunk starts", pngOf(40, 30).subarray(0, 41), "cut.png", "image/png"],
      ["a PNG with no end chunk", pngOf(40, 30).subarray(0, -12), "cut.png", "image/png"],
      ["a JPEG with only a frame header", Buffer.from("ffd8ffc000000800010001", "hex"), "header.jpg", "image/jpeg"],
      ["a JPEG cut off before its end marker", fixture("still.jpg").subarray(0, -2), "cut.jpg", "image/jpeg"],
      ["a WebP with only an extended header", webpHeaderOnly(), "header.webp", "image/webp"],
      ["a WebP cut off inside its image", fixture("still-lossless.webp").subarray(0, -10), "cut.webp", "image/webp"],
    ])("refuses %s as the wrong type", async (_case, bytes, name, type) => {
      const response = await send(bytes, name, type);

      expect(response.status).toBe(415);
      expect(await response.json()).toEqual({ error: WRONG_TYPE, reason: "wrong-type" });
      expect(mocks.extractor).not.toHaveBeenCalled();
      expect(mocks.createMessage).not.toHaveBeenCalled();
      expect(mocks.extractor).not.toHaveBeenCalled();
    });

    it.each([
      ["a PNG", pngOf(40, 30), "image/png"],
      ["a JPEG", fixture("still.jpg"), "image/jpeg"],
      ["a lossy WebP", fixture("still-lossy.webp"), "image/webp"],
      ["a lossless WebP", fixture("still-lossless.webp"), "image/webp"],
      ["a PNG at 8,000 px tall", pngOf(1, 8000), "image/png"],
      ["a PNG at 8,000 px wide", pngOf(8000, 1), "image/png"],
      ["a PNG at exactly 25 megapixels", pngOf(8000, 3125), "image/png"],
    ])("sends %s to Anthropic with the type found in its bytes", async (_case, bytes, mediaType) => {
      const response = await send(bytes, "analytics", "");

      expect(response.status).toBe(200);
      expect(mocks.extractor).toHaveBeenCalledOnce();
      expect(mocks.createMessage).toHaveBeenCalledOnce();
      expect(mocks.createMessage.mock.calls[0][0].messages[0].content[0].source.media_type).toBe(mediaType);
    });

    it.each([
      ["8,001 px tall", pngOf(1, 8001), `That image is 8,001 px tall. ${take}`],
      ["8,001 px wide", pngOf(8001, 1), `That image is 8,001 px wide. ${take}`],
      ["a JPEG 8,001 px wide", fixture("wide.jpg"), `That image is 8,001 px wide. ${take}`],
      ["one row over 25 megapixels", pngOf(8000, 3126), "That image is 25.1 megapixels. Take a screenshot up to 25 megapixels."],
    ])("refuses an image %s from its header", async (_case, bytes, error) => {
      const response = await send(bytes);

      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ error, reason: "image-too-large" });
      expect(mocks.createMessage).not.toHaveBeenCalled();
      expect(mocks.extractor).not.toHaveBeenCalled();
    });

    it.each([
      ["an animated PNG", pngOf(40, 30, { animated: true }), "loop.png"],
      ["an animated WebP", fixture("animated.webp"), "loop.webp"],
    ])("refuses %s", async (_case, bytes, name) => {
      const response = await send(bytes, name);

      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ error: "That image is animated. Choose a still screenshot.", reason: "animated" });
      expect(mocks.createMessage).not.toHaveBeenCalled();
      expect(mocks.extractor).not.toHaveBeenCalled();
    });

    it("refuses a PNG over 4 MB", async () => {
      const response = await send(Buffer.concat([png, Buffer.alloc(4 * 1024 * 1024)]));

      expect(response.status).toBe(413);
      expect(await response.json()).toEqual({ error: "That file is 4.1 MB. Choose one that is 4 MB or less.", reason: "too-large" });
      expect(mocks.constructClient).not.toHaveBeenCalled();
      expect(mocks.createMessage).not.toHaveBeenCalled();
      expect(mocks.extractor).not.toHaveBeenCalled();
    });

    it("accepts a PNG of exactly 4 MB", async () => {
      const response = await send(Buffer.concat([png, Buffer.alloc(4 * 1024 * 1024 - png.length)]));

      expect(response.status).toBe(200);
      expect(mocks.createMessage).toHaveBeenCalledOnce();
    });
  });

  describe("refuses a request body over 4.5 MB before reading all of it", () => {
    const MAX_REQUEST_BYTES = 4.5 * 1024 * 1024;

    function streamedRequest(headers: Record<string, string>, chunks: number) {
      let sent = 0;
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (sent === chunks) return controller.close();
          sent += 1;
          controller.enqueue(new Uint8Array(1024 * 1024));
        },
      });
      const request = new NextRequest(URL, {
        method: "POST", body, duplex: "half", headers: { "content-type": "multipart/form-data; boundary=x", ...headers },
      } as ConstructorParameters<typeof NextRequest>[1]);
      return { request, chunksSent: () => sent };
    }

    it("refuses a declared length over 4.5 MB without reading the body", async () => {
      const { request, chunksSent } = streamedRequest({ "content-length": String(MAX_REQUEST_BYTES + 1) }, 6);
      const { POST } = await import("./route");
      const response = await POST(request);

      expect(response.status).toBe(413);
      expect((await response.json()).reason).toBe("too-large");
      expect(chunksSent()).toBeLessThanOrEqual(1);
      expect(mocks.createMessage).not.toHaveBeenCalled();
      expect(mocks.extractor).not.toHaveBeenCalled();
    });

    it("refuses a request without a length", async () => {
      const { request, chunksSent } = streamedRequest({}, 6);
      const { POST } = await import("./route");
      const response = await POST(request);

      expect(response.status).toBe(411);
      expect(chunksSent()).toBeLessThanOrEqual(1);
      expect(mocks.createMessage).not.toHaveBeenCalled();
      expect(mocks.extractor).not.toHaveBeenCalled();
    });

    it("stops reading a body that grows past 4.5 MB under a smaller declared length", async () => {
      const { request, chunksSent } = streamedRequest({ "content-length": "1000" }, 100);
      const { POST } = await import("./route");
      const response = await POST(request);

      expect(response.status).toBe(413);
      expect(chunksSent()).toBeLessThan(10);
      expect(mocks.createMessage).not.toHaveBeenCalled();
      expect(mocks.extractor).not.toHaveBeenCalled();
    });

    it("accepts a request body of exactly 4.5 MB", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-anthropic-key");
      rowsFromAnthropic();
      const image = new File([png], "analytics.png", { type: "image/png" });
      const padded = (note: string) => screenshotRequest(URL, { image, section: "LR", note });
      const unpadded = Number((await padded("")).headers.get("content-length"));
      const request = await padded("x".repeat(MAX_REQUEST_BYTES - unpadded));
      expect(Number(request.headers.get("content-length"))).toBe(MAX_REQUEST_BYTES);

      const { POST } = await import("./route");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mocks.createMessage).toHaveBeenCalledOnce();
    });
  });
});
