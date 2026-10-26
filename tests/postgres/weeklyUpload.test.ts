import { renderToStaticMarkup } from "react-dom/server";
import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { createAppTestDatabase } from "./appTestDatabase";
import { closePostgresDatabase } from "../../src/lib/postgres";
import { createStudent, findStudentByAccountId } from "../../src/lib/studentRepository";
import { createApprovedAnalyticsSnapshot, listApprovedAnalyticsSnapshots } from "../../src/lib/analyticsSnapshotRepository";
import { listWeeklySchedulesForStudent } from "../../src/lib/weeklyScheduleRepository";
import { approveWeeklyUpload, listApprovedPracticeTestResults } from "../../src/lib/weeklyUploadRepository";
import { prepareWeeklyUploadApproval } from "../../src/lib/weeklyUploadApproval";
import { PT158_FIXTURES } from "../../src/lib/practiceTestFixtures/pt158";
import { postgresAdminTestRepositories } from "../../src/lib/adminTestRepositories";
import { resetTestWorkspace } from "../../src/lib/adminTestWorkspace";
import { confirmWeeklyUpload } from "../../src/app/dashboard/upload/actions";
import DashboardPage from "../../src/app/dashboard/page";
import WeeklyUploadPage from "../../src/app/dashboard/upload/page";
import ProgressPage from "../../src/app/progress/page";
import type { Student } from "../../src/lib/types";

const state = vi.hoisted((): { session: Session | null } => ({ session: null }));
vi.mock("@/auth", () => ({ auth: async () => state.session }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/dashboard",
  redirect: (path: string) => { throw new Error(`redirect:${path}`); },
  notFound: () => { throw new Error("not-found"); },
}));

let database: Awaited<ReturnType<typeof createAppTestDatabase>>;
const originalSetting = process.env.DATABASE_URL;
beforeAll(async () => {
  await closePostgresDatabase();
  database = await createAppTestDatabase();
  process.env.DATABASE_URL = database.setting;
});
beforeEach(async () => {
  state.session = null;
  vi.useFakeTimers({ toFake: ["Date"] });
  await database.owner.execute(sql`truncate accounts cascade`);
  await database.owner.execute(sql`truncate scan_spending`);
  await database.owner.execute(sql`update scan_settings set scanning_off = false, monthly_limit_usd = 10`);
});
afterAll(async () => {
  vi.useRealTimers();
  await closePostgresDatabase();
  process.env.DATABASE_URL = originalSetting;
  await database?.cleanup();
});

const MONDAY = new Date("2026-10-12T16:00:00Z");
const SATURDAY = new Date("2026-10-17T17:00:00Z");
const NEXT_MONDAY = new Date("2026-10-19T16:00:00Z");
const RC = { Law: 58, Comparative: 70, Science: 64, Humanities: 81, Art: 77 };

const profile: Student = {
  currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
};

const progress = async () => renderToStaticMarkup(await ProgressPage({ searchParams: Promise.resolve({}) }));
const dashboard = async () => renderToStaticMarkup(await DashboardPage({ searchParams: Promise.resolve({}) }));
const uploadPage = async () => renderToStaticMarkup(await WeeklyUploadPage());

async function studentWithThisWeek(role: "student" | "admin" = "student") {
  vi.setSystemTime(MONDAY);
  const account = await database.createAccountAsOwner({ email: `${role}@example.test`, name: "Sam", role });
  if (!account) throw new Error("Account fixture already exists");
  const saved = await createStudent(account.id, profile);
  if (!saved) throw new Error("Student fixture already exists");
  await createApprovedAnalyticsSnapshot(saved.id, {
    status: "approved", weekOf: "2026-10-12", lrAccuracyByType: { Strengthen: 0.7 }, lrTopPriorityLogicTypes: [],
    rcAccuracyByType: { Law: 0.58, Comparative: 0.7, Science: 0.64, Humanities: 0.81, Art: 0.77 },
    approvedAt: MONDAY, extraction: { source: "7sage_screenshot", extractedAt: MONDAY },
    confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt: MONDAY },
  });
  state.session = { user: { id: account.id, role, email: `${role}@example.test`, name: "Sam" }, expires: "2099-01-01" };
  await dashboard();
  return { accountId: account.id, studentId: saved.id };
}

