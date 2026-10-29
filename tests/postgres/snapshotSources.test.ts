import { renderToStaticMarkup } from "react-dom/server";
import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setUpAppTestDatabase } from "./appTestDatabase";
import { createStudent, findStudentByAccountId } from "../../src/lib/studentRepository";
import { createApprovedAnalyticsSnapshot, listApprovedAnalyticsSnapshots } from "../../src/lib/analyticsSnapshotRepository";
import { listWeeklySchedulesForStudent } from "../../src/lib/weeklyScheduleRepository";
import { listApprovedPracticeTestResults } from "../../src/lib/weeklyUploadRepository";
import { PT158_FIXTURES } from "../../src/lib/practiceTestFixtures/pt158";
import type { SnapshotSource } from "../../src/lib/analyticsSnapshots";
import { confirmWeeklyUpload } from "../../src/app/dashboard/upload/actions";
import { createStudentProfile } from "../../src/app/onboarding/actions";
import DashboardPage from "../../src/app/dashboard/page";
import type { AnalyticsExtractedRow, Student } from "../../src/lib/types";

const state = vi.hoisted((): { session: Session | null } => ({ session: null }));
vi.mock("@/auth", () => ({ auth: async () => state.session }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => import("./fakeNavigation"));

const database = setUpAppTestDatabase();
beforeEach(async () => {
  state.session = null;
  vi.useFakeTimers({ toFake: ["Date"] });
  await database.owner.execute(sql`truncate accounts cascade`);
});
afterAll(() => {
  vi.useRealTimers();
});

const MONDAY = new Date("2026-10-12T16:00:00Z");
const SATURDAY = new Date("2026-10-17T17:00:00Z");
const NEXT_MONDAY = new Date("2026-10-19T16:00:00Z");
const THREE_DAYS_MS = 3 * 24 * 60 * 60_000;

const profile: Student = {
  currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
};
const SOURCES = ["7sage_screenshot", "admin_sample", "manual_entry"] as const satisfies readonly SnapshotSource[];

const dashboard = async () => renderToStaticMarkup(await DashboardPage({ searchParams: Promise.resolve({}) }));

async function signIn(role: "student" | "admin") {
  const account = await database.createAccountAsOwner({ email: `${role}@example.test`, name: "Sam", role });
  if (!account) throw new Error("Account fixture already exists");
  state.session = { user: { id: account.id, role, email: `${role}@example.test`, name: "Sam" }, expires: "2099-01-01" };
  return account;
}

function approval(source: SnapshotSource, at: Date, extractedAt = new Date(at.getTime() - 5 * 60_000)) {
  return {
    extraction: { source, extractedAt: extractedAt.toISOString() },
    confirmation: { extractedValuesMatch: true as const, isLatestAnalytics: true as const, confirmedAt: new Date(at.getTime() - 60_000).toISOString() },
  };
}

const passages = (["Law", "Comparative", "Science", "Humanities", "Art"] as const)
  .map((type) => ({ type, category: "passage" as const, accuracy: 60 }));
const rows = [
  { type: "Strengthen", category: "regular", accuracy: 60 },
  { type: "Causal reasoning", category: "restricted", isTopPriority: true },
  ...passages,
];

const untrusted = (sent: readonly object[]) => sent as AnalyticsExtractedRow[];

const ROW_REFUSALS = [
  ["an unknown LR type", [{ type: "Strengthn", category: "regular", accuracy: 60 }, ...rows], "Pick each LR type from the 7Sage list."],
  ["an LR accuracy over 100%", [{ type: "Weaken", category: "regular", accuracy: 101 }, ...rows], "Enter each LR accuracy from 0 to 100."],
  ["a negative LR accuracy", [{ type: "Weaken", category: "regular", accuracy: -1 }, ...rows], "Enter each LR accuracy from 0 to 100."],
  ["a top-priority type that is not Stimulus Logic", [{ type: "Weaken", category: "restricted", isTopPriority: true }, ...rows], "Only Stimulus Logic types can be top priority."],
  ["two rows for one type", [{ type: "Strengthen", category: "regular", accuracy: 40 }, ...rows], "Enter each type only once."],
  ["an unknown type with no value", [{ type: "Strengthn", category: "restricted", isTopPriority: false }, ...rows], "Pick each LR type from the 7Sage list."],
  ["a flag row with an accuracy over 100%", [{ type: "Quantifier", category: "restricted", accuracy: 150, isTopPriority: true }, ...rows], "Enter each LR accuracy from 0 to 100."],
  ["an RC accuracy over 100%", [...rows.slice(0, 2), { type: "Law", category: "passage", accuracy: 150 }], "Enter each RC accuracy from 0 to 100."],
  ["a negative RC accuracy", [...rows.slice(0, 2), { type: "Law", category: "passage", accuracy: -1 }], "Enter each RC accuracy from 0 to 100."],
  ["an unknown RC passage type", [...rows, { type: "Poetry", category: "passage", accuracy: 50 }], "Enter each RC accuracy from 0 to 100."],
  ["two rows for one RC passage type", [...rows, { type: "Law", category: "passage", accuracy: 40 }], "Enter each type only once."],
] as const;

describe.each(SOURCES)("onboarding with a %s snapshot", (source) => {
  it.each(ROW_REFUSALS)("refuses %s and saves no student", async (_name, analyticsRows, message) => {
    vi.setSystemTime(MONDAY);
    const account = await signIn(source === "admin_sample" ? "admin" : "student");
    expect(await createStudentProfile({
      ...profile, officialAttempts: [], analyticsRows: untrusted(analyticsRows), analyticsApproval: approval(source, MONDAY),
    })).toEqual({ error: message });
    expect(await findStudentByAccountId(account.id)).toBeNull();
  });
});

it("onboarding refuses a sample snapshot even from an Admin", async () => {
  vi.setSystemTime(MONDAY);
  const account = await signIn("admin");
  expect(await createStudentProfile({ ...profile, officialAttempts: [], analyticsRows: untrusted(rows), analyticsApproval: approval("admin_sample", MONDAY) }))
    .toEqual({ error: "Admin access required for sample analytics." });
  expect(await findStudentByAccountId(account.id)).toBeNull();
});

it("onboarding saves a manual entry typed 3 days ago and gives this week's weekly schedule", async () => {
  vi.setSystemTime(MONDAY);
  const account = await signIn("student");
  const typed = approval("manual_entry", MONDAY, new Date(MONDAY.getTime() - THREE_DAYS_MS));
  await expect(createStudentProfile({ ...profile, officialAttempts: [], analyticsRows: untrusted(rows), analyticsApproval: typed }))
    .rejects.toThrow("redirect:/dashboard");
  const student = await findStudentByAccountId(account.id);
  if (!student) throw new Error("Onboarding saved no student");
  expect(await listApprovedAnalyticsSnapshots(student.id)).toEqual([expect.objectContaining({
    extraction: { source: "manual_entry", extractedAt: typed.extraction.extractedAt },
    lrAccuracyByType: { Strengthen: 0.6 }, lrTopPriorityLogicTypes: ["Causal reasoning"],
  })]);

  expect(await dashboard()).toContain("Your plan for this week");
  const [schedule] = await listWeeklySchedulesForStudent(student.id);
  expect(schedule.weekStartDate).toBe("2026-10-12");
});

async function studentWithThisWeek(role: "student" | "admin") {
  vi.setSystemTime(MONDAY);
  const account = await signIn(role);
  const saved = await createStudent(account.id, profile);
  if (!saved) throw new Error("Student fixture already exists");
  await createApprovedAnalyticsSnapshot(saved.id, {
    status: "approved", weekOf: "2026-10-12", lrAccuracyByType: { Strengthen: 0.7 }, lrTopPriorityLogicTypes: [],
    rcAccuracyByType: { Law: 0.58, Comparative: 0.7, Science: 0.64, Humanities: 0.81, Art: 0.77 },
    approvedAt: MONDAY, extraction: { source: "7sage_screenshot", extractedAt: MONDAY },
    confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt: MONDAY },
  });
  await dashboard();
  return saved.id;
}

