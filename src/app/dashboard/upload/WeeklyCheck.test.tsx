// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminTestProvider, useAdminTest } from "@/components/AdminTestContext";
import { readSection } from "@/lib/analyticsReview";
import { summarizeApprovedRows } from "@/lib/analyticsSnapshots";
import { samplePracticeTestSections } from "@/lib/adminTestWorkspace";
import { mockStudent } from "@/lib/mockData";
import { reviewPracticeTest } from "@/lib/practiceTestResult";
import type { AnalyticsExtractedRow } from "@/lib/types";
import type { WeeklyUploadBasis } from "@/lib/weeklyUploadPreview";
import type { confirmWeeklyUpload, WeeklyUploadConfirmResult } from "./actions";
import type { WeeklyUploadRead } from "./WeeklyUpload";

vi.mock("./actions", () => ({ confirmWeeklyUpload: vi.fn() }));

import WeeklyCheck from "./WeeklyCheck";
import WeeklyUploadFlow from "./WeeklyUploadFlow";

beforeEach(() => {
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = vi.fn(() => "blob:screenshot");
    static revokeObjectURL = vi.fn();
  });
  vi.stubGlobal("scrollTo", vi.fn());
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const basis = (hadPracticeTest = true, start: Pick<WeeklyUploadBasis, "plans" | "startsOn"> = { plans: "next_week", startsOn: "MONDAY" }): WeeklyUploadBasis => ({
  weekOf: "2026-10-19",
  ...start,
  student: { ...mockStudent, currentScore: 156, goalTestDate: "2027-06-01" },
  hadPracticeTest,
  priorSnapshots: [],
  priorSchedules: [],
});

const EXTRACTED_AT = "2026-10-17T17:00:00.000Z";
const LR_ROWS: AnalyticsExtractedRow[] = [
  { type: "Flaw or descriptive weakening", category: "regular", accuracy: 74 },
  { type: "Necessary assumption", category: "regular", accuracy: 76 },
  { type: "Phenomenon-hypothesis (LR)", category: "restricted", isTopPriority: true, priorityTier: "highest" },
];
const RC_ROWS: AnalyticsExtractedRow[] = (["Law", "Comparative", "Science", "Humanities", "Art"] as const)
  .map((type, index) => ({ type, category: "passage", accuracy: [58, 70, 64, 81, 77][index] }));

const png = (name: string) => new File(["image"], name, { type: "image/png" });

function read(withPracticeTest = true): WeeklyUploadRead {
  const extraction = { source: "7sage_screenshot" as const, extractedAt: EXTRACTED_AT };
  const sections = samplePracticeTestSections();
  const review = reviewPracticeTest(sections);
  if (!review.ok) throw new Error("PrepTest 158 did not produce a result");
  return {
    currentScore: 156,
    analytics: readSection(readSection(null, "LR", LR_ROWS, extraction), "RC", RC_ROWS, extraction),
    lrRead: LR_ROWS,
    files: { LR: png("lr-analytics.png"), RC: png("rc-analytics.png") },
    practiceTest: withPracticeTest ? { result: review.result, readings: sections, picks: [], extractedAt: EXTRACTED_AT } : null,
  };
}

const REFUSED: WeeklyUploadConfirmResult = { error: "Not saved in this test." };

function setup({ withPracticeTest = true, reply = REFUSED }: { withPracticeTest?: boolean; reply?: WeeklyUploadConfirmResult } = {}) {
  const confirm = vi.fn<typeof confirmWeeklyUpload>(async () => reply);
  const onBack = vi.fn();
  const user = userEvent.setup();
  render(<WeeklyCheck basis={basis(withPracticeTest)} read={read(withPracticeTest)} source="7sage_screenshot" onBack={onBack} onConfirm={confirm} />);
  return { user, confirm, onBack };
}

const confirmButton = () => screen.getByRole("button", { name: "Confirm and build next week" });
const statement = (name: string) => screen.getByRole("checkbox", { name });
const REVIEWED = "I reviewed these values and they match my screenshots.";
const LATEST = "These are my latest analytics and this week's practice test.";