function upload(at: Date, { currentScore = 160, source = "7sage_screenshot", weekOf = "2026-10-19" } = {}) {
  const extractedAt = new Date(at.getTime() - 5 * 60_000).toISOString();
  const confirmedAt = new Date(at.getTime() - 60_000).toISOString();
  return {
    weekOf,
    currentScore,
    analytics: {
      rows: [
        { type: "Flaw or descriptive weakening", category: "regular", accuracy: 74 },
        { type: "Weaken", category: "regular", accuracy: 70 },
        { type: "Necessary assumption", category: "regular", accuracy: 76 },
        { type: "Phenomenon-hypothesis (LR)", category: "restricted", isTopPriority: true },
        ...Object.entries(RC).map(([type, accuracy]) => ({ type, category: "passage", accuracy })),
      ],
      extraction: { source, extractedAt },
      confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt },
    },
    practiceTest: {
      readings: PT158_FIXTURES.map(({ reading }) => reading),
      picks: [],
      extraction: { source, extractedAt },
      confirmation: { extractedValuesMatch: true, isThisWeeksPracticeTest: true, confirmedAt },
    },
  };
}

async function saved(studentId: string, accountId: string) {
  return {
    snapshots: await listApprovedAnalyticsSnapshots(studentId),
    practiceTests: await listApprovedPracticeTestResults(studentId),
    score: (await findStudentByAccountId(accountId))?.currentScore,
  };
}

it("a Saturday confirmation saves the snapshot, the practice-test result, and the score, then opens This week without the reminder", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  expect(await dashboard()).toContain("Plan next week");

  await expect(confirmWeeklyUpload(upload(SATURDAY))).rejects.toThrow("redirect:/dashboard");

  const after = await saved(studentId, accountId);
  expect(after.snapshots).toHaveLength(2);
  expect(after.practiceTests).toEqual([expect.objectContaining({
    prepTest: 158, approvedAt: SATURDAY.toISOString(), missedStemTypeCounts: expect.objectContaining({ "Flaw or descriptive weakening": 2 }),
  })]);
  expect(after.score).toBe(160);
  const thisWeek = await dashboard();
  expect(thisWeek).toContain("Your plan for this week");
  expect(thisWeek).not.toContain("Plan next week");
  expect(await listWeeklySchedulesForStudent(studentId)).toHaveLength(1);
});

it("next Monday's weekly schedule uses the Saturday upload: missed type first, its week note, the result's id, and the saved score", async () => {
  const { studentId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  await expect(confirmWeeklyUpload(upload(SATURDAY, { currentScore: 160 }))).rejects.toThrow("redirect:/dashboard");
  const [practiceTest] = await listApprovedPracticeTestResults(studentId);

  vi.setSystemTime(NEXT_MONDAY);
  const markup = await dashboard();

  const [next] = await listWeeklySchedulesForStudent(studentId);
  expect(next.weekStartDate).toBe("2026-10-19");
  expect(next.generationInputs.practiceTestResultId).toBe(practiceTest.id);
  expect(next.generationInputs.student.currentScore).toBe(160);
  const paired = Object.values(next.schedule.days).flatMap((day) => day.activities)
    .filter((activity) => activity.kind === "LR" && !activity.isFullSection && activity.types.length === 2);
  expect(paired).toHaveLength(2);
  const firstDrill = next.schedule.days.MONDAY.activities
    .flatMap((activity) => (activity.kind === "LR" && !activity.isFullSection ? [activity] : []))[0];
  expect(firstDrill?.types[0]).toBe("Flaw or descriptive weakening");
  expect(markup).toContain("Flaw or descriptive weakening comes first this week. You missed it most on your last practice test.");
});

it.each([
  ["some", { Science: 1, Law: 0.5 }],
  ["no", {}],
])("a weekly upload with %s RC passage-type values saves only those values and builds next Monday's weekly schedule", async (_name, rc) => {
  const { studentId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  const body = upload(SATURDAY);
  const rows = [
    ...body.analytics.rows.filter(({ category }) => category !== "passage"),
    ...Object.entries(rc).map(([type, accuracy]) => ({ type, category: "passage", accuracy: accuracy * 100 })),
  ];
  await expect(confirmWeeklyUpload({ ...body, analytics: { ...body.analytics, rows } })).rejects.toThrow("redirect:/dashboard");

  const newest = (await listApprovedAnalyticsSnapshots(studentId)).find(({ approvedAt }) => approvedAt === SATURDAY.toISOString());
  expect(newest?.rcAccuracyByType).toEqual(rc);

  vi.setSystemTime(NEXT_MONDAY);
  await dashboard();
  const [next] = await listWeeklySchedulesForStudent(studentId);
  expect(next.weekStartDate).toBe("2026-10-19");
  expect(Object.values(next.schedule.days).flatMap((day) => day.activities).some((activity) => activity.kind === "RC")).toBe(true);
});

it("refuses a page built for next week once the upload window is over, without saving anything", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  const tuesday = new Date("2026-10-13T16:00:00Z");
  vi.setSystemTime(tuesday);
  const before = await saved(studentId, accountId);

  await expect(confirmWeeklyUpload(upload(tuesday))).resolves.toEqual({ error: "This page is out of date. Open This week to continue." });

  expect(await saved(studentId, accountId)).toEqual(before);
});

it("a student with no plan on Wednesday plans the rest of this week from last week's practice test, with the missed type first", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  const wednesday = new Date("2026-10-21T16:00:00Z");
  vi.setSystemTime(wednesday);
  await expect(dashboard()).rejects.toThrow("redirect:/dashboard/upload");

  await expect(confirmWeeklyUpload(upload(wednesday, { weekOf: "2026-10-19", currentScore: 160 }))).rejects.toThrow("redirect:/dashboard");
  const after = await saved(studentId, accountId);
  expect(after.score).toBe(160);
  expect(after.practiceTests).toHaveLength(1);

  const markup = await dashboard();
  const week = (await listWeeklySchedulesForStudent(studentId)).find(({ weekStartDate }) => weekStartDate === "2026-10-19");
  expect(week?.generationInputs).toMatchObject({ practiceTestResultId: after.practiceTests[0].id, student: { currentScore: 160 } });
  expect(week?.generationInputs.remainingDays[0]).toBe("WEDNESDAY");
  expect([week?.schedule.days.MONDAY.activities, week?.schedule.days.TUESDAY.activities]).toEqual([[], []]);
  const firstDrill = Object.values(week?.schedule.days ?? {}).flatMap((day) => day.activities)
    .find((activity) => activity.kind === "LR" && !activity.isFullSection);
  expect(firstDrill?.kind === "LR" && firstDrill.types[0]).toBe("Flaw or descriptive weakening");
  expect(markup).toContain("Flaw or descriptive weakening comes first this week.");
});

