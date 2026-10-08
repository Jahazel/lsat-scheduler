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

function imageRequest() {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=",
    "base64",
  );
  const form = new FormData();
  form.set("image", new File([png], "analytics.png", { type: "image/png" }));
  return new NextRequest("http://localhost/api/analytics/extract", {
    method: "POST",
    body: form,
  });
}

describe("POST /api/analytics/extract", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    mocks.createMessage.mockResolvedValue({ content: [] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

  it("returns extracted analytics rows when an Anthropic key is set", async () => {
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
});
