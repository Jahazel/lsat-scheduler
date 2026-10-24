import { afterEach, describe, expect, it, vi } from "vitest";
import { extractPracticeTestScreenshot, extractScreenshot, readAnalyticsScreenshot, shrunkSize } from "./screenshotUpload";

const file = new File(["png"], "7sage-analytics.png", { type: "image/png" });

function replyWith(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
}

afterEach(() => vi.unstubAllGlobals());

describe("extractScreenshot", () => {
  it("returns the rows the route read", async () => {
    const rows = [{ type: "Strengthen", category: "regular", accuracy: 68 }];
    replyWith(200, { rows });

    expect(await extractScreenshot(file, "LR")).toEqual({ kind: "rows", rows });
  });

  it("tells the route which section the screenshot shows", async () => {
    replyWith(200, { rows: [] });

    await extractScreenshot(file, "RC");

    const body = vi.mocked(fetch).mock.calls[0][1]?.body as FormData;
    expect(body.get("section")).toBe("RC");
  });

  it.each([413, 415, 422])("passes on the route's %i rejection message", async (status) => {
    replyWith(status, { error: "That file is 4.2 MB. Choose one that is 4 MB or less.", reason: "too-large" });

    expect(await extractScreenshot(file, "LR")).toEqual({
      kind: "rejected",
      message: "That file is 4.2 MB. Choose one that is 4 MB or less.",
    });
  });

  it("treats the route's read failure as a screenshot that cannot be read", async () => {
    replyWith(502, { error: "Couldn't read that screenshot" });

    expect(await extractScreenshot(file, "LR")).toEqual({ kind: "cannot-read" });
  });

  it("treats a 401 reply as a signed-out student", async () => {
    replyWith(401, { error: "Not signed in" });

    expect(await extractScreenshot(file, "LR")).toEqual({ kind: "signed-out" });
  });

  it("treats a network failure or another server error as a lost connection", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    expect(await extractScreenshot(file, "LR")).toEqual({ kind: "connection-lost" });

    replyWith(500, {});
    expect(await extractScreenshot(file, "LR")).toEqual({ kind: "connection-lost" });
  });
});

describe("readAnalyticsScreenshot", () => {
  it("asks for the LR screenshot again when it shows no question types", async () => {
    replyWith(200, { rows: [] });

    expect(await readAnalyticsScreenshot(file, "LR")).toEqual({
      kind: "problem",
      message: "We found no LR question types in that screenshot. Choose your Logical Reasoning screenshot.",
    });
  });

  it("accepts an RC screenshot with no passage-type percentage", async () => {
    replyWith(200, { rows: [] });

    expect(await readAnalyticsScreenshot(file, "RC")).toEqual({ kind: "rows", rows: [] });
  });
});

describe("before upload", () => {
  it.each([
    [1568, 900, null],
    [1179, 2556, { width: 723, height: 1568 }],
    [3000, 1000, { width: 1568, height: 523 }],
    [1569, 1569, { width: 1568, height: 1568 }],
    [8000, 1, { width: 1568, height: 1 }],
  ])("shrinks a %i x %i image so its longer side is at most 1,568 px", (width, height, size) => {
    expect(shrunkSize(width, height)).toEqual(size);
  });

  it("refuses a file still over 4 MB without sending it", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const large = new File([new Uint8Array(Math.round(6.2 * 1024 * 1024))], "pt158-s1.png", { type: "image/png" });

    expect(await extractPracticeTestScreenshot(large)).toEqual({
      kind: "rejected", message: "That file is 6.2 MB. Choose one that is 4 MB or less.",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
