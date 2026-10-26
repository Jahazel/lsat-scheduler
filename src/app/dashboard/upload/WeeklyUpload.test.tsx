// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WeeklyUpload from "./WeeklyUpload";
import { mockStudent } from "@/lib/mockData";
import { PT158_FIXTURES } from "@/lib/practiceTestFixtures/pt158";
import type { LRSectionReading, SectionReading } from "@/lib/practiceTestResult";
import type { WeeklyUploadBasis } from "@/lib/weeklyUpload";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const WEDNESDAY = { plans: "this_week", startsOn: "WEDNESDAY" } as const;

const basis = (hadPracticeTest = true, start: Pick<WeeklyUploadBasis, "plans" | "startsOn"> = { plans: "next_week", startsOn: "MONDAY" }): WeeklyUploadBasis => ({
  weekOf: "2026-10-05",
  ...start,
  student: { ...mockStudent, currentScore: 156, goalTestDate: "2027-06-01" },
  hadPracticeTest,
  priorSnapshots: [],
  priorSchedules: [],
});

const LR_ROWS = [
  { type: "Strengthen", category: "regular", accuracy: 68 },
  { type: "Flaw or descriptive weakening", category: "regular", accuracy: 74 },
  { type: "Causal reasoning", category: "restricted", isTopPriority: true, priorityTier: "highest" },
];
const RC_ROWS = ["Law", "Comparative", "Science", "Humanities", "Art"].map((type, index) => ({ type, category: "passage", accuracy: 60 + index }));

const sample = (section: number) => structuredClone(PT158_FIXTURES[section - 1].reading);

function stubServer(sections: Record<string, SectionReading | Response> = {}, analytics: Partial<Record<"LR" | "RC", Response>> = {}) {
  const readings: Record<string, SectionReading | Response> = {
    "pt158-s1.png": sample(1), "pt158-s2.png": sample(2), "pt158-s3.png": sample(3), "pt158-s4.png": sample(4), ...sections,
  };
  const fetchSpy = vi.fn(async (url: string, init: RequestInit) => {
    const form = init.body as FormData;
    const file = form.get("image") as File;
    if (url === "/api/analytics/extract") {
      const section = form.get("section") as "LR" | "RC";
      return analytics[section] ?? Response.json({ rows: section === "LR" ? LR_ROWS : RC_ROWS });
    }
    const reading = readings[file.name] ?? { page: "other" };
    return reading instanceof Response ? reading : Response.json({ reading });
  });
  vi.stubGlobal("fetch", fetchSpy);
  return fetchSpy;
}

const png = (name: string) => new File(["image"], name, { type: "image/png" });
const SECTION_FILES = ["pt158-s1.png", "pt158-s2.png", "pt158-s3.png", "pt158-s4.png"];

function setup(hadPracticeTest = true, start?: Pick<WeeklyUploadBasis, "plans" | "startsOn">) {
  const onCheckValues = vi.fn();
  const user = userEvent.setup();
  render(<WeeklyUpload basis={basis(hadPracticeTest, start)} initialScore={156} onCheckValues={onCheckValues} />);
  return { user, onCheckValues };
}

async function addAnalytics(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(screen.getByLabelText("Logical Reasoning screenshot file"), png("lr-analytics.png"));
  await user.upload(screen.getByLabelText("Reading Comprehension screenshot file"), png("rc-analytics.png"));
}

async function addSections(user: ReturnType<typeof userEvent.setup>, names = SECTION_FILES) {
  await user.upload(screen.getByLabelText("All 4 section screenshots file"), names.map(png));
}

const button = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;

async function readAll(user: ReturnType<typeof userEvent.setup>, names = SECTION_FILES) {
  await addAnalytics(user);
  await addSections(user, names);
  await user.click(button("Read my screenshots"));
  await queueEmpty();
}

const queueEmpty = () => waitFor(() => expect(screen.queryByText(/ · (Waiting to read|Reading now)$/)).toBeNull());