const weeklyRows = [
  { type: "Flaw or descriptive weakening", category: "regular", accuracy: 74 },
  { type: "Weaken", category: "regular", accuracy: 70 },
  { type: "Causal reasoning", category: "restricted", isTopPriority: true },
  { type: "Law", category: "passage", accuracy: 58 },
  { type: "Science", category: "passage", accuracy: 64 },
];

function upload(source: SnapshotSource, rows: readonly object[] = weeklyRows, extractedAt?: Date) {
  return {
    weekOf: "2026-10-19",
    currentScore: 160,
    analytics: { rows, ...approval(source, SATURDAY, extractedAt) },
    practiceTest: {
      readings: PT158_FIXTURES.map(({ reading }) => reading),
      picks: [],
      extraction: { source: source === "admin_sample" ? source : "7sage_screenshot", extractedAt: new Date(SATURDAY.getTime() - 5 * 60_000).toISOString() },
      confirmation: { extractedValuesMatch: true, isThisWeeksPracticeTest: true, confirmedAt: new Date(SATURDAY.getTime() - 60_000).toISOString() },
    },
  };
}

describe.each(SOURCES)("the weekly upload with a %s snapshot", (source) => {
  it.each(ROW_REFUSALS)("refuses %s and saves nothing", async (_name, sentRows, message) => {
    const studentId = await studentWithThisWeek(source === "admin_sample" ? "admin" : "student");
    vi.setSystemTime(SATURDAY);
    await expect(confirmWeeklyUpload(upload(source, sentRows))).resolves.toEqual({ error: message });
    expect(await listApprovedAnalyticsSnapshots(studentId)).toHaveLength(1);
    expect(await listApprovedPracticeTestResults(studentId)).toEqual([]);
  });
});

