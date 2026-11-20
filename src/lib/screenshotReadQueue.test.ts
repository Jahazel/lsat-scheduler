import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SectionReading } from "./practiceTestResult";
import {
  NO_LR_ROWS, addFile, emptyReadQueue, endRead, nextRead, readScreenshot, settleAnalyticsRead, settleSectionRead, slotFile, slotFiles, startRead,
  type AnalyticsReading, type ReadQueue,
} from "./screenshotReadQueue";
import {
  CANNOT_READ, CONNECTION_LOST, SIGN_IN_EXPIRED, TOOK_TOO_LONG, WRONG_TYPE, extractPracticeTestScreenshot, extractScreenshot,
  type ExtractReply,
} from "./screenshotUpload";
import type { AnalyticsExtractedRow } from "./types";
import { NOT_LOGGED } from "./unexpectedFailure";

vi.mock("./screenshotUpload", async (importOriginal) => ({
  ...await importOriginal<typeof import("./screenshotUpload")>(),
  extractScreenshot: vi.fn(),
  extractPracticeTestScreenshot: vi.fn(),
}));

const analyticsRead = (reply: ExtractReply, section: "LR" | "RC", at: Date) => settleAnalyticsRead(reply, section, at).read;

type Reads = { LR: AnalyticsReading; RC: AnalyticsReading; section: SectionReading };
const ORDER = ["LR", "RC", "section"] as const;
const AT = new Date("2026-10-19T15:00:00.000Z");
const png = (name: string) => new File(["png"], name, { type: "image/png" });
const lrRow: AnalyticsExtractedRow = { type: "Diagram", category: "regular", accuracy: 60 };
const dailyLimit = analyticsRead({ kind: "refused", refused: "daily-limit", message: "You've read 10 screenshots today." }, "LR", AT);

function queue(...files: [keyof Reads, string][]): ReadQueue<Reads> {
  return files.reduce((next, [slot, name]) => addFile(next, { slot, file: png(name), status: "waiting" }), emptyReadQueue<Reads>());
}

const names = (q: ReadQueue<Reads>) => q.files.map(({ file, read }) => `${file.name} ${read.status}`);

describe("screenshot read queue", () => {
  it("reads the LR, then the RC, then the sections, whatever order they were added in", () => {
    let q = queue(["section", "s1.png"], ["RC", "rc.png"], ["LR", "lr.png"]);
    const order: string[] = [];
    for (let next = nextRead(q, ORDER); next; next = nextRead(q, ORDER)) {
      order.push(next.file.name);
      q = endRead(startRead(q, next.id), next.id, { status: "connection-lost" });
    }
    expect(order).toEqual(["lr.png", "rc.png", "s1.png"]);
  });

  it("starts no second read while one is in flight, even after its file is replaced", () => {
    const first = queue(["LR", "lr.png"], ["RC", "rc.png"]);
    const reading = startRead(first, 0);
    const replaced = addFile(reading, { slot: "LR", file: png("lr-2.png"), status: "waiting", replacing: 0 });

    expect(nextRead(replaced, ORDER)).toBeUndefined();
    expect(names(replaced)).toEqual(["lr-2.png waiting", "rc.png waiting"]);

    const ended = endRead(replaced, 0, analyticsRead({ kind: "rows", rows: [lrRow] }, "LR", AT));
    expect(names(ended)).toEqual(["lr-2.png waiting", "rc.png waiting"]);
    expect(nextRead(ended, ORDER)?.file.name).toBe("lr-2.png");
  });

  it("stops every waiting file at a daily limit and leaves files not yet queued alone", () => {
    const q = addFile(queue(["LR", "lr.png"], ["RC", "rc.png"]), { slot: "section", file: png("s1.png"), status: "added" });
    const ended = endRead(startRead(q, 0), 0, dailyLimit);

    expect(names(ended)).toEqual(["lr.png refused", "rc.png refused", "s1.png added"]);
    expect(slotFile(ended, "RC")?.read).toEqual({ status: "refused", message: "You've read 10 screenshots today.", tryAgain: false });
    expect(nextRead(ended, ORDER)).toBeUndefined();
  });

  it("keeps the line moving when a scan is refused only because another one is running", () => {
    const busy = analyticsRead({ kind: "refused", refused: "still-reading", message: "We're still reading your last screenshot." }, "LR", AT);
    const ended = endRead(startRead(queue(["LR", "lr.png"], ["RC", "rc.png"]), 0), 0, busy);

    expect(slotFile(ended, "LR")?.read).toMatchObject({ status: "refused", tryAgain: true });
    expect(nextRead(ended, ORDER)?.file.name).toBe("rc.png");
  });

  it("puts a replaced section back in its own place in line", () => {
    const q = queue(["section", "s1.png"], ["section", "s2.png"], ["section", "s3.png"]);
    const replaced = addFile(q, { slot: "section", file: png("s2-new.png"), status: "waiting", replacing: 1 });

    expect(slotFiles(replaced, "section").map(({ file }) => file.name)).toEqual(["s1.png", "s2-new.png", "s3.png"]);
  });

  it("gives a replacement a new id and keeps its row key, so the row's failure notice stays the same", () => {
    const q = queue(["LR", "lr.png"], ["section", "s1.png"], ["section", "s2.png"]);
    const replaced = addFile(addFile(q, { slot: "LR", file: png("lr-2.png"), status: "waiting", replacing: 0 }),
      { slot: "section", file: png("s2-new.png"), status: "waiting", replacing: 2 });

    expect(replaced.files.map(({ id, rowKey }) => [id, rowKey])).toEqual([[3, 0], [1, 1], [4, 2]]);
  });
});