describe("Check what we read", () => {
  it("shows each practice-test section, the hidden result, the type that goes first, and the current score", () => {
    setup();

    expect(screen.getByRole("heading", { level: 1, name: "Check what we read" })).toBeDefined();
    expect(screen.getByText("Compare each value with your screenshots. Nothing counts until you confirm.")).toBeDefined();
    const practiceTest = within(screen.getByRole("region", { name: "Practice test 158" }));
    expect(practiceTest.getByText("Sections · each missed count must match its 7Sage score")).toBeDefined();
    expect(practiceTest.getByText("Section 1 · RC").parentElement?.textContent).toBe("Section 1 · RCDoes not change your plan−9");
    expect(practiceTest.getByText("Section 2 · LR").parentElement?.textContent).toBe("Section 2 · LR2 missed · matches−2");
    expect(practiceTest.getByText("Section 3 · LR").parentElement?.textContent).toBe("Section 3 · LR4 missed · matches−4");
    expect(practiceTest.getByText("Section 4 · LR").parentElement?.textContent).toBe("Section 4 · LR2 missed · matches−2");
    expect(practiceTest.getByText("The cursor hid Section 3 Q18. Its score of −4 says Q18 was right.")).toBeDefined();
    expect(practiceTest.getByText("Flaw or descriptive weakening").parentElement?.textContent)
      .toBe("Flaw or descriptive weakening2 missed · goes first");
    const score = screen.getByRole("textbox", { name: "Practice test 158" }) as HTMLInputElement;
    expect(score.value).toBe("156");
    expect(within(screen.getByRole("region", { name: "Current score" })).getByText("Saved to study settings")).toBeDefined();
    expect(screen.getByLabelText("Necessary assumption accuracy")).toBeDefined();
    expect(screen.getByLabelText("Law accuracy")).toBeDefined();
  });

  it("keeps Confirm off until both statements are ticked", async () => {
    const { user, confirm } = setup();

    expect(confirmButton().getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Tick both statements to confirm.")).toBeDefined();
    await user.click(statement(REVIEWED));
    await user.click(confirmButton());
    expect(confirm).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(statement(LATEST));

    await user.click(statement(LATEST));
    expect(confirmButton().getAttribute("aria-disabled")).toBeNull();
    expect(screen.queryByText("Tick both statements to confirm.")).toBeNull();
  });

  it("keeps Confirm off for a score outside 120 to 180 and takes the student to it", async () => {
    const { user, confirm } = setup();
    const score = screen.getByRole("textbox", { name: "Practice test 158" });
    await user.click(statement(REVIEWED));
    await user.click(statement(LATEST));

    await user.clear(score);
    await user.type(score, "181");
    expect(screen.getByText("Enter a score from 120 to 180.")).toBeDefined();
    expect(screen.getByText("Enter a score from 120 to 180 to confirm.")).toBeDefined();
    await user.click(confirmButton());

    expect(confirm).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(score);
  });

  it("keeps Confirm off while an accuracy value is invalid, even with both statements ticked", async () => {
    const { user, confirm } = setup();
    await user.click(statement(REVIEWED));
    await user.click(statement(LATEST));

    await user.clear(screen.getByLabelText("Law accuracy"));
    await user.type(screen.getByLabelText("Law accuracy"), "150");
    await user.click(statement(REVIEWED));
    await user.click(statement(LATEST));
    await user.click(confirmButton());

    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByText("Fix Law above to confirm.")).toBeDefined();
    expect(screen.getByText("Enter a percentage from 0 to 100.")).toBeDefined();
  });

  it("confirms with empty RC boxes, and the saved values hold only the RC passage types that have a value", async () => {
    const { user, confirm } = setup();
    await user.clear(screen.getByLabelText("Law accuracy"));
    await user.clear(screen.getByLabelText("Art accuracy"));
    await user.click(statement(REVIEWED));
    await user.click(statement(LATEST));
    await user.click(confirmButton());

    expect(confirm).toHaveBeenCalledOnce();
    const { analytics } = confirm.mock.calls[0][0] as { analytics: { rows: unknown } };
    expect(summarizeApprovedRows(analytics.rows).rcAccuracyByType).toEqual({ Comparative: 0.7, Science: 0.64, Humanities: 0.81 });
  });

  it("sends the reviewed analytics, the section readings, and the new score when confirmed", async () => {
    const { user, confirm } = setup();
    const score = screen.getByRole("textbox", { name: "Practice test 158" });
    await user.clear(score);
    await user.type(score, "160");
    await user.clear(screen.getByLabelText("Necessary assumption accuracy"));
    await user.type(screen.getByLabelText("Necessary assumption accuracy"), "80");
    await user.click(statement(REVIEWED));
    await user.click(statement(LATEST));

    await user.click(confirmButton());

    expect(confirm).toHaveBeenCalledOnce();
    const sent = confirm.mock.calls[0][0] as { practiceTest: { readings: { section: number }[] } };
    expect(sent).toMatchObject({
      weekOf: "2026-10-19",
      currentScore: 160,
      analytics: {
        rows: expect.arrayContaining([
          expect.objectContaining({ type: "Necessary assumption", category: "regular", accuracy: 80 }),
          expect.objectContaining({ type: "Flaw or descriptive weakening", category: "regular", accuracy: 74 }),
          expect.objectContaining({ type: "Phenomenon-hypothesis (LR)", category: "restricted", isTopPriority: true }),
          expect.objectContaining({ type: "Law", category: "passage", accuracy: 58 }),
        ]),
        extraction: { source: "7sage_screenshot", extractedAt: EXTRACTED_AT },
        confirmation: { extractedValuesMatch: true, isLatestAnalytics: true },
      },
      practiceTest: {
        picks: [],
        extraction: { source: "7sage_screenshot", extractedAt: EXTRACTED_AT },
        confirmation: { extractedValuesMatch: true, isThisWeeksPracticeTest: true },
      },
    });
    expect(sent.practiceTest.readings.map(({ section }) => section)).toEqual([1, 2, 3, 4]);
  });

  it("shows the reason when the confirmation is refused", async () => {
    const { user } = setup({ reply: { error: "Upload fresh practice-test screenshots before saving." } });
    await user.click(statement(REVIEWED));
    await user.click(statement(LATEST));

    await user.click(confirmButton());

    expect(await screen.findByText("Upload fresh practice-test screenshots before saving.")).toBeDefined();
  });

  it("previews next Monday from these values, marked not confirmed, with the most-missed type first", () => {
    setup();
    const preview = within(screen.getByRole("complementary", { name: "Your screenshots and next Monday" }));

    expect(preview.getByText("Next Monday from these values")).toBeDefined();
    expect(preview.getByText("Not confirmed yet")).toBeDefined();
    expect(preview.getByAltText("Your 7Sage Logical Reasoning screenshot")).toBeDefined();
    expect(preview.getByText("goes first").parentElement?.textContent).toMatch(/^\d+ Flaw or descriptive weakening/);
  });

  it("on a weekday, checks last week's practice test and builds this week", async () => {
    const confirm = vi.fn<typeof confirmWeeklyUpload>(async () => REFUSED);
    const user = userEvent.setup();
    render(<WeeklyCheck basis={basis(true, { plans: "this_week", startsOn: "WEDNESDAY" })} read={read()} source="7sage_screenshot" onBack={() => {}} onConfirm={confirm} />);

    expect(screen.getByText("Plan this week · Check")).toBeDefined();
    const preview = within(screen.getByRole("complementary", { name: "Your screenshots and this week" }));
    expect(preview.getByText(/^This (Wednesday|Thursday|Friday|Saturday|Sunday) from these values$/)).toBeDefined();
    await user.click(statement(REVIEWED));
    await user.click(statement("These are my latest analytics and last week's practice test."));
    await user.click(screen.getByRole("button", { name: "Confirm and build this week" }));
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ weekOf: "2026-10-19" }));
  });

  it("confirms the analytics alone in a week with no practice test", async () => {
    const { user, confirm } = setup({ withPracticeTest: false });

    expect(screen.queryByRole("region", { name: /Practice test \d+/ })).toBeNull();
    expect(screen.getByText("No practice test on this week's plan")).toBeDefined();
    expect((screen.getByLabelText("Your current score") as HTMLInputElement).value).toBe("156");
    await user.click(statement(REVIEWED));
    await user.click(statement("These screenshots show my latest 7Sage analytics."));
    await user.click(confirmButton());

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ currentScore: 156, practiceTest: null }));
  });
});