it.each([
  ["7sage_screenshot", "Upload a fresh analytics screenshot before saving."],
  ["admin_sample", "Generate a new sample analytics snapshot before saving."],
] as const)("the weekly upload refuses a %s read more than 24 hours ago", async (source, message) => {
  const studentId = await studentWithThisWeek(source === "admin_sample" ? "admin" : "student");
  vi.setSystemTime(SATURDAY);
  await expect(confirmWeeklyUpload(upload(source, weeklyRows, new Date(SATURDAY.getTime() - THREE_DAYS_MS)))).resolves.toEqual({ error: message });
  expect(await listApprovedAnalyticsSnapshots(studentId)).toHaveLength(1);
});

it("the weekly upload refuses a sample snapshot from a student", async () => {
  const studentId = await studentWithThisWeek("student");
  vi.setSystemTime(SATURDAY);
  await expect(confirmWeeklyUpload(upload("admin_sample"))).resolves.toEqual({ error: "Admin access required for sample analytics." });
  expect(await listApprovedAnalyticsSnapshots(studentId)).toHaveLength(1);
});

it("the weekly upload refuses a manual entry without the latest-analytics confirmation", async () => {
  const studentId = await studentWithThisWeek("student");
  vi.setSystemTime(SATURDAY);
  const body = upload("manual_entry");
  const unconfirmed = { ...body, analytics: { ...body.analytics, confirmation: { ...body.analytics.confirmation, isLatestAnalytics: false } } };
  await expect(confirmWeeklyUpload(unconfirmed)).resolves.toEqual({ error: "Confirm that the reviewed extraction matches your latest analytics." });
  expect(await listApprovedAnalyticsSnapshots(studentId)).toHaveLength(1);
});

it("the weekly upload saves a manual entry typed 3 days ago and builds next Monday's weekly schedule from it", async () => {
  const studentId = await studentWithThisWeek("student");
  vi.setSystemTime(SATURDAY);
  await expect(confirmWeeklyUpload(upload("manual_entry", weeklyRows, new Date(SATURDAY.getTime() - THREE_DAYS_MS))))
    .rejects.toThrow("redirect:/dashboard");
  const [newest] = await listApprovedAnalyticsSnapshots(studentId);
  expect(newest).toMatchObject({ approvedAt: SATURDAY.toISOString(), extraction: { source: "manual_entry" }, rcAccuracyByType: { Law: 0.58, Science: 0.64 } });

  vi.setSystemTime(NEXT_MONDAY);
  expect(await dashboard()).toContain("Your plan for this week");
  const [next] = await listWeeklySchedulesForStudent(studentId);
  expect(next.weekStartDate).toBe("2026-10-19");
  expect(next.sourceSnapshotIds).toContain(newest.id);
});