it("opens the weekly upload on a weekday only while the week has no plan and no upload that counts for it", async () => {
  const { studentId } = await studentWithThisWeek();
  vi.setSystemTime(new Date("2026-10-13T16:00:00Z"));
  await expect(uploadPage()).rejects.toThrow("redirect:/dashboard");

  vi.setSystemTime(new Date("2026-10-21T16:00:00Z"));
  const markup = await uploadPage();
  expect(markup).toContain("Plan this week");
  expect(markup).toContain("Your plan starts today and runs to Sunday, Oct 25.");

  vi.setSystemTime(SATURDAY);
  await expect(confirmWeeklyUpload(upload(SATURDAY))).rejects.toThrow("redirect:/dashboard");
  vi.setSystemTime(NEXT_MONDAY);
  await expect(uploadPage()).rejects.toThrow("redirect:/dashboard");
  expect((await listWeeklySchedulesForStudent(studentId)).map(({ weekStartDate }) => weekStartDate)).toEqual(["2026-10-12"]);
});

it("refuses a weekday upload once this week has a weekly schedule, without saving anything", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  const tuesday = new Date("2026-10-13T16:00:00Z");
  vi.setSystemTime(tuesday);
  const before = await saved(studentId, accountId);

  await expect(confirmWeeklyUpload(upload(tuesday, { weekOf: "2026-10-12" })))
    .resolves.toEqual({ error: "This page is out of date. Open This week to continue." });

  expect(await saved(studentId, accountId)).toEqual(before);
});

it("saves a practice test reviewed on Sunday and confirmed after midnight, and uses it for that Monday's plan", async () => {
  const { studentId } = await studentWithThisWeek();
  const justAfterMidnight = new Date("2026-10-19T05:30:00Z");
  vi.setSystemTime(justAfterMidnight);

  await expect(confirmWeeklyUpload(upload(justAfterMidnight))).rejects.toThrow("redirect:/dashboard");
  const [practiceTest] = await listApprovedPracticeTestResults(studentId);
  expect(practiceTest).toBeDefined();

  await dashboard();
  const next = (await listWeeklySchedulesForStudent(studentId)).find((record) => record.weekStartDate === "2026-10-19");
  expect(next?.generationInputs.practiceTestResultId).toBe(practiceTest.id);
});