describe("WeeklyUpload", () => {
  it("asks for 6 screenshots with the score from Study settings and the read button off", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Plan next week" })).toBeDefined();
    expect(screen.getByText("Next week starts Monday, Oct 5. Add this week's screenshots, and we build your weekly schedule from them.")).toBeDefined();
    expect((screen.getByLabelText("Current score") as HTMLInputElement).value).toBe("156");
    expect(screen.getAllByText("Waiting")).toHaveLength(4);
    expect(button("Read my screenshots").disabled).toBe(true);
    expect(screen.getByText("Add all 6 screenshots, or type your analytics and add the 4 sections. You check every value before it counts.")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Where to find them" })).toBeDefined();
  });

  it("fills the 4 section rows from one drop and lets each file be replaced", async () => {
    const { user } = setup();
    await addSections(user);
    expect(screen.queryByText("Waiting")).toBeNull();
    SECTION_FILES.forEach((name) => expect(screen.getByText(name)).toBeDefined());

    await user.upload(screen.getByLabelText("Replacement for pt158-s3.png"), png("retake-s3.png"));
    expect(screen.queryByText("pt158-s3.png")).toBeNull();
    expect(screen.getByText("retake-s3.png")).toBeDefined();

    expect(button("Read my screenshots").disabled).toBe(true);
    await addAnalytics(user);
    expect(button("Read my screenshots").disabled).toBe(false);
  });

  it("shows each read file, what we found, and next week's preview, then hands the read values on", async () => {
    stubServer();
    const { user, onCheckValues } = setup();
    await readAll(user);

    expect(screen.getByText("Next week starts Monday, Oct 5. We read all 6 screenshots. Check them, then build your weekly schedule.")).toBeDefined();
    expect(screen.getByText("lr-analytics.png · 3 question types")).toBeDefined();
    expect(screen.getByText("Section 1 · Reading Comprehension")).toBeDefined();
    expect(screen.getByText("pt158-s1.png · score −9")).toBeDefined();
    expect(screen.getByText("Section 3 · Logical Reasoning")).toBeDefined();
    expect(screen.getByText("Your score on practice test 158? Type it here. We save it to your study settings.")).toBeDefined();
    const summary = screen.getByRole("heading", { name: "Screenshots" }).closest("section") as HTMLElement;
    expect(within(summary).getByText("6 of 6 read")).toBeDefined();
    expect(within(summary).getAllByRole("listitem").map((row) => row.textContent)).toEqual([
      "LR analytics3 typesReplace", "RC analytics5 typesReplace",
      "PT 158 · Section 1 · RC−9Replace", "PT 158 · Section 2 · LR−2Replace", "PT 158 · Section 3 · LR−4Replace", "PT 158 · Section 4 · LR−2Replace",
    ]);

    const found = screen.getByRole("region", { name: "What we found" });
    expect(within(found).getByText("What we found · practice test 158 · score 156")).toBeDefined();
    expect(within(found).getByRole("heading", { name: "Flaw or descriptive weakening goes first next week." })).toBeDefined();
    expect(within(found).getByText("You missed it 2 times. No other type was missed more than once.")).toBeDefined();
    expect(within(found).getByText("S2 Q18 · S4 Q18")).toBeDefined();
    expect(within(found).getByText("S3 Q23 unanswered")).toBeDefined();
    expect(within(found).getByText("8 missed in all · each section matches its 7Sage score")).toBeDefined();
    expect(within(found).getByText("Section 1 is Reading Comprehension. It does not change your plan.")).toBeDefined();
    expect(within(found).getAllByRole("listitem")).toHaveLength(3);
    await user.click(within(found).getByRole("button", { name: "See all 7 types" }));
    expect(within(found).getAllByRole("listitem")).toHaveLength(7);

    const preview = screen.getByRole("region", { name: "Next week" });
    expect(within(preview).getByText(/^Oct 5–11 · .* of study · practice test on Saturday$/)).toBeDefined();
    expect(within(preview).getByText("Mon 5")).toBeDefined();
    expect(within(preview).getByText("PT")).toBeDefined();
    expect(within(preview).getByText("Monday's drills").textContent).toBe("Monday's drills · Oct 5");
    expect(within(preview).getByText("Read from your screenshots · not confirmed")).toBeDefined();
    expect(within(preview).getByText("Goes first").closest("li")?.textContent).toContain("Flaw or descriptive weakening");

    expect(screen.getByText("Next, you check what we read. Nothing changes until you confirm.")).toBeDefined();
    await user.click(button("Check the values"));
    expect(onCheckValues).toHaveBeenCalledOnce();
    const [read] = onCheckValues.mock.calls[0];
    expect(read.currentScore).toBe(156);
    expect(read.practiceTest.result.missedStemTypeCounts["Flaw or descriptive weakening"]).toBe(2);
    expect(read.practiceTest.readings.map(({ section }: { section: number }) => section)).toEqual([1, 2, 3, 4]);
    expect(read.files.LR.name).toBe("lr-analytics.png");
    expect(read.analytics.rows).toHaveLength(LR_ROWS.length + RC_ROWS.length);
  });

  it("asks only for the 2 analytics screenshots when this week had no practice test", async () => {
    stubServer();
    const { user } = setup(false);
    expect(screen.getByText("Next week starts Monday, Oct 5. This week had no practice test, so we need only your 2 analytics screenshots.")).toBeDefined();
    expect(screen.queryByLabelText("All 4 section screenshots file")).toBeNull();
    expect(screen.getByText("No practice test on this week's plan")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Where to find it" })).toBeDefined();
    expect(screen.getByText("Add both screenshots, or type your analytics. You check every value before it counts.")).toBeDefined();

    await addAnalytics(user);
    await user.click(button("Read my screenshots"));
    await screen.findByText("rc-analytics.png · 5 passage types");
    expect(screen.queryByRole("region", { name: "What we found" })).toBeNull();
    expect(within(screen.getByRole("region", { name: "Next week" })).getByText("Monday's drills").textContent).toBe("Monday's drills · Oct 5");
    expect(screen.queryByText("Goes first")).toBeNull();
    expect(button("Check the values").disabled).toBe(false);
  });

  it("reads an RC screenshot with no passage-type percentage and lets the student check the values", async () => {
    stubServer({}, { RC: Response.json({ rows: [] }) });
    const { user } = setup(false);

    await addAnalytics(user);
    await user.click(button("Read my screenshots"));
    await screen.findByText("rc-analytics.png · 0 passage types");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(button("Check the values").disabled).toBe(false);
  });

  it("on a weekday, plans the rest of this week from last week's practice test", async () => {
    stubServer();
    const { user } = setup(true, WEDNESDAY);
    expect(screen.getByRole("heading", { name: "Plan this week" })).toBeDefined();
    expect(screen.getByText("Your plan starts today and runs to Sunday, Oct 11. Add last week's screenshots, and we build your weekly schedule from them.")).toBeDefined();
    await readAll(user);

    expect(within(screen.getByRole("region", { name: "What we found" }))
      .getByRole("heading", { name: "Flaw or descriptive weakening goes first this week." })).toBeDefined();
    const preview = screen.getByRole("region", { name: "This week" });
    expect(within(preview).getByText(/^Oct 7–11 · /)).toBeDefined();
    expect(within(preview).queryByText("Mon 5")).toBeNull();
    expect(within(preview).queryByText("Tue 6")).toBeNull();
    expect(within(preview).getByText("Wed 7")).toBeDefined();
    expect(within(preview).getByText("Goes first").closest("li")?.textContent).toContain("Flaw or descriptive weakening");
  });

  it("on a weekday after a week with no practice test, asks only for the 2 analytics screenshots", () => {
    setup(false, WEDNESDAY);
    expect(screen.getByText("Your plan starts today and runs to Sunday, Oct 11. Last week had no practice test, so we need only your 2 analytics screenshots.")).toBeDefined();
    expect(screen.queryByLabelText("All 4 section screenshots file")).toBeNull();
    expect(screen.getByText("No practice test on last week's plan")).toBeDefined();
    expect(screen.getByText("This week's order comes from your analytics only. No question type goes first from a practice test.")).toBeDefined();
  });

  it("keeps the button off for a score outside 120 to 180", async () => {
    stubServer();
    const { user } = setup();
    await addAnalytics(user);
    await addSections(user);
    const score = screen.getByLabelText("Current score");
    await user.clear(score);
    await user.type(score, "98");
    expect(screen.getByText("Enter a score from 120 to 180.")).toBeDefined();
    expect(score.getAttribute("aria-invalid")).toBe("true");
    expect(button("Read my screenshots").disabled).toBe(true);

    await user.clear(score);
    await user.type(score, "158");
    await user.click(button("Read my screenshots"));
    await queueEmpty();
    expect(button("Check the values").disabled).toBe(false);
    await user.type(score, "0");
    expect(button("Check the values").disabled).toBe(true);
  });

  it("marks a wrong page on its row and keeps the button off", async () => {
    stubServer({ "pt158-s4.png": { page: "analytics" } });
    const { user } = setup();
    await readAll(user);
    const row = screen.getByText("Not a practice test review").closest("[data-file-row]") as HTMLElement;
    expect(within(row).getByText("This shows your Analytics page. Add the Review page of your practice test, one section per screenshot.")).toBeDefined();
    expect(within(row).getByRole("button", { name: "Replace pt158-s4.png" })).toBeDefined();
    expect(screen.getByText("Section 4 is missing")).toBeDefined();
    expect(button("Check the values").disabled).toBe(true);
  });

  it("offers Remove on a repeated section, then reads the missing section from its own drop row", async () => {
    stubServer({ "pt158-s2 (1).png": sample(2) });
    const { user } = setup();
    await readAll(user, ["pt158-s1.png", "pt158-s2.png", "pt158-s2 (1).png", "pt158-s4.png"]);
    const again = screen.getByText("Section 2 · again").closest("[data-file-row]") as HTMLElement;
    expect(within(again).getByText("Section 2 is already added. Remove this one, then add Section 3.")).toBeDefined();
    expect(screen.getByText("Section 3 is missing")).toBeDefined();
    expect(button("Check the values").disabled).toBe(true);

    await user.click(within(again).getByRole("button", { name: "Remove pt158-s2 (1).png" }));
    expect(screen.queryByText("Section 2 · again")).toBeNull();
    expect(button("Check the values").disabled).toBe(true);

    await user.upload(screen.getByLabelText("Section 3 is missing file"), png("pt158-s3.png"));
    expect(await screen.findByText("pt158-s3.png · score −4")).toBeDefined();
    expect(screen.queryByText("Section 3 is missing")).toBeNull();
    expect(button("Check the values").disabled).toBe(false);
  });

  it("names where a cut-off section stops and reads a replacement", async () => {
    const cut = sample(4) as LRSectionReading;
    cut.rows = cut.rows.slice(0, 20);
    cut.reachesEnd = false;
    stubServer({ "pt158-s4.png": cut, "pt158-s4-full.png": sample(4) });
    const { user } = setup();
    await readAll(user);
    const row = screen.getByText("pt158-s4.png · ends at Q20").closest("[data-file-row]") as HTMLElement;
    expect(within(row).getByText("Section 4 stops at Q20. A Logical Reasoning section has 24 to 26 questions. Take the screenshot again, down to the last one.")).toBeDefined();
    expect(button("Check the values").disabled).toBe(true);

    await user.upload(screen.getByLabelText("Replacement for pt158-s4.png"), png("pt158-s4-full.png"));
    expect(await screen.findByText("pt158-s4-full.png · score −2")).toBeDefined();
    expect(button("Check the values").disabled).toBe(false);
  });

  it("asks which hidden question was missed when the score cannot decide, and counts the pick", async () => {
    const hidden = sample(3) as LRSectionReading;
    hidden.score = -5;
    hidden.rows[18] = { ...hidden.rows[18], result: "hidden" };
    stubServer({ "pt158-s3.png": hidden });
    const { user, onCheckValues } = setup();
    await readAll(user);
    const pick = screen.getByRole("group", { name: "Section 3: which question did you miss?" });
    expect(within(pick).getByText("The cursor hides Q18 and Q19. The score of −5 says you missed one of them.")).toBeDefined();
    expect(button("Check the values").disabled).toBe(true);

    await user.click(within(pick).getByRole("button", { name: "Q18 · Argument part" }));
    expect(within(pick).getByRole("button", { name: "Q18 · Argument part" }).getAttribute("aria-pressed")).toBe("true");
    expect(button("Check the values").disabled).toBe(false);
    await user.click(button("Check the values"));
    expect(onCheckValues.mock.calls[0][0].practiceTest.result.missedStemTypeCounts["Argument part"]).toBe(1);
  });

  it("asks again when the screenshot a hidden result was picked on is replaced", async () => {
    const hidden = () => {
      const reading = sample(3) as LRSectionReading;
      reading.score = -5;
      reading.rows[18] = { ...reading.rows[18], result: "hidden" };
      return reading;
    };
    stubServer({ "pt158-s3.png": hidden(), "retake-s3.png": hidden() });
    const { user } = setup();
    await readAll(user);
    const group = "Section 3: which question did you miss?";
    await user.click(within(screen.getByRole("group", { name: group })).getByRole("button", { name: "Q18 · Argument part" }));
    expect(button("Check the values").disabled).toBe(false);

    await user.upload(screen.getAllByLabelText("Replacement for pt158-s3.png")[0], png("retake-s3.png"));
    const pick = await screen.findByRole("group", { name: group });
    expect(within(pick).getByRole("button", { name: "Q18 · Argument part" }).getAttribute("aria-pressed")).toBe("false");
    expect(button("Check the values").disabled).toBe(true);
  });

  it("checks the sections that were read when another section's file could not be read", async () => {
    const cut = sample(3) as LRSectionReading;
    cut.rows = cut.rows.slice(0, 20);
    cut.reachesEnd = false;
    stubServer({ "pt158-s3.png": cut, "pt158-s4.png": new Response(null, { status: 502 }) });
    const { user } = setup();
    await readAll(user);
    const cutRow = (await screen.findByText("pt158-s3.png · ends at Q20")).closest("[data-file-row]") as HTMLElement;
    expect(within(cutRow).getByText(/^Section 3 stops at Q20\./)).toBeDefined();
    const failedRow = screen.getByText("We couldn't read this screenshot").closest("[data-file-row]") as HTMLElement;
    expect(within(failedRow).getByText("Couldn't read that screenshot. Try again or a clearer image.")).toBeDefined();
    expect(screen.queryByText("Section 4 is missing")).toBeNull();
    expect(button("Check the values").disabled).toBe(true);
  });

  it("keeps the button off while any section file could not be read, even with all 4 sections read", async () => {
    stubServer({ "unreadable.png": new Response(null, { status: 502 }) });
    const { user } = setup();
    await readAll(user, ["pt158-s1.png", "pt158-s2.png", "pt158-s3.png", "wrong.png"]);
    await user.upload(screen.getByLabelText("Section 4 is missing file"), png("pt158-s4.png"));
    expect(await screen.findByText("pt158-s4.png · score −2")).toBeDefined();

    await user.upload(screen.getAllByLabelText("Replacement for wrong.png")[0], png("unreadable.png"));
    expect(await screen.findByText("Couldn't read that screenshot. Try again or a clearer image.")).toBeDefined();
    await queueEmpty();
    expect(button("Check the values").disabled).toBe(true);
  });

  it("shows a rejected replacement on its full file row, not only in the phone summary", async () => {
    stubServer();
    const { user } = setup();
    await readAll(user);
    const tooLarge = new File([new Uint8Array(5 * 1024 * 1024)], "huge.png", { type: "image/png" });
    await user.upload(screen.getAllByLabelText("Replacement for pt158-s2.png")[0], tooLarge);
    const message = screen.getByText("That file is 5.0 MB. Choose one that is 4 MB or less.");
    expect(message.closest(".max-md\\:hidden")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Screenshots" })).toBeNull();
  });

  it.each([
    ["a section from another practice test", { ...sample(4), prepTest: 157 }, "This is practice test 157. Your other sections are from practice test 158. Add the 4 sections of one practice test."],
    ["a score that does not match the misses read", { ...sample(4), score: -3 }, "The score of −3 does not match the 2 missed questions we read. Take the screenshot again with every result in view."],
  ])("explains %s on its row", async (_name, reading, message) => {
    stubServer({ "pt158-s4.png": reading as SectionReading });
    const { user } = setup();
    await readAll(user);
    expect(screen.getByText(message).closest("[data-file-row]")?.textContent).toContain("pt158-s4.png");
    expect(button("Check the values").disabled).toBe(true);
  });

  it("shows an analytics read failure on its row and keeps the button off", async () => {
    stubServer({}, { LR: new Response(null, { status: 502 }) });
    const { user } = setup();
    await addAnalytics(user);
    await addSections(user);
    await user.click(button("Read my screenshots"));
    expect(await screen.findByText("Couldn't read that screenshot. Try again or a clearer image.")).toBeDefined();
    await queueEmpty();
    expect(button("Check the values").disabled).toBe(true);
  });

  it("reads one screenshot at a time, in page order, with the rest waiting", async () => {
    const order: string[] = [];
    let running = 0;
    let mostRunning = 0;
    const server = stubServer();
    const answer = server.getMockImplementation()!;
    server.mockImplementation(async (url, init) => {
      running += 1;
      mostRunning = Math.max(mostRunning, running);
      order.push(((init.body as FormData).get("image") as File).name);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      return answer(url, init);
    });
    const { user } = setup();
    await addAnalytics(user);
    await addSections(user);
    await user.click(button("Read my screenshots"));

    expect(screen.getByText("lr-analytics.png · Reading now")).toBeDefined();
    expect(screen.getByText("rc-analytics.png · Waiting to read")).toBeDefined();
    expect(screen.getAllByText(/^pt158-s\d\.png · Waiting to read$/)).toHaveLength(4);
    expect(button("Reading 1 of 6…").disabled).toBe(true);
    expect(screen.getByText("Each screenshot takes up to 30 seconds.")).toBeDefined();
    await queueEmpty();

    expect(mostRunning).toBe(1);
    expect(order).toEqual(["lr-analytics.png", "rc-analytics.png", ...SECTION_FILES]);
    expect(button("Check the values").disabled).toBe(false);
  });

  it("stops the waiting screenshots at the daily scan limit and keeps what was read", async () => {
    const message = "You've read 10 screenshots today. You can scan again tomorrow, after midnight Central time.";
    const server = stubServer({}, { RC: Response.json({ error: message, reason: "daily-limit" }, { status: 429 }) });
    const { user } = setup();
    await readAll(user);

    expect(screen.getByText("lr-analytics.png · 3 question types")).toBeDefined();
    expect(screen.getAllByText(message)).toHaveLength(5);
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(server).toHaveBeenCalledTimes(2);
    expect(button("Check the values").disabled).toBe(true);
  });

  it("offers Try again when the last screenshot is still being read, and reads it on the press", async () => {
    const server = stubServer({}, {
      LR: Response.json({ error: "We're still reading your last screenshot. Wait a moment, then try this one.", reason: "still-reading" }, { status: 429 }),
    });
    const { user } = setup(false);
    await addAnalytics(user);
    await user.click(button("Read my screenshots"));
    await queueEmpty();
    expect(screen.getByText("We're still reading your last screenshot. Wait a moment, then try this one.")).toBeDefined();
    expect(screen.getByText("rc-analytics.png · 5 passage types")).toBeDefined();

    stubServer();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("lr-analytics.png · 3 question types")).toBeDefined();
    expect(server).toHaveBeenCalledTimes(2);
  });

  it("says a read that took too long stopped, and one Try again sends one new read", async () => {
    stubServer({ "pt158-s2.png": new Response(null, { status: 504 }) });
    const { user } = setup();
    await readAll(user);
    expect(screen.getByText("Reading took too long and stopped. Try again.")).toBeDefined();

    const retry = stubServer();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("pt158-s2.png · score −2");
    expect(retry).toHaveBeenCalledOnce();
    expect(button("Check the values").disabled).toBe(false);
  });
});

describe("WeeklyUpload · Type them", () => {
  it("reads the analytics screenshots when the student switches back to them after the sections were read", async () => {
    const fetchSpy = stubServer();
    const { user } = setup();
    await addAnalytics(user);
    await user.click(screen.getByLabelText("Type them"));
    await user.click(screen.getByRole("button", { name: "Add a question type" }));
    await user.type(screen.getByRole("combobox", { name: "Search question types" }), "Necessary");
    await user.keyboard("{Enter}");
    await user.type(screen.getByRole("textbox", { name: "Necessary assumption accuracy" }), "76");
    await addSections(user);
    await user.click(button("Read my 4 sections"));
    await queueEmpty();
    expect(fetchSpy).toHaveBeenCalledTimes(4);

    await user.click(screen.getByLabelText("Screenshots"));
    await user.click(screen.getByLabelText("Type them"));
    await user.click(screen.getByLabelText("Screenshots"));
    expect(fetchSpy).toHaveBeenCalledTimes(4);
    expect(screen.getByText("Read your analytics screenshots to continue.")).toBeDefined();

    await user.click(button("Read my screenshots"));
    await queueEmpty();

    expect(fetchSpy).toHaveBeenCalledTimes(6);
    expect(screen.getByText("lr-analytics.png · 3 question types")).toBeDefined();
    expect(button("Check the values").disabled).toBe(false);
  }, 15_000);

  it("reads no analytics screenshot that is still waiting once the student switches to Type them", async () => {
    let releaseLr: () => void = () => {};
    const lrHeld = new Promise<void>((resolve) => { releaseLr = resolve; });
    const fetchSpy = vi.fn(async (url: string, init: RequestInit) => {
      const form = init.body as FormData;
      if (url === "/api/analytics/extract") {
        const section = form.get("section");
        if (section === "LR") await lrHeld;
        return Response.json({ rows: section === "LR" ? LR_ROWS : RC_ROWS });
      }
      return Response.json({ reading: sample(Number((form.get("image") as File).name.match(/s(\d)/)?.[1])) });
    });
    vi.stubGlobal("fetch", fetchSpy);
    const { user } = setup();
    await addAnalytics(user);
    await addSections(user);
    await user.click(button("Read my screenshots"));
    await screen.findByText("lr-analytics.png · Reading now");

    await user.click(screen.getByLabelText("Type them"));
    releaseLr();
    await queueEmpty();

    const analyticsSections = () => fetchSpy.mock.calls
      .filter(([url]) => url === "/api/analytics/extract")
      .map(([, init]) => (init.body as FormData).get("section"));
    expect(analyticsSections()).toEqual(["LR"]);
    expect(fetchSpy).toHaveBeenCalledTimes(5);

    await user.click(screen.getByLabelText("Screenshots"));
    expect(analyticsSections()).toEqual(["LR"]);
    expect(screen.getByText("Read your analytics screenshots to continue.")).toBeDefined();
    await user.click(button("Read my screenshots"));
    await queueEmpty();
    expect(analyticsSections()).toEqual(["LR", "RC"]);
  }, 15_000);

  it("names only the values when typed values are the one thing left to fix", async () => {
    stubServer();
    const { user } = setup(false);
    await addAnalytics(user);
    await user.click(button("Read my screenshots"));
    await queueEmpty();

    await user.click(screen.getByLabelText("Type them"));

    expect(screen.getByText("Next week starts Monday, Oct 5. Fix the values marked below, then check them.")).toBeDefined();
  });

  it("names the typed values, not the screenshots, when a typed value breaks after reading", async () => {
    stubServer();
    const { user } = setup();
    await user.click(screen.getByLabelText("Type them"));
    await user.click(screen.getByRole("button", { name: "Add a question type" }));
    await user.type(screen.getByRole("combobox", { name: "Search question types" }), "Necessary");
    await user.keyboard("{Enter}");
    await user.type(screen.getByRole("textbox", { name: "Necessary assumption accuracy" }), "76");
    await addSections(user);
    await user.click(button("Read my 4 sections"));
    await queueEmpty();
    const summary = screen.getByRole("heading", { name: "Screenshots" }).closest("section") as HTMLElement;
    expect(within(summary).getByText("4 of 4 read")).toBeDefined();

    await user.clear(screen.getByRole("textbox", { name: "Necessary assumption accuracy" }));
    await user.type(screen.getByRole("textbox", { name: "Necessary assumption accuracy" }), "104");

    expect(screen.getByText("Next week starts Monday, Oct 5. Fix the values marked below, then check them.")).toBeDefined();
    expect(screen.getByText("Fix Necessary assumption above to continue.")).toBeDefined();
    expect(button("Check the values").disabled).toBe(true);
  }, 15_000);
});
