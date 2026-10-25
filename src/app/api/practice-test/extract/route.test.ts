import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixture as screenshotFixture, png as pngOf, screenshotRequest } from "@/lib/screenshotFixtures/files";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  extractor: vi.fn(),
  takeScanPlace: vi.fn(),
  freeScanPlace: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/scanPlaces", () => ({ takeScanPlace: mocks.takeScanPlace, freeScanPlace: mocks.freeScanPlace }));
vi.mock("@/lib/screenshotExtractor", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/screenshotExtractor")>();
  mocks.extractor.mockImplementation(original.extractPracticeTestSection);
  return { ...original, extractPracticeTestSection: mocks.extractor };
});

const fixture = (name: string) => readFileSync(path.resolve(__dirname, "../../../../lib/practiceTestFixtures", name));

function imageRequest(file: File | null = new File([new Uint8Array(pngOf(40, 30))], "section.png", { type: "image/png" })) {
  return screenshotRequest("http://localhost/api/practice-test/extract", file ? { image: file } : {});
}

describe("POST /api/practice-test/extract", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.extractor.mockClear();
    mocks.freeScanPlace.mockReset().mockResolvedValue(undefined);
    mocks.takeScanPlace.mockReset().mockImplementation(async (subject: string, startedAt: Date) => ({ subject, startedAt }));
    mocks.auth.mockResolvedValue({ user: { id: "student-account", role: "student" } });
    vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads a sample section screenshot with the fake extractor", async () => {
    const { POST } = await import("./route");
    const response = await POST(await imageRequest(new File([fixture("pt158-s1.png")], "pt158-s1.png", { type: "image/png" })));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      reading: { page: "section_review", prepTest: 158, section: 1, kind: "RC", score: -9, reachesEnd: true },
    });
    expect(mocks.extractor).toHaveBeenCalledOnce();
  });

  it("says an unknown screenshot shows another page", async () => {
    const { POST } = await import("./route");
    const response = await POST(await imageRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reading: { page: "other" } });
  });

  it("refuses a request from someone who is not signed in", async () => {
    mocks.auth.mockResolvedValue(null);
    const { POST } = await import("./route");
    const response = await POST(await imageRequest());

    expect(response.status).toBe(401);
    expect(mocks.extractor).not.toHaveBeenCalled();
  });

  it("refuses a request without an image", async () => {
    const { POST } = await import("./route");
    const response = await POST(await imageRequest(null));

    expect(response.status).toBe(400);
    expect(mocks.extractor).not.toHaveBeenCalled();
  });

  it.each([
    ["a PDF", new File(["%PDF-1.7"], "review.pdf", { type: "application/pdf" }), 415, "wrong-type"],
    ["a GIF", new File(["GIF89a"], "review.gif", { type: "image/gif" }), 415, "wrong-type"],
    ["a broken PNG", new File([new Uint8Array(pngOf(40, 30).subarray(0, 40))], "cut.png", { type: "image/png" }), 415, "wrong-type"],
    ["a file over 4 MB", new File([new Uint8Array(4 * 1024 * 1024 + 1)], "tall.png", { type: "image/png" }), 413, "too-large"],
    ["an image 8,001 px tall", new File([new Uint8Array(pngOf(700, 8001))], "tall.png", { type: "image/png" }), 422, "image-too-large"],
    ["an image over 25 megapixels", new File([new Uint8Array(pngOf(8000, 3126))], "huge.png", { type: "image/png" }), 422, "image-too-large"],
    ["an animated PNG", new File([new Uint8Array(pngOf(40, 30, { animated: true }))], "loop.png", { type: "image/png" }), 422, "animated"],
    ["an animated WebP", new File([new Uint8Array(screenshotFixture("animated.webp"))], "loop.webp", { type: "image/webp" }), 422, "animated"],
  ])("refuses %s without counting a scan or running the extractor", async (_case, file, status, reason) => {
    const { POST } = await import("./route");
    const response = await POST(await imageRequest(file));

    expect(response.status).toBe(status);
    expect((await response.json()).reason).toBe(reason);
    expect(mocks.extractor).not.toHaveBeenCalled();
    expect(mocks.takeScanPlace).not.toHaveBeenCalled();
  });

  it("returns the plain failure when the extractor fails", async () => {
    vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake-failure");
    const { POST } = await import("./route");
    const response = await POST(await imageRequest());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Couldn't read that screenshot" });
  });

  it.each([
    ["daily-limit", "You've read 10 screenshots today. You can scan again tomorrow, after midnight Central time.", 3_600_000, "3600"],
    ["monthly-limit", "You've read 40 screenshots this month. You can scan again on Nov 1.", 86_400_000, "86400"],
    ["still-reading", "We're still reading your last screenshot. Wait a moment, then try this one.", 1_500, "2"],
    ["site-busy", "Many students are scanning right now. Wait a moment, then try this one.", 90_000, "90"],
  ])("refuses a %s scan with 429 and Retry-After, without running the extractor", async (refused, message, waitMs, retryAfter) => {
    mocks.takeScanPlace.mockImplementation(async (_subject: string, realNow: Date) => ({
      refused, message, retryAt: new Date(realNow.getTime() + waitMs),
    }));
    const { POST } = await import("./route");
    const response = await POST(await imageRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe(retryAfter);
    expect(await response.json()).toEqual({ error: message, reason: refused });
    expect(mocks.extractor).not.toHaveBeenCalled();
  });

  it("frees the running-scan place after a failed read", async () => {
    vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake-failure");
    const { POST } = await import("./route");
    await POST(await imageRequest());

    expect(mocks.takeScanPlace).toHaveBeenCalledWith("student-account", expect.any(Date));
    expect(mocks.freeScanPlace).toHaveBeenCalledWith(await mocks.takeScanPlace.mock.results[0].value);
  });
});