it("a student who signs up on Saturday plans next week, sees that the plan starts Monday, and gets it on Monday", async () => {
  vi.setSystemTime(SATURDAY);
  const account = await database.createAccountAsOwner({ email: "weekend@example.test", name: "Sam", role: "student" });
  if (!account) throw new Error("Account fixture already exists");
  const student = await createStudent(account.id, profile);
  if (!student) throw new Error("Student fixture already exists");
  state.session = { user: { id: account.id, role: "student", email: "weekend@example.test", name: "Sam" }, expires: "2099-01-01" };

  await expect(dashboard()).rejects.toThrow("redirect:/dashboard/upload");
  await expect(confirmWeeklyUpload({ ...upload(SATURDAY), practiceTest: null })).rejects.toThrow("redirect:/dashboard");
  const weekend = await dashboard();
  expect(weekend).toContain("Your plan starts Monday");
  expect(await listWeeklySchedulesForStudent(student.id)).toEqual([]);

  vi.setSystemTime(NEXT_MONDAY);
  expect(await dashboard()).toContain("Your plan for this week");
  expect((await listWeeklySchedulesForStudent(student.id)).map(({ weekStartDate }) => weekStartDate)).toEqual(["2026-10-19"]);
});

it("rolls back the snapshot, the score, and the day's save count when the practice-test insert fails", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  const before = await saved(studentId, accountId);
  const prepared = prepareWeeklyUploadApproval(upload(SATURDAY), SATURDAY, SATURDAY, { allowAdminSample: false, needsPracticeTest: true });
  if (!prepared.practiceTest) throw new Error("Expected a practice test");

  for (let index = 0; index < 5; index += 1) {
    await expect(approveWeeklyUpload(studentId, { ...prepared, practiceTest: { ...prepared.practiceTest, prepTest: 0 } }, { accountId, realNow: SATURDAY }))
      .rejects.toMatchObject({ cause: { code: "23514" } });
  }

  expect(await saved(studentId, accountId)).toEqual(before);
  await expect(confirmWeeklyUpload(upload(SATURDAY))).rejects.toThrow("redirect:/dashboard");
});

it("refuses an invalid score or a missing practice test without saving anything", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  const before = await saved(studentId, accountId);

  await expect(confirmWeeklyUpload(upload(SATURDAY, { currentScore: 181 }))).resolves.toEqual({ error: "Enter a score from 120 to 180." });
  await expect(confirmWeeklyUpload({ ...upload(SATURDAY), practiceTest: null }))
    .resolves.toEqual({ error: "Add this week's practice test before you confirm." });

  expect(await saved(studentId, accountId)).toEqual(before);
});

it("with the owner's switch on, a practice-test week confirms without the practice test, and next week does not reuse an older one", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  await expect(confirmWeeklyUpload(upload(SATURDAY))).rejects.toThrow("redirect:/dashboard");
  vi.setSystemTime(NEXT_MONDAY);
  await dashboard();
  const [older] = await listApprovedPracticeTestResults(studentId);

  const nextSaturday = new Date("2026-10-24T17:00:00Z");
  vi.setSystemTime(nextSaturday);
  await database.owner.execute(sql`update scan_settings set scanning_off = true`);
  expect(await dashboard()).toContain("Plan next week");
  expect(await progress()).toContain("Progress");
  const page = await uploadPage();
  expect(page).toContain("Scanning is off right now. Enter your analytics by hand.");
  expect(page).toContain("Practice test skipped this week");

  await expect(confirmWeeklyUpload({ ...upload(nextSaturday, { weekOf: "2026-10-26" }), practiceTest: null }))
    .rejects.toThrow("redirect:/dashboard");
  expect((await saved(studentId, accountId)).practiceTests).toEqual([older]);

  vi.setSystemTime(new Date("2026-10-26T16:00:00Z"));
  expect(await dashboard()).not.toContain("You missed it most on your last practice test.");
  const weeks = await listWeeklySchedulesForStudent(studentId);
  expect(weeks.find(({ weekStartDate }) => weekStartDate === "2026-10-19")?.generationInputs.practiceTestResultId).toBe(older.id);
  expect(weeks.find(({ weekStartDate }) => weekStartDate === "2026-10-26")?.generationInputs).not.toHaveProperty("practiceTestResultId");
});

