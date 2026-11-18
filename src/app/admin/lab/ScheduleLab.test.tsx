// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockAnalytics, mockStudent } from "@/lib/mockData";
import { PT158_FIXTURES } from "@/lib/practiceTestFixtures/pt158";
import { reviewPracticeTest } from "@/lib/practiceTestResult";
import { copiedInputs, presetInputs, readLabLink, type CopiedStudent } from "@/lib/scheduleLab";

const { saveActivityCheckIn, extractScreenshot, extractPracticeTestScreenshot } = vi.hoisted(() => ({
  saveActivityCheckIn: vi.fn(), extractScreenshot: vi.fn(), extractPracticeTestScreenshot: vi.fn(),
}));
vi.mock("@/app/dashboard/actions", () => ({ saveActivityCheckIn }));
vi.mock("@/lib/screenshotUpload", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/screenshotUpload")>(), extractScreenshot, extractPracticeTestScreenshot,
}));

import { ScheduleLab } from "./ScheduleLab";

const THIS_WEEK = "2026-11-16";
const maya: CopiedStudent = { id: "s1", name: "Maya Thompson", uploadedOn: "2026-11-13", trend: { ...mockAnalytics, rcTypesInNewestSnapshot: [] } };

beforeEach(() => {
  window.history.replaceState(null, "", "/admin/lab");
  vi.resetAllMocks();
});
afterEach(cleanup);

const inputs = () => screen.getByRole("region", { name: "Inputs" });
const reasons = () => screen.getByRole("region", { name: "Schedule reasons" });
const linkInputs = () => readLabLink(new URLSearchParams(window.location.search).get("lab") ?? "", THIS_WEEK);

function openOnSteady() {
  return render(<ScheduleLab thisWeek={THIS_WEEK} start={presetInputs("steady", THIS_WEEK)} copied={null} scanningOff={false} />);
}

