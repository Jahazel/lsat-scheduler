import { afterEach, describe, expect, it, vi } from "vitest";
import { extractScreenshot } from "./screenshotUpload";

const file = new File(["png"], "7sage-analytics.png", { type: "image/png" });

function replyWith(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
}

afterEach(() => vi.unstubAllGlobals());

describe("extractScreenshot", () => {
  it("returns the rows the route read", async () => {
    const rows = [{ type: "Strengthen", category: "regular", accuracy: 68 }];
    replyWith(200, { rows });

    expect(await extractScreenshot(file)).toEqual({ kind: "rows", rows });
  });

  it.each([413, 415])("passes on the route's %i rejection message", async (status) => {
    replyWith(status, { error: "That file is 4.2 MB. Choose one that is 4 MB or less.", reason: "too-large" });

    expect(await extractScreenshot(file)).toEqual({
      kind: "rejected",
      message: "That file is 4.2 MB. Choose one that is 4 MB or less.",
    });
  });

  it("treats the route's read failure as a screenshot that cannot be read", async () => {
    replyWith(502, { error: "Couldn't read that screenshot" });

    expect(await extractScreenshot(file)).toEqual({ kind: "cannot-read" });
  });

  it("treats a 401 reply as a signed-out student", async () => {
    replyWith(401, { error: "Not signed in" });

    expect(await extractScreenshot(file)).toEqual({ kind: "signed-out" });
  });

  it("treats a network failure or another server error as a lost connection", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    expect(await extractScreenshot(file)).toEqual({ kind: "connection-lost" });

    replyWith(500, {});
    expect(await extractScreenshot(file)).toEqual({ kind: "connection-lost" });
  });
});
