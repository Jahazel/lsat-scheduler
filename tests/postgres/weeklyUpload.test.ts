import { renderToStaticMarkup } from "react-dom/server";
import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { createAppTestDatabase } from "./appTestDatabase";
import { closePostgresDatabase } from "../../src/lib/postgres";
import { createAccount } from "../../src/lib/accountRepository";
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

const profile: Student = {
  currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
};

const dashboard = async () => renderToStaticMarkup(await DashboardPage({ searchParams: Promise.resolve({}) }));

async function studentWithThisWeek(role: "student" | "admin" = "student") {
  vi.setSystemTime(MONDAY);
  const account = await createAccount({ email: `${role}@example.test`, name: "Sam", role });
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

function upload(at: Date, { currentScore = 160, source = "7sage_screenshot" } = {}) {
  const extractedAt = new Date(at.getTime() - 5 * 60_000).toISOString();
  const confirmedAt = new Date(at.getTime() - 60_000).toISOString();
  return {
    currentScore,
    analytics: {
      lrAccuracyByType: { "Flaw or descriptive weakening": 0.74, Weaken: 0.7, "Necessary assumption": 0.76 },
      lrTopPriorityLogicTypes: ["Phenomenon-hypothesis"],
      rcAccuracyByType: { Law: 0.58, Comparative: 0.7, Science: 0.64, Humanities: 0.81, Art: 0.77 },
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

it("rolls back the snapshot and the score when the practice-test insert fails", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  const before = await saved(studentId, accountId);
  const prepared = prepareWeeklyUploadApproval(upload(SATURDAY), SATURDAY, SATURDAY, { allowAdminSample: false, needsPracticeTest: true });
  if (!prepared.practiceTest) throw new Error("Expected a practice test");

  await expect(approveWeeklyUpload(studentId, { ...prepared, practiceTest: { ...prepared.practiceTest, prepTest: 0 } }))
    .rejects.toMatchObject({ cause: { code: "23514" } });

  expect(await saved(studentId, accountId)).toEqual(before);
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