describe("Schedule lab", () => {
  it("opens on Steady with the week built and its schedule reasons above the days", () => {
    openOnSteady();
    expect((within(inputs()).getByRole("combobox", { name: "Preset" }) as HTMLSelectElement).value).toBe("steady");
    expect(screen.getByRole("heading", { level: 2, name: "Week 1 · Nov 16" })).toBeTruthy();
    expect(within(reasons()).getByText("Planned from Steady sample")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Built week" })).getByText("Monday")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("lists the six presets", () => {
    openOnSteady();
    const preset = within(inputs()).getByRole("combobox", { name: "Preset" });
    expect(within(preset).getAllByRole("option").map((o) => o.textContent)).toEqual(["Improving", "Steady", "Slipping", "2× time", "Test in 3 weeks", "30 min days"]);
  });

  it("rebuilds in place on Test in 3 weeks, with the second practice test and its reason", async () => {
    openOnSteady();
    await userEvent.selectOptions(within(inputs()).getByRole("combobox", { name: "Preset" }), "Test in 3 weeks");
    expect(screen.getByRole("heading", { level: 2, name: "Week 1 · Dec 21" })).toBeTruthy();
    expect(within(reasons()).getByText("Near-test week")).toBeTruthy();
    expect(within(reasons()).getByText(/2 LawHub practice tests before your January 1 test/)).toBeTruthy();
    expect(screen.getAllByText(/Practice test 2 of 2/)).toHaveLength(1);
    expect(linkInputs()).toEqual(presetInputs("soon", THIS_WEEK));
  });

  it("rebuilds when a sample direction changes, and keeps it in the page link", async () => {
    openOnSteady();
    await userEvent.click(within(inputs()).getByRole("radio", { name: "Slipping" }));
    expect(within(reasons()).getByText("Planned from Slipping sample")).toBeTruthy();
    expect(linkInputs()?.analytics).toEqual({ kind: "sample", direction: "slipping" });
  });

  it("keeps the last week that built while a value is out of range", async () => {
    openOnSteady();
    const goal = within(inputs()).getByRole("textbox", { name: "Goal score" });
    await userEvent.clear(goal);
    await userEvent.type(goal, "20");
    expect(goal.getAttribute("aria-invalid")).toBe("true");
    expect(within(inputs()).getByText("LSAT scores go from 120 to 180. Check your goal score.")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Showing the last week that built. Fix the goal score.");
    expect(screen.getByRole("heading", { level: 2, name: "Week 1 · Nov 16" })).toBeTruthy();
    expect(linkInputs()?.goal).toBe("20");
  });

  it("shows where a copied student came from and plans from their upload", () => {
    render(<ScheduleLab thisWeek={THIS_WEEK} start={copiedInputs(mockStudent, maya, THIS_WEEK)} copied={maya} scanningOff={false} />);
    expect(within(inputs()).getByText((_, node) => node?.tagName === "P" && node.textContent === "Copied from Maya Thompson, Nov 13. Edits here do not change the student.")).toBeTruthy();
    expect((within(inputs()).getByRole("combobox", { name: "Preset" }) as HTMLSelectElement).selectedOptions[0]!.textContent).toBe("Maya Thompson (copied)");
    expect((within(inputs()).getByRole("radio", { name: "Their upload" }) as HTMLInputElement).checked).toBe(true);
    expect(within(reasons()).getByText("Planned from Maya Thompson's latest upload")).toBeTruthy();
  });

  it("says a copied student without analytics started from Steady", () => {
    const copied = { ...maya, uploadedOn: null, trend: null };
    render(<ScheduleLab thisWeek={THIS_WEEK} start={copiedInputs(mockStudent, copied, THIS_WEEK)} copied={copied} scanningOff={false} />);
    expect(within(inputs()).getByText((_, node) => node?.tagName === "P" && node.textContent === "Maya Thompson has no analytics yet, so the lab started from the Steady preset.")).toBeTruthy();
    expect(within(inputs()).queryByRole("radio", { name: "Their upload" })).toBeNull();
    expect(within(reasons()).getByText("Planned from Steady sample")).toBeTruthy();
  });

  it("drops the copy when a preset is picked", async () => {
    render(<ScheduleLab thisWeek={THIS_WEEK} start={copiedInputs(mockStudent, maya, THIS_WEEK)} copied={maya} scanningOff={false} />);
    await userEvent.selectOptions(within(inputs()).getByRole("combobox", { name: "Preset" }), "Steady");
    expect(within(inputs()).queryByText(/Copied from/)).toBeNull();
    expect(linkInputs()?.copiedFrom).toBeNull();
  });

  it("builds Next week from this one and moves back without dropping it", async () => {
    openOnSteady();
    await userEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByRole("heading", { level: 2, name: "Week 2 · Nov 23" })).toBeTruthy();
    expect(within(reasons()).getByText("Planned from Steady sample, week 2 upload")).toBeTruthy();
    expect(linkInputs()).toMatchObject({ built: 2, shown: 1 });
    await userEvent.click(screen.getByRole("button", { name: "Earlier week" }));
    expect(screen.getByRole("heading", { level: 2, name: "Week 1 · Nov 16" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Earlier week" }) as HTMLButtonElement).disabled).toBe(true);
    expect(linkInputs()).toMatchObject({ built: 2, shown: 0 });
  });

  it("opens the built count and shown week from the page link", () => {
    render(<ScheduleLab thisWeek={THIS_WEEK} start={{ ...presetInputs("steady", THIS_WEEK), built: 4, shown: 2 }} copied={null} scanningOff={false} />);
    expect(screen.getByRole("heading", { level: 2, name: "Week 3 · Nov 30" })).toBeTruthy();
  });

  it("stops before the goal test month, says why, and turns Next week off", async () => {
    openOnSteady();
    await userEvent.selectOptions(within(inputs()).getByRole("combobox", { name: "Preset" }), "Test in 3 weeks");
    expect(within(reasons()).queryByText(/Last week in the chain/)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByRole("heading", { level: 2, name: "Week 2 · Dec 28" })).toBeTruthy();
    expect(within(reasons()).getByText("Last week in the chain. The January 2027 test comes before the week of Jan 4.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Next week" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps the last chain while a value is out of range, and still moves through it", async () => {
    render(<ScheduleLab thisWeek={THIS_WEEK} start={{ ...presetInputs("steady", THIS_WEEK), built: 2, shown: 1 }} copied={null} scanningOff={false} />);
    const goal = within(inputs()).getByRole("textbox", { name: "Goal score" });
    await userEvent.clear(goal);
    await userEvent.type(goal, "20");
    expect(screen.getByRole("heading", { level: 2, name: "Week 2 · Nov 23" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Earlier week" }));
    expect(screen.getByRole("heading", { level: 2, name: "Week 1 · Nov 16" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Next week" }));
    await userEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByRole("heading", { level: 2, name: "Week 3 · Nov 30" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Showing the last week that built. Fix the goal score.");
    expect(linkInputs()).toMatchObject({ goal: "20", built: 3, shown: 2 });
  });

  it("saves nothing", async () => {
    openOnSteady();
    await userEvent.click(within(inputs()).getByRole("radio", { name: "Improving" }));
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(saveActivityCheckIn).not.toHaveBeenCalled();
  });

  describe("screenshots", () => {
    const LR_ROWS = [
      { type: "Strengthen", category: "regular", accuracy: 68 },
      { type: "Necessary assumption", category: "regular", accuracy: 74 },
      { type: "Causal reasoning", category: "restricted", isTopPriority: true, priorityTier: "highest" },
    ];
    const RC_ROWS = [{ type: "Law", category: "passage", accuracy: 58 }, { type: "Art", category: "passage", accuracy: 77 }];
    const png = (name: string) => new File(["png"], name, { type: "image/png" });
    const slot = (name: string) => within(screen.getByRole("list", { name: "Screenshots" })).getByRole("listitem", { name });
    const fileInput = (name: string) => document.querySelector<HTMLInputElement>(`input[type=file][data-slot="${name}"]`)!;

    function deferred<T>() {
      let resolve!: (value: T) => void;
      const promise = new Promise<T>((done) => { resolve = done; });
      return { promise, resolve };
    }

    async function pickScreenshots(scanningOff = false) {
      render(<ScheduleLab thisWeek={THIS_WEEK} start={presetInputs("steady", THIS_WEEK)} copied={null} scanningOff={scanningOff} />);
      await userEvent.click(within(inputs()).getByRole("radio", { name: "Screenshots" }));
    }

    it("shows three slots as Not added and keeps the last week, marked out of date", async () => {
      await pickScreenshots();
      for (const name of ["Logical Reasoning", "Reading Comprehension"]) expect(within(slot(name)).getByText("Not added")).toBeTruthy();
      expect(within(slot("Practice test sections")).getByText("Optional · all 4 sections")).toBeTruthy();
      expect(screen.getByRole("status").textContent)
        .toBe("Showing the last week that built. Add the Logical Reasoning and Reading Comprehension screenshots.");
      expect(within(reasons()).getByText("Planned from Steady sample")).toBeTruthy();
      expect(linkInputs()?.analytics).toEqual({ kind: "screenshots" });
    });

    it("reads each slot with the lab reader, one at a time, and rebuilds once LR and RC are both read", async () => {
      const lr = deferred<unknown>();
      extractScreenshot.mockImplementation((_file: File, section: string) => (section === "LR" ? lr.promise : Promise.resolve({ kind: "rows", rows: RC_ROWS, showsPassageTypes: true })));
      await pickScreenshots();

      await userEvent.upload(fileInput("Logical Reasoning"), png("pt158-lr.png"));
      expect(within(slot("Logical Reasoning")).getByText("Reading pt158-lr.png…")).toBeTruthy();
      await userEvent.upload(fileInput("Reading Comprehension"), png("pt158-rc.png"));
      expect(within(slot("Reading Comprehension")).getByText("Reading pt158-rc.png…")).toBeTruthy();
      expect(extractScreenshot).toHaveBeenCalledOnce();
      expect(within(reasons()).getByText("Planned from Steady sample")).toBeTruthy();

      lr.resolve({ kind: "rows", rows: LR_ROWS });
      await waitFor(() => expect(within(reasons()).getByText("Planned from Screenshots: 2 LR types · 2 RC types")).toBeTruthy());
      expect(within(slot("Reading Comprehension")).getByText("pt158-rc.png · 2 passage types")).toBeTruthy();
      expect(within(slot("Logical Reasoning")).getByText("pt158-lr.png · 2 types")).toBeTruthy();
      expect(screen.queryByRole("status")).toBeNull();
      expect(extractScreenshot.mock.calls.map((call) => [call[1], call[2]])).toEqual([["LR", "lab"], ["RC", "lab"]]);
      expect(saveActivityCheckIn).not.toHaveBeenCalled();
    });

    it("shows the live error in a slot that failed and keeps the last week", async () => {
      extractScreenshot.mockResolvedValue({ kind: "cannot-read" });
      await pickScreenshots();
      await userEvent.upload(fileInput("Logical Reasoning"), png("blurry.png"));

      await waitFor(() => expect(within(inputs()).getByText("Logical Reasoning: Couldn't read that screenshot. Try again or a clearer image.")).toBeTruthy());
      expect(within(reasons()).getByText("Planned from Steady sample")).toBeTruthy();
    });

    it("refuses a page the live upload would refuse, and keeps the last week", async () => {
      extractScreenshot.mockImplementation((_file: File, section: string) =>
        Promise.resolve(section === "LR" ? { kind: "rows", rows: RC_ROWS } : { kind: "rows", rows: [], showsPassageTypes: false }));
      await pickScreenshots();
      await userEvent.upload(fileInput("Logical Reasoning"), png("rc-page.png"));
      await userEvent.upload(fileInput("Reading Comprehension"), png("other.png"));

      await waitFor(() => expect(within(inputs()).getByText("Reading Comprehension: No passage types in this one.")).toBeTruthy());
      expect(within(inputs()).getByText("Logical Reasoning: We found no LR question types in that screenshot. Choose your Logical Reasoning screenshot.")).toBeTruthy();
      expect(within(reasons()).getByText("Planned from Steady sample")).toBeTruthy();
      expect(screen.getByRole("status").textContent).toMatch(/^Showing the last week that built\./);
    });

    it("shows the scanning-off note when a read is refused, and typed values still build", async () => {
      extractScreenshot.mockResolvedValue({ kind: "refused", refused: "scanning-off", message: "Scanning is off right now. Enter your analytics by hand." });
      await pickScreenshots();
      await userEvent.upload(fileInput("Logical Reasoning"), png("lr.png"));

      await waitFor(() => expect(within(inputs()).getByText("Sample directions and every typed input still build the week.")).toBeTruthy());
      expect((within(slot("Reading Comprehension")).getByRole("button") as HTMLButtonElement).disabled).toBe(true);
      await userEvent.click(within(inputs()).getByRole("radio", { name: "Slipping" }));
      expect(within(reasons()).getByText("Planned from Slipping sample")).toBeTruthy();
    });

    it("opens with the scanning-off note when scanning is already off", async () => {
      await pickScreenshots(true);
      expect(within(inputs()).getByText("Scanning is off right now. Enter your analytics by hand.")).toBeTruthy();
      expect((within(slot("Logical Reasoning")).getByRole("button") as HTMLButtonElement).disabled).toBe(true);
    });

    it("plans week 1 only from a practice test's missed types", async () => {
      extractScreenshot.mockImplementation((_file: File, section: string) => Promise.resolve({ kind: "rows", rows: section === "LR" ? LR_ROWS : RC_ROWS, showsPassageTypes: section === "RC" }));
      PT158_FIXTURES.forEach(({ reading }) => extractPracticeTestScreenshot.mockResolvedValueOnce({ kind: "reading", reading }));
      const review = reviewPracticeTest(PT158_FIXTURES.map(({ reading }) => reading));
      if (!review.ok) throw new Error("PT 158 fixtures should review cleanly");
      const missed = `PT 158, ${review.result.missedQuestions} missed`;
      await pickScreenshots();
      await userEvent.upload(fileInput("Logical Reasoning"), png("lr.png"));
      await userEvent.upload(fileInput("Reading Comprehension"), png("rc.png"));
      await userEvent.upload(fileInput("practice test section"), PT158_FIXTURES.map((_, i) => png(`pt158-s${i + 1}.png`)));

      await waitFor(() => expect(within(reasons()).getByText(`Planned from Screenshots: 2 LR types · 2 RC types · ${missed}`)).toBeTruthy());
      expect(within(slot("Practice test sections")).getByText(`PT 158 · ${review.result.missedQuestions} missed`)).toBeTruthy();
      expect(within(reasons()).getByText("Missed type first")).toBeTruthy();
      expect(extractPracticeTestScreenshot.mock.calls.map((call) => call[1])).toEqual(["lab", "lab", "lab", "lab"]);
      await userEvent.click(screen.getByRole("button", { name: "Next week" }));
      expect(within(reasons()).queryByText("Missed type first")).toBeNull();
    });
  });
});
