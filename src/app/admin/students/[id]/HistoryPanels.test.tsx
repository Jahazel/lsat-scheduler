// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { generateWeek } from "@/lib/engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "@/lib/mockData";
import { uploadHistory } from "@/lib/uploadHistory";

vi.mock("@/app/dashboard/actions", () => ({ saveActivityCheckIn: vi.fn() }));

import PastWeekView from "@/app/progress/PastWeekView";
import { PastWeeksPanel } from "./HistoryPanels";
import { ProgressPanel } from "./ProgressPanel";

afterEach(cleanup);

const week = (weekStartDate: string, label: string, done: number, total: number) =>
  ({ weekStartDate, label, done, total, completionPercent: Math.round((done / total) * 100) });
const base = "/admin/students/s1?sort=newest&tab=weeks";
const links = { all: base, weekPrefix: `${base}&pastWeek=` };
const hrefs = () => screen.getAllByRole("link").map((link) => link.getAttribute("href"));

describe("Past weeks", () => {
  it("says there are no past weeks yet", () => {
    render(<PastWeeksPanel months={[]} weekPrefix={links.weekPrefix} />);
    expect(screen.getByRole("heading", { level: 2, name: "Past weeks" })).toBeTruthy();
    expect(screen.getByText("No past weeks yet.")).toBeTruthy();
  });

  it("lists weeks by month with totals, each opening under /admin", () => {
    render(<PastWeeksPanel weekPrefix={links.weekPrefix} months={[
      { month: "November 2026", weeks: [week("2026-11-02", "Nov 2 – 8", 15, 23)] },
      { month: "October 2026", weeks: [week("2026-10-26", "Oct 26 – Nov 1", 11, 20), week("2026-10-19", "Oct 19 – 25", 18, 21)] },
    ]} />);
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "44 of 64 done · 3 weeks")).toBeTruthy();
    const october = screen.getByRole("region", { name: "October 2026" });
    expect(within(october).getByText("2 weeks")).toBeTruthy();
    expect(within(october).getByRole("link", { name: /Oct 26 – Nov 1.*11 of 20 done/ })).toBeTruthy();
    expect(hrefs()).toEqual([`${base}&pastWeek=2026-11-02`, `${base}&pastWeek=2026-10-26`, `${base}&pastWeek=2026-10-19`]);
  });

  it("opens a week read-only, with ← All weeks, Older week, and Newer week under /admin", () => {
    render(
      <PastWeekView
        schedule={{ id: "schedule-1", schedule: generateWeek(mockStudent, mockAnalytics, mockRules, mockStudentName), generationInputs: { student: mockStudent } }}
        checkIns={[]}
        week={week("2026-10-26", "Oct 26 – Nov 1", 11, 20)}
        older={week("2026-10-19", "Oct 19 – 25", 18, 21)}
        newer={week("2026-11-02", "Nov 2 – 8", 15, 23)}
        links={links}
        place="panel"
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Week of Oct 26" })).toBeTruthy();
    expect(screen.queryAllByRole("checkbox")).toEqual([]);
    expect(screen.getByRole("link", { name: "← All weeks" }).getAttribute("href")).toBe(base);
    expect(screen.getAllByRole("link", { name: /Older week/ })[0]!.getAttribute("href")).toBe(`${base}&pastWeek=2026-10-19`);
    expect(screen.getAllByRole("link", { name: /Newer week/ })[0]!.getAttribute("href")).toBe(`${base}&pastWeek=2026-11-02`);
    expect(hrefs().every((href) => href!.startsWith("/admin/"))).toBe(true);
  });
});

const snapshot = (id: string, weekOf: string, lr: Record<string, number>) =>
  ({ id, weekOf, approvedAt: `${weekOf}T12:00:00.000Z`, lrAccuracyByType: lr, rcAccuracyByType: { Law: 0.6 } });
const nineTypes = Object.fromEntries(["Weaken", "Flaw", "Evaluate", "Inference", "Principle", "Strengthen", "Must be true", "Must be false", "Argument part"]
  .map((type, index) => [type, 0.3 + index * 0.05]));

describe("Progress", () => {
  it("says there are no past weeks yet beside a first-week student's analytics", () => {
    render(<ProgressPanel months={uploadHistory([snapshot("a", "2026-11-09", { Weaken: 0.5 })], [])} score={158} goal={170} hasPastWeeks={false} />);
    expect(screen.getByText("No past weeks yet. Changes show after the next upload.")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Score 158" })).toBeTruthy();
  });

  it("says there are no past weeks yet when a student has no analytics either", () => {
    render(<ProgressPanel months={[]} score={158} goal={170} hasPastWeeks={false} />);
    expect(screen.getByText("No past weeks yet.")).toBeTruthy();
    expect(screen.getByText("No confirmed analytics on file.")).toBeTruthy();
  });

  it("lists uploads newest first with the newest open, and a row opens to its full snapshot", async () => {
    render(<ProgressPanel score={159} goal={170} hasPastWeeks months={uploadHistory([
      snapshot("old", "2026-10-26", { ...nineTypes, Weaken: 0.2 }),
      snapshot("new", "2026-11-02", nineTypes),
    ], [{ weekOf: "2026-10-26", prepTest: 141, missed: 13, missedStemTypeCounts: { Weaken: 4 } }])} />);
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "goal 170 · 2 uploads")).toBeTruthy();
    expect(screen.queryByText(/No past weeks yet/)).toBeNull();
    const [newest, older] = screen.getAllByRole("button", { expanded: true }).concat(screen.getAllByRole("button", { expanded: false }));
    expect(newest!.textContent).toContain("Nov 2 – 8Newest");
    expect(newest!.textContent).toContain("Moved most: Weaken");
    expect(screen.getByText("LR, weakest first")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show all 9 types" })).toBeTruthy();

    await userEvent.click(older!);
    expect(older!.getAttribute("aria-expanded")).toBe("true");
    expect(newest!.getAttribute("aria-expanded")).toBe("false");
    expect(older!.textContent).toContain("PT 141 · 13 missed");
    expect(screen.getByText("PT 141 missed")).toBeTruthy();
    expect(screen.queryAllByRole("link")).toEqual([]);
  });
});