function SampleButton() {
  const { setSample } = useAdminTest();
  return (
    <button type="button" onClick={() => setSample({ rows: [...LR_ROWS, ...RC_ROWS], sections: samplePracticeTestSections(), extractedAt: EXTRACTED_AT })}>
      Generate sample
    </button>
  );
}

describe("Plan next week with an admin's sample", () => {
  it("checks the sample analytics and practice test, sends them as a sample, and Back returns to the upload", async () => {
    const confirm = vi.fn<typeof confirmWeeklyUpload>(async () => REFUSED);
    const user = userEvent.setup();
    render(<AdminTestProvider><SampleButton /><WeeklyUploadFlow basis={basis()} initialScore={156} confirm={confirm} /></AdminTestProvider>);
    expect(screen.getByRole("heading", { name: "Plan next week" })).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Generate sample" }));
    expect(screen.getByRole("heading", { name: "Check what we read" })).toBeDefined();
    expect(screen.getByRole("region", { name: "Practice test 158" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.queryByRole("heading", { name: "Check what we read" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Plan next week" })).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Generate sample" }));
    await user.click(statement("I reviewed and approved these sample values."));
    await user.click(statement("Use this sample as my latest analytics and this week's practice test."));
    await user.click(confirmButton());
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      analytics: expect.objectContaining({ extraction: { source: "admin_sample", extractedAt: EXTRACTED_AT } }),
      practiceTest: expect.objectContaining({ extraction: { source: "admin_sample", extractedAt: EXTRACTED_AT } }),
    }));
  });
});