it("a later confirmation that skips the practice test keeps next week from using the same week's earlier result", async () => {
  const { studentId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  await expect(confirmWeeklyUpload(upload(SATURDAY))).rejects.toThrow("redirect:/dashboard");

  const sunday = new Date("2026-10-18T17:00:00Z");
  vi.setSystemTime(sunday);
  await database.owner.execute(sql`update scan_settings set scanning_off = true`);
  await expect(confirmWeeklyUpload({ ...upload(sunday), practiceTest: null })).rejects.toThrow("redirect:/dashboard");

  vi.setSystemTime(NEXT_MONDAY);
  expect(await dashboard()).not.toContain("You missed it most on your last practice test.");
  const [next] = await listWeeklySchedulesForStudent(studentId);
  expect(next.weekStartDate).toBe("2026-10-19");
  expect(next.generationInputs).not.toHaveProperty("practiceTestResultId");
});

it("at the monthly limit, a practice-test week confirms without the practice test; with scanning on, the old rule refuses it", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  const skipped = { ...upload(SATURDAY), practiceTest: null };
  await database.owner.execute(sql`insert into scan_spending (month_start, total_usd) values ('2026-10-01T05:00:00Z', 9.98)`);
  expect(await uploadPage()).not.toContain("Scanning is off right now.");
  await expect(confirmWeeklyUpload(skipped)).rejects.toThrow("redirect:/dashboard");
  expect((await saved(studentId, accountId)).practiceTests).toEqual([]);

  await database.owner.execute(sql`update scan_settings set monthly_limit_usd = 15`);
  await expect(confirmWeeklyUpload(skipped)).resolves.toEqual({ error: "Add this week's practice test before you confirm." });
  expect(await uploadPage()).not.toContain("Practice test skipped");
});

it("lets only an admin confirm sample data, and Reset test data deletes the admin's practice-test results", async () => {
  const student = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  await expect(confirmWeeklyUpload(upload(SATURDAY, { source: "admin_sample" })))
    .resolves.toEqual({ error: "Admin access required for sample analytics." });
  expect(await listApprovedPracticeTestResults(student.studentId)).toEqual([]);

  await database.owner.execute(sql`truncate accounts cascade`);
  const admin = await studentWithThisWeek("admin");
  vi.setSystemTime(SATURDAY);
  await expect(confirmWeeklyUpload(upload(SATURDAY, { source: "admin_sample" }))).rejects.toThrow("redirect:/dashboard");
  expect(await listApprovedPracticeTestResults(admin.studentId)).toHaveLength(1);

  await resetTestWorkspace(admin.accountId, "test-data", postgresAdminTestRepositories);
  expect(await listApprovedPracticeTestResults(admin.studentId)).toEqual([]);
  expect(await listApprovedAnalyticsSnapshots(admin.studentId)).toEqual([]);
});

it("refuses the 6th snapshot save in one Chicago day before any write, and allows saves again after midnight Central time", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  for (let index = 0; index < 5; index += 1) {
    await expect(confirmWeeklyUpload(upload(SATURDAY, { currentScore: 160 + index }))).rejects.toThrow("redirect:/dashboard");
  }
  const before = await saved(studentId, accountId);
  expect(before.snapshots).toHaveLength(6);

  await expect(confirmWeeklyUpload(upload(SATURDAY, { currentScore: 170 }))).resolves
    .toEqual({ error: "You've saved your analytics 5 times today. Try again tomorrow, after midnight Central time." });
  expect(await saved(studentId, accountId)).toEqual(before);

  const sundayMidnight = new Date("2026-10-18T05:00:00Z");
  vi.setSystemTime(sundayMidnight);
  await expect(confirmWeeklyUpload(upload(sundayMidnight, { currentScore: 170 }))).rejects.toThrow("redirect:/dashboard");
  expect((await saved(studentId, accountId)).score).toBe(170);
});

it("counts an Admin's student-side saves on the real clock, whatever the simulated date", async () => {
  const { studentId, accountId } = await studentWithThisWeek("admin");
  await database.owner.execute(sql`update accounts set simulated_date = '2026-10-17' where id = ${accountId}`);
  vi.setSystemTime(SATURDAY);
  for (let index = 0; index < 5; index += 1) {
    await expect(confirmWeeklyUpload(upload(SATURDAY))).rejects.toThrow("redirect:/dashboard");
  }
  await database.owner.execute(sql`update accounts set simulated_date = '2026-10-18' where id = ${accountId}`);
  await expect(confirmWeeklyUpload(upload(SATURDAY))).resolves
    .toEqual({ error: "You've saved your analytics 5 times today. Try again tomorrow, after midnight Central time." });
  expect((await saved(studentId, accountId)).snapshots).toHaveLength(6);
});

it("lets exactly 5 of 10 weekly upload confirms at the same time save", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  const results = await Promise.allSettled(Array.from({ length: 10 }, () => confirmWeeklyUpload(upload(SATURDAY))));

  expect(results.filter((result) => result.status === "rejected" && String(result.reason).includes("redirect:/dashboard"))).toHaveLength(5);
  expect(results.filter((result) => result.status === "fulfilled")).toEqual(Array(5).fill({
    status: "fulfilled",
    value: { error: "You've saved your analytics 5 times today. Try again tomorrow, after midnight Central time." },
  }));
  expect((await saved(studentId, accountId)).snapshots).toHaveLength(6);
});
