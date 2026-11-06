// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { FileRead } from "@/lib/screenshotReadQueue";
import { FileRow } from "./FileRow";
import { ReadDetail, ReadingBar, useReadingBar } from "./ReadingBar";

type Status = FileRead<unknown>["status"];

const TEXT: Partial<Record<Status, string>> = {
  waiting: "Waiting to read",
  reading: "Reading now",
  read: "12 question types",
  "connection-lost": "Connection lost. Your file is still here.",
  "timed-out": "Reading took too long and stopped.",
  "cannot-read": "We couldn't read the rows in it.",
  failed: "not read",
};

function Row({ status, name = "lr-analytics.png" }: { status: Status; name?: string }) {
  const bar = useReadingBar(status);
  const shown = bar.phase === "filling" ? "reading" : status;
  return (
    <FileRow
      title="Logical Reasoning"
      detail={<ReadDetail name={name} status={TEXT[shown]} />}
      bar={<ReadingBar label="Reading your Logical Reasoning screenshot" {...bar} />}
    />
  );
}

const STILL_READING = "Still reading. This can take up to 30 seconds.";
const progressbar = () => screen.queryByRole("progressbar", { name: "Reading your Logical Reasoning screenshot" });
const detail = () => screen.getByText((_, el) => el?.getAttribute("aria-live") === "polite").textContent;
const barArea = () => document.querySelector<HTMLElement>("[data-phase]")!;
const barShown = () => barArea().hasAttribute("data-open");

let reduced = false;
beforeEach(() => {
  vi.useFakeTimers();
  reduced = false;
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduced && query.includes("reduce") }));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("reading bar", () => {
  it("shows no bar while the screenshot waits behind another read", () => {
    render(<Row status="waiting" />);
    expect(detail()).toBe("lr-analytics.png · Waiting to read");
    expect(progressbar()).toBeNull();
    expect(barShown()).toBe(false);
  });

  it("opens the bar while the read runs", () => {
    const { rerender } = render(<Row status="waiting" />);
    rerender(<Row status="reading" />);
    expect(detail()).toBe("lr-analytics.png · Reading now");
    expect(progressbar()).not.toBeNull();
    expect(barShown()).toBe(true);
  });

  it("adds the long-read note at 10 s and keeps reading", () => {
    render(<Row status="reading" />);
    act(() => vi.advanceTimersByTime(9_999));
    expect(screen.queryByText(STILL_READING)).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText(STILL_READING)).toBeDefined();
    expect(progressbar()).not.toBeNull();
    expect(detail()).toBe("lr-analytics.png · Reading now");
  });

  it("fills the bar, then shows the result line 260 ms later and closes the bar", () => {
    const { rerender } = render(<Row status="reading" />);
    rerender(<Row status="read" />);
    expect(barArea().dataset.phase).toBe("filling");
    expect(detail()).toBe("lr-analytics.png · Reading now");
    act(() => vi.advanceTimersByTime(259));
    expect(detail()).toBe("lr-analytics.png · Reading now");
    act(() => vi.advanceTimersByTime(1));
    expect(detail()).toBe("lr-analytics.png · 12 question types");
    expect(barShown()).toBe(false);
    expect(progressbar()).toBeNull();
  });

  it("hides the closed bar and its long-read note from screen readers once the result line shows", () => {
    const { rerender } = render(<Row status="reading" />);
    act(() => vi.advanceTimersByTime(10_000));
    rerender(<Row status="read" />);
    act(() => vi.advanceTimersByTime(260));
    expect(barShown()).toBe(false);
    expect(barArea().getAttribute("aria-hidden")).toBe("true");
  });

  it("shows the result line at once with reduced motion", () => {
    reduced = true;
    const { rerender } = render(<Row status="reading" />);
    rerender(<Row status="read" />);
    act(() => vi.advanceTimersByTime(0));
    expect(detail()).toBe("lr-analytics.png · 12 question types");
  });

  it("shows no bar for a screenshot that was already read", () => {
    render(<Row status="read" />);
    expect(detail()).toBe("lr-analytics.png · 12 question types");
    expect(barShown()).toBe(false);
  });

  it("stops the bar without filling it when the connection is lost", () => {
    const { rerender } = render(<Row status="reading" />);
    act(() => vi.advanceTimersByTime(10_000));
    rerender(<Row status="connection-lost" />);
    expect(barShown()).toBe(true);
    expect(barArea().dataset.phase).toBe("lost");
    expect(progressbar()).toBeNull();
    expect(screen.queryByText(STILL_READING)).toBeNull();
    expect(detail()).toBe("lr-analytics.png · Connection lost. Your file is still here.");
  });

  it.each(["timed-out", "cannot-read", "failed"] as const)("drops the bar and the note when the read ends as %s", (status) => {
    const { rerender } = render(<Row status="reading" />);
    act(() => vi.advanceTimersByTime(10_000));
    rerender(<Row status={status} />);
    expect(barShown()).toBe(false);
    expect(barArea().dataset.phase).toBe("off");
    expect(progressbar()).toBeNull();
    expect(screen.queryByText(STILL_READING)).toBeNull();
    expect(detail()).toBe(`lr-analytics.png · ${TEXT[status]}`);
  });

});
