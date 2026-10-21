import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  constructClient: vi.fn(),
  createMessage: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mocks.createMessage };

    constructor(options?: { apiKey?: string }) {
      mocks.constructClient(options);
    }
  },
}));

const fixture = (name: string) => readFileSync(path.resolve(__dirname, "../../../../lib/practiceTestFixtures", name));
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=",
  "base64",
);

function imageRequest(file: File | null = new File([png], "section.png", { type: "image/png" })) {
  const form = new FormData();
  if (file) form.set("image", file);
  return new NextRequest("http://localhost/api/practice-test/extract", { method: "POST", body: form });
}

describe("POST /api/practice-test/extract", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "student-account", role: "student" } });
    vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads a sample section screenshot with the fake extractor", async () => {
    const { POST } = await import("./route");
    const response = await POST(imageRequest(new File([fixture("pt158-s1.png")], "pt158-s1.png", { type: "image/png" })));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      reading: { page: "section_review", prepTest: 158, section: 1, kind: "RC", score: -9, reachesEnd: true },
    });
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });

  it("says an unknown screenshot shows another page", async () => {
    const { POST } = await import("./route");
    const response = await POST(imageRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reading: { page: "other" } });
  });

  it("refuses a request from someone who is not signed in", async () => {
    mocks.auth.mockResolvedValue(null);
    const { POST } = await import("./route");
    const response = await POST(imageRequest());

    expect(response.status).toBe(401);
  });

  it("refuses a request without an image", async () => {
    const { POST } = await import("./route");
    const response = await POST(imageRequest(null));

    expect(response.status).toBe(400);
  });

  it("refuses a file that is not a screenshot", async () => {
    const { POST } = await import("./route");
    const response = await POST(imageRequest(new File(["%PDF-1.7"], "review.pdf", { type: "application/pdf" })));

    expect(response.status).toBe(415);
    expect(await response.json()).toEqual({
      error: "review.pdf is a PDF. Choose a PNG, JPG, or WEBP screenshot.",
      reason: "wrong-type",
    });
  });

  it("refuses a screenshot over the size limit", async () => {
    const { POST } = await import("./route");
    const large = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "tall.png", { type: "image/png" });
    const response = await POST(imageRequest(large));

    expect(response.status).toBe(413);
    expect((await response.json()).reason).toBe("too-large");
  });

  it("returns the plain failure when the extractor fails", async () => {
    vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake-failure");
    const { POST } = await import("./route");
    const response = await POST(imageRequest());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Couldn't read that screenshot" });
  });
});
