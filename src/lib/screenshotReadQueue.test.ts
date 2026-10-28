import { describe, expect, it } from "vitest";
import type { SectionReading } from "./practiceTestResult";
import {
  addFile, analyticsRead, emptyReadQueue, endRead, nextRead, sectionRead, slotFile, slotFiles, startRead,
  type AnalyticsReading, type ReadQueue,
} from "./screenshotReadQueue";
import type { AnalyticsExtractedRow } from "./types";

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
});

describe("reply to file status", () => {
  it("asks for another LR screenshot when it shows no question types, and accepts an RC one with none", () => {
    expect(analyticsRead({ kind: "rows", rows: [] }, "LR", AT)).toEqual({ status: "no-rows" });
    expect(analyticsRead({ kind: "rows", rows: [] }, "RC", AT)).toEqual({ status: "read", value: { rows: [], at: AT.toISOString() } });
  });

  it("keeps only the rows of the section the screenshot was added for", () => {
    const passage: AnalyticsExtractedRow = { type: "Law", category: "passage", accuracy: 58 };
    expect(analyticsRead({ kind: "rows", rows: [lrRow, passage] }, "LR", AT)).toEqual({ status: "read", value: { rows: [lrRow], at: AT.toISOString() } });
  });

  it("names each failure the same way for analytics and section screenshots", () => {
    expect(sectionRead({ kind: "timed-out" })).toEqual({ status: "timed-out" });
    expect(sectionRead({ kind: "rejected", message: "Too big." })).toEqual({ status: "rejected", message: "Too big." });
    expect(analyticsRead({ kind: "signed-out" }, "RC", AT)).toEqual({ status: "signed-out" });
  });
});