describe("reply to file status", () => {
  it("asks for another LR screenshot when it shows no question types, and accepts an RC one with none", () => {
    expect(analyticsRead({ kind: "rows", rows: [] }, "LR", AT)).toEqual({ status: "no-rows" });
    expect(analyticsRead({ kind: "rows", showsPassageTypes: true, rows: [] }, "RC", AT)).toEqual({ status: "read", value: { rows: [], at: AT.toISOString() } });
  });

  it("rejects an RC screenshot that is not a passage-type page, and accepts one with no percentages", () => {
    expect(analyticsRead({ kind: "rows", showsPassageTypes: false, rows: [] }, "RC", AT)).toEqual({ status: "rejected", message: "No passage types in this one." });
    expect(analyticsRead({ kind: "rows", rows: [] }, "RC", AT)).toEqual({ status: "rejected", message: "No passage types in this one." });
  });

  it("keeps only the rows of the section the screenshot was added for", () => {
    const passage: AnalyticsExtractedRow = { type: "Law", category: "passage", accuracy: 58 };
    expect(analyticsRead({ kind: "rows", rows: [lrRow, passage] }, "LR", AT)).toEqual({ status: "read", value: { rows: [lrRow], at: AT.toISOString() } });
  });

  it("names each failure the same way for analytics and section screenshots", () => {
    expect(settleSectionRead({ kind: "timed-out" }).read).toEqual({ status: "timed-out" });
    expect(settleSectionRead({ kind: "rejected", message: "Too big." }).read).toEqual({ status: "rejected", message: "Too big." });
    expect(analyticsRead({ kind: "signed-out" }, "RC", AT)).toEqual({ status: "signed-out" });
  });
});

describe("settled read", () => {
  const failure = { unexpectedFailure: NOT_LOGGED } as const;
  const scanningOff = { kind: "refused", refused: "scanning-off", message: "Scanning is off right now." } as const;
  const stillReading = { kind: "refused", refused: "still-reading", message: "We're still reading your last screenshot." } as const;

  it.each<[string, ExtractReply, string | null]>([
    ["a lost connection", { kind: "connection-lost" }, CONNECTION_LOST],
    ["an unreadable screenshot", { kind: "cannot-read" }, CANNOT_READ],
    ["a read that ran out of time", { kind: "timed-out" }, TOOK_TOO_LONG],
    ["an expired sign-in", { kind: "signed-out" }, SIGN_IN_EXPIRED],
    ["a file the server refused", { kind: "rejected", message: "Too big." }, "Too big."],
    ["a refused scan", stillReading, stillReading.message],
    ["an unexpected failure, which the failure notice names", { kind: "failed", failure }, null],
    ["an LR page with no question types", { kind: "rows", rows: [] }, NO_LR_ROWS],
  ])("gives one message for %s", (_, reply, message) => {
    expect(settleAnalyticsRead(reply, "LR", AT).message).toBe(message);
  });

  it("says nothing for a good read", () => {
    expect(settleAnalyticsRead({ kind: "rows", rows: [lrRow] }, "LR", AT)).toEqual({
      read: { status: "read", value: { rows: [lrRow], at: AT.toISOString() } }, message: null, scanningOff: false,
    });
  });

  it("turns scanning off only when the scan was refused because scanning is off", () => {
    expect(settleAnalyticsRead(scanningOff, "RC", AT)).toEqual({
      read: { status: "refused", message: scanningOff.message, tryAgain: false }, message: scanningOff.message, scanningOff: true,
    });
    expect(settleSectionRead(scanningOff).scanningOff).toBe(true);
    expect(settleSectionRead(stillReading).scanningOff).toBe(false);
    expect(settleAnalyticsRead({ kind: "refused", refused: "daily-limit", message: "Limit." }, "LR", AT).scanningOff).toBe(false);
  });

  it("gives the same message for a section screenshot as for an analytics one", () => {
    expect(settleSectionRead({ kind: "signed-out" }).message).toBe(SIGN_IN_EXPIRED);
    expect(settleSectionRead({ kind: "cannot-read" }).message).toBe(CANNOT_READ);
  });
});

describe("read a screenshot", () => {
  beforeEach(() => {
    vi.mocked(extractScreenshot).mockReset();
    vi.mocked(extractPracticeTestScreenshot).mockReset();
  });

  it("refuses a file that is not a screenshot type without sending it", async () => {
    const settled = await readScreenshot(new File(["gif"], "a.gif", { type: "image/gif" }), "LR", "lab");

    expect(settled).toEqual({ read: { status: "rejected", message: WRONG_TYPE.message }, message: WRONG_TYPE.message, scanningOff: false });
    expect(extractScreenshot).not.toHaveBeenCalled();
  });

  it("sends an analytics screenshot to the analytics reader for its section and keeps that section's rows", async () => {
    vi.mocked(extractScreenshot).mockResolvedValue({ kind: "rows", showsPassageTypes: true, rows: [lrRow, { type: "Law", category: "passage", accuracy: 58 }] });
    const file = png("rc.png");

    const settled = await readScreenshot(file, "RC", "lab");

    expect(extractScreenshot).toHaveBeenCalledWith(file, "RC", "lab");
    expect(settled.read).toMatchObject({ status: "read", value: { rows: [{ type: "Law" }] } });
  });

  it("sends a practice-test section to the section reader", async () => {
    const reading: SectionReading = { page: "other" };
    vi.mocked(extractPracticeTestScreenshot).mockResolvedValue({ kind: "reading", reading });
    const file = png("s1.png");

    const settled = await readScreenshot(file, "section");

    expect(extractPracticeTestScreenshot).toHaveBeenCalledWith(file, "student");
    expect(settled).toEqual({ read: { status: "read", value: reading }, message: null, scanningOff: false });
  });
});
