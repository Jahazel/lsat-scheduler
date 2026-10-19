import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  constructClient: vi.fn(),
  createMessage: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
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

function imageRequest(file = new File([png], "analytics.png", { type: "image/png" })) {
  const form = new FormData();
  form.set("image", file);
  return new NextRequest("http://localhost/api/analytics/extract", {
    method: "POST",
    body: form,
  });
}

describe("POST /api/analytics/extract", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    vi.stubEnv("SCREENSHOT_EXTRACTOR", undefined);
    mocks.createMessage.mockResolvedValue({ content: [] });
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
    const response = await POST(imageRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      rows: [
        { type: "Strengthen", category: "regular", accuracy: 68 },
        { type: "Necessary assumption", category: "regular", accuracy: 74 },
        { type: "Causal reasoning", category: "restricted", isTopPriority: true },
        { type: "Conditional reasoning", category: "regular", accuracy: 81 },
      ],
    });
    expect(mocks.constructClient).not.toHaveBeenCalled();
    expect(mocks.createMessage).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each(["fake-failure", "anthropic"])("returns the plain failure for extractor setting %j without calling Anthropic", async (setting) => {
    vi.stubEnv("SCREENSHOT_EXTRACTOR", setting);
    vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-anthropic-key");

    const { POST } = await import("./route");
    const response = await POST(imageRequest());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Couldn't read that screenshot" });
    expect(mocks.constructClient).not.toHaveBeenCalled();
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });

  it.each([undefined, ""])("loads with key %j and rejects a screenshot without sending a request", async (apiKey) => {
    vi.stubEnv("ANTHROPIC_API_KEY", apiKey);

    const { POST } = await import("./route");
    expect(mocks.constructClient).not.toHaveBeenCalled();

    const response = await POST(imageRequest());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Couldn't read that screenshot" });
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });

  it.each([undefined, ""])("returns extracted analytics rows from Anthropic with extractor setting %j and a key", async (setting) => {
    vi.stubEnv("SCREENSHOT_EXTRACTOR", setting);
    vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-anthropic-key");
    mocks.createMessage.mockResolvedValue({
      content: [{
        type: "tool_use",
        input: {
          rows: [
            { type: "Strengthen", accuracy: 72 },
            { type: "Causal reasoning", isTopPriority: true },
            { type: "Conditional reasoning", accuracy: 85 },
          ],
        },
      }],
    });

    const { POST } = await import("./route");
    expect(mocks.constructClient).not.toHaveBeenCalled();

    const response = await POST(imageRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      rows: [
        { type: "Strengthen", category: "regular", accuracy: 72 },
        { type: "Causal reasoning", category: "restricted", isTopPriority: true },
        { type: "Conditional reasoning", category: "regular", accuracy: 85 },
      ],
    });
    expect(mocks.constructClient).toHaveBeenCalledWith({ apiKey: "synthetic-anthropic-key" });
    expect(mocks.createMessage).toHaveBeenCalledOnce();
  });

  it("handles a client creation failure as a plain screenshot error", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-anthropic-key");
    mocks.constructClient.mockImplementation(() => {
      throw new Error("synthetic client configuration failure");
    });

    const { POST } = await import("./route");
    const response = await POST(imageRequest());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Couldn't read that screenshot" });
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });

  describe("rejects a file outside the screenshot limits before calling Anthropic", () => {
    beforeEach(() => {
      vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-anthropic-key");
    });

    it.each([
      ["a PDF", new File(["%PDF-1.7"], "study-notes.pdf", { type: "application/pdf" }), "study-notes.pdf is a PDF. Choose a PNG, JPG, or WEBP screenshot."],
      ["a GIF the model could read", new File(["GIF89a"], "loop.gif", { type: "image/gif" }), "loop.gif is a GIF. Choose a PNG, JPG, or WEBP screenshot."],
      ["a PDF labelled as a PNG", new File(["%PDF-1.7"], "renamed.png", { type: "image/png" }), "renamed.png is not a PNG, JPG, or WEBP image. Choose a PNG, JPG, or WEBP screenshot."],
    ])("returns the wrong-type error for %s", async (_label, file, error) => {
      const { POST } = await import("./route");
      const response = await POST(imageRequest(file));

      expect(response.status).toBe(415);
      expect(await response.json()).toEqual({ error, reason: "wrong-type" });
      expect(mocks.constructClient).not.toHaveBeenCalled();
      expect(mocks.createMessage).not.toHaveBeenCalled();
    });

    it("returns the too-large error for a PNG over 4 MB", async () => {
      const oversized = Buffer.concat([png, Buffer.alloc(4 * 1024 * 1024)]);
      const { POST } = await import("./route");
      const response = await POST(imageRequest(new File([oversized], "analytics.png", { type: "image/png" })));

      expect(response.status).toBe(413);
      expect(await response.json()).toEqual({ error: "That file is 4.1 MB. Choose one that is 4 MB or less.", reason: "too-large" });
      expect(mocks.constructClient).not.toHaveBeenCalled();
      expect(mocks.createMessage).not.toHaveBeenCalled();
    });

    it("accepts PNG bytes whatever type the browser claims", async () => {
      const { POST } = await import("./route");
      const response = await POST(imageRequest(new File([png], "analytics", { type: "" })));

      expect(response.status).toBe(200);
      expect(mocks.createMessage.mock.calls[0][0].messages[0].content[0].source.media_type).toBe("image/png");
    });

    it("accepts a PNG of exactly 4 MB", async () => {
      const atLimit = Buffer.concat([png, Buffer.alloc(4 * 1024 * 1024 - png.length)]);
      const { POST } = await import("./route");
      const response = await POST(imageRequest(new File([atLimit], "analytics.png", { type: "image/png" })));

      expect(response.status).toBe(200);
      expect(mocks.createMessage).toHaveBeenCalledOnce();
    });
  });
});