describe("Type them", () => {
  const box = (type: string) => screen.getByRole("textbox", { name: `${type} accuracy` }) as HTMLInputElement;

  async function typeAnalytics(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByLabelText("Type them"));
    expect(screen.getByText("Typed by you")).toBeDefined();
    expect(screen.getByText("No question types yet.")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Add a question type" }));
    await user.type(screen.getByRole("combobox", { name: "Search question types" }), "Necessary");
    await user.keyboard("{Enter}");
    await user.type(box("Necessary assumption"), "76");
    await user.type(box("Law"), "58");
  }

  function stubSections() {
    const fetchSpy = vi.fn(async (url: string, init: RequestInit) => {
      const file = (init.body as FormData).get("image") as File;
      const index = Number(file.name.match(/s(\d)/)?.[1]) - 1;
      return url === "/api/practice-test/extract" ? Response.json({ reading: samplePracticeTestSections()[index] }) : new Response(null, { status: 500 });
    });
    vi.stubGlobal("fetch", fetchSpy);
    return fetchSpy;
  }

  async function confirmTyped(user: ReturnType<typeof userEvent.setup>, latest: string) {
    expect(screen.getByRole("heading", { name: "Check your values" })).toBeDefined();
    expect(box("Necessary assumption").value).toBe("76");
    await user.click(statement("I copied these values from my 7Sage Analytics page."));
    await user.click(statement(latest));
    expect(screen.getByText("Your weekly schedule uses these values like a scan.")).toBeDefined();
    await user.click(confirmButton());
  }

  it("types analytics in a week with no practice test and sends them as manual_entry without a scan", async () => {
    const fetchSpy = stubSections();
    const confirm = vi.fn<typeof confirmWeeklyUpload>(async () => REFUSED);
    const user = userEvent.setup();
    render(<AdminTestProvider><WeeklyUploadFlow basis={basis(false)} initialScore={156} confirm={confirm} /></AdminTestProvider>);

    expect(screen.getByText("Screenshots or typed")).toBeDefined();
    await typeAnalytics(user);
    await user.click(screen.getByRole("button", { name: "Check the values" }));
    await confirmTyped(user, "These are my latest 7Sage analytics.");

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      analytics: expect.objectContaining({
        rows: expect.arrayContaining([
          { type: "Necessary assumption", category: "regular", accuracy: 76 },
          { type: "Law", category: "passage", accuracy: 58 },
        ]),
        extraction: { source: "manual_entry", extractedAt: expect.any(String) },
      }),
      practiceTest: null,
    }));
  });

  it("types analytics in a practice-test week, reads only the 4 sections, and keeps the screenshot source on the practice test", async () => {
    const fetchSpy = stubSections();
    const confirm = vi.fn<typeof confirmWeeklyUpload>(async () => REFUSED);
    const user = userEvent.setup();
    render(<AdminTestProvider><WeeklyUploadFlow basis={basis()} initialScore={156} confirm={confirm} /></AdminTestProvider>);

    await typeAnalytics(user);
    await user.upload(screen.getByLabelText("All 4 section screenshots file"), ["pt-s1.png", "pt-s2.png", "pt-s3.png", "pt-s4.png"].map(png));
    await user.click(screen.getByRole("button", { name: "Read my 4 sections" }));
    await user.click(await screen.findByRole("button", { name: "Check the values" }));
    await confirmTyped(user, "These are my latest analytics and this week's practice test.");

    expect(fetchSpy).toHaveBeenCalledTimes(4);
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      analytics: expect.objectContaining({ extraction: { source: "manual_entry", extractedAt: expect.any(String) } }),
      practiceTest: expect.objectContaining({ extraction: { source: "7sage_screenshot", extractedAt: expect.any(String) } }),
    }));
  });

  it("with scanning off, opens Type them, skips the practice test, and confirms without it", async () => {
    const fetchSpy = stubSections();
    const confirm = vi.fn<typeof confirmWeeklyUpload>(async () => REFUSED);
    const user = userEvent.setup();
    render(
      <AdminTestProvider>
        <WeeklyUploadFlow basis={basis()} initialScore={156} scanningOff={{ analytics: true, "practice-test-section": true }} confirm={confirm} />
      </AdminTestProvider>,
    );

    expect(screen.getByText("Scanning is off right now. Enter your analytics by hand.")).toBeDefined();
    expect(screen.getByText("Next week starts Monday, Oct 19. Type this week's analytics, and we build your weekly schedule from them.")).toBeDefined();
    expect((screen.getByLabelText("Type them") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Screenshots") as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText("Practice test skipped this week")).toBeDefined();
    expect(screen.queryByLabelText("All 4 section screenshots file")).toBeNull();

    await typeAnalytics(user);
    await user.click(screen.getByRole("button", { name: "Check the values" }));
    expect(within(screen.getByRole("region", { name: "Practice test" }))
      .getByText("Skipped this week because scanning is off. Next week's schedule won't put a missed question type first.")).toBeDefined();
    await confirmTyped(user, "These are my latest 7Sage analytics. I'm skipping this week's practice test.");

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      analytics: expect.objectContaining({ extraction: { source: "manual_entry", extractedAt: expect.any(String) } }),
      practiceTest: null,
    }));
  });

  it("keeps the read button off until a typed value is fixed", async () => {
    const user = userEvent.setup();
    render(<AdminTestProvider><WeeklyUploadFlow basis={basis(false)} initialScore={156} confirm={vi.fn()} /></AdminTestProvider>);

    await typeAnalytics(user);
    await user.clear(box("Law"));
    await user.type(box("Law"), "104");
    await user.tab();
    expect(screen.getByText("Enter a percentage from 0 to 100.")).toBeDefined();
    expect((screen.getByRole("button", { name: "Check the values" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Fix Law above to continue.")).toBeDefined();
  });
});
