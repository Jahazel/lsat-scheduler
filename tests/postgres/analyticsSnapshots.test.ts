import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import { setUpAppTestDatabase } from "./appTestDatabase";
import { getPostgresDatabase } from "../../src/lib/postgres";
import { createStudent } from "../../src/lib/studentRepository";
import { createApprovedAnalyticsSnapshot, listApprovedAnalyticsSnapshots } from "../../src/lib/analyticsSnapshotRepository";
import { prepareApprovedSnapshot, snapshotWeekOptions } from "../../src/lib/analyticsSnapshots";
import { studentSideClock } from "../../src/lib/studentClock";
import { summarizeAnalyticsRows } from "../../src/lib/analytics";
import { analyticsTrend } from "../../src/lib/currentWeeklySchedule";
import type { Student } from "../../src/lib/types";
import { POST as extract } from "../../src/app/api/analytics/extract/route";
import { png, screenshotRequest } from "../../src/lib/screenshotFixtures/files";
import { generateTestSample, resetEverything, resetTestData } from "../../src/app/admin/test/actions";
import { deleteAccount } from "../../src/app/account/actions";
import { postgresAdminTestRepositories } from "../../src/lib/adminTestRepositories";
import { findAccountById } from "../../src/lib/accountRepository";
import { rebuildThisWeek } from "../../src/app/admin/test/actions";

const state = vi.hoisted((): { session: Session | null } => ({ session: null }));
vi.mock("@/auth", () => ({ auth: async () => state.session, signOut: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-vercel-forwarded-for": "203.0.113.1" }) }));

const database = setUpAppTestDatabase();
beforeEach(async () => {
  state.session = null;
  vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake");
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Tests must not contact a remote host"); }));
  await database.owner.execute(sql`truncate accounts cascade`);
});
afterEach(() => {
  expect(fetch).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
afterAll(() => {
  vi.unstubAllEnvs();
});
const profile: Student = {
  currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
};
async function student(email: string, role: "student" | "admin" = "student") {
  const account = await database.createAccountAsOwner({ email, name: email, role });
  if (!account) throw new Error("Account fixture already exists");
  const saved = await createStudent(account.id, profile);
  if (!saved) throw new Error("Student fixture already exists");
  state.session = { user: { ...account, email, name: email }, signedInAt: Math.floor(Date.now() / 1000), expires: "2099-01-01" };
  return { account, saved };
}
function approve(studentId: string, body: unknown = confirmed()) {
  return createApprovedAnalyticsSnapshot(studentId, prepareApprovedSnapshot(body));
}
const rcAccuracyByType = { Law: 0.58, Comparative: 0.7, Science: 0.64, Humanities: 0.81, Art: 0.77 };
function confirmed(values: { lrAccuracyByType: Record<string, number>; lrTopPriorityLogicTypes: string[]; rcAccuracyByType?: Record<string, number> } = { lrAccuracyByType: { Strengthen: 0.7 }, lrTopPriorityLogicTypes: [] }) {
  const now = new Date().toISOString();
  return { rcAccuracyByType, ...values, extraction: { source: "7sage_screenshot", extractedAt: now }, confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt: now } };
}
async function upload(section: "LR" | "RC" = "LR") {
  const image = new File([new Uint8Array(png(40, 30))], "analytics.png", { type: "image/png" });
  return extract(await screenshotRequest("http://localhost/api/analytics/extract", { image, section }));
}
it("uploads with the fake extractor, reviews corrected values, and appends approved snapshots as the app role", async () => {
  const { saved } = await student("one@example.test");
  expect((await getPostgresDatabase().execute(sql`select current_user`)).rows).toEqual([{ current_user: database.role }]);
  const extracted = await upload();
  expect(extracted.status).toBe(200);
  const passages = await upload("RC");
  expect(passages.status).toBe(200);
  const reviewed = summarizeAnalyticsRows([...(await extracted.json()).rows, ...(await passages.json()).rows]);
  reviewed.lrAccuracyByType.Strengthen = 0.82;
  const approved = confirmed(reviewed);
  await approve(saved.id, approved);
  await approve(saved.id, approved);
  const snapshots = await listApprovedAnalyticsSnapshots(saved.id);
  expect(snapshots).toHaveLength(2);
  expect(snapshots[0]).toMatchObject({ studentId: saved.id, lrAccuracyByType: { Strengthen: 0.82 }, rcAccuracyByType, extraction: approved.extraction, confirmation: approved.confirmation });
});
it("returns the plain extraction failure without saving a snapshot", async () => {
  const { saved } = await student("failure@example.test");
  vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake-failure");
  const response = await upload();
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({ error: "Couldn't read that screenshot" });
  expect(await listApprovedAnalyticsSnapshots(saved.id)).toEqual([]);
});
it("reads one student's three newest approved snapshots for the Performance trend", async () => {
  const a = await student("a@example.test");
  vi.useFakeTimers({ toFake: ["Date"] });
  for (const [index, accuracy] of [0.1, 0.4, 0.6, 0.8].entries()) {
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 12, 12, index)));
    await approve(a.saved.id, confirmed({ lrAccuracyByType: { Strengthen: accuracy }, lrTopPriorityLogicTypes: [] }));
  }
  const b = await student("b@example.test");
  await approve(b.saved.id, confirmed({ lrAccuracyByType: { Strengthen: 0.99 }, lrTopPriorityLogicTypes: [] }));
  const snapshots = await listApprovedAnalyticsSnapshots(a.saved.id);
  expect(snapshots.map((snapshot) => snapshot.lrAccuracyByType.Strengthen)).toEqual([0.8, 0.6, 0.4, 0.1]);
  expect(analyticsTrend(snapshots, "2026-10-12").lrAccuracyByType.Strengthen).toBeCloseTo(0.7);
});
it("reads a snapshot approved before RC analytics without RC accuracy", async () => {
  const { saved } = await student("before-rc@example.test");
  await database.owner.execute(sql`insert into analytics_snapshots
    (student_id, week_of, lr_accuracy_by_type, lr_top_priority_logic_types, approved_at, extraction_source, extracted_at, extracted_values_match, is_latest_analytics, confirmed_at)
    values (${saved.id}::uuid, '2026-10-05', '{"Strengthen": 0.7}'::jsonb, '{}', now(), '7sage_screenshot', now(), true, true, now())`);
  const [snapshot] = await listApprovedAnalyticsSnapshots(saved.id);
  expect(snapshot.lrAccuracyByType).toEqual({ Strengthen: 0.7 });
  expect(snapshot).not.toHaveProperty("rcAccuracyByType");
  expect(analyticsTrend([snapshot], "2026-10-05").rcAccuracyByType).toBeUndefined();
});

it("generates an admin Sample analytics snapshot with all five passage types", async () => {
  await student("admin@example.test", "admin");
  const sample = await generateTestSample("improving");
  expect(sample.rows.length).toBeGreaterThan(0);
  expect(Object.keys(summarizeAnalyticsRows(sample.rows).rcAccuracyByType ?? {}).sort()).toEqual(["Art", "Comparative", "Humanities", "Law", "Science"]);
  const next = await generateTestSample("steady");
  expect(next.rows.length).toBeGreaterThan(0);
});
it("refuses to generate Sample analytics snapshots for a student", async () => {
  await student("student@example.test");
  await expect(generateTestSample("steady")).rejects.toThrow();
});
it("resets only the admin's test snapshots and keeps the other student's approved snapshots", async () => {
  const other = await student("other@example.test");
  await approve(other.saved.id);
  const admin = await student("admin@example.test", "admin");
  await database.owner.execute(sql`update accounts set simulated_date = '2027-03-08' where id = ${admin.account.id}`);
  await approve(admin.saved.id);
  await resetTestData();
  expect(await findAccountById(admin.account.id)).toMatchObject({ role: "admin", simulatedDate: null });
  expect(await listApprovedAnalyticsSnapshots(admin.saved.id)).toEqual([]);
  expect(await listApprovedAnalyticsSnapshots(other.saved.id)).toHaveLength(1);
  expect(await createStudent(admin.account.id, profile)).toBeNull();
  await database.owner.execute(sql`update accounts set simulated_date = '2027-03-15' where id = ${admin.account.id}`);
  await resetEverything();
  expect(await findAccountById(admin.account.id)).toMatchObject({ role: "admin", simulatedDate: null });
  expect(await createStudent(admin.account.id, profile)).not.toBeNull();
  expect(await listApprovedAnalyticsSnapshots(other.saved.id)).toHaveLength(1);
});
it("deletes the signed-in student's Account and cascades snapshots while refusing admin deletion", async () => {
  const other = await student("other@example.test");
  await approve(other.saved.id);
  const owner = await student("owner@example.test");
  await approve(owner.saved.id);
  const form = new FormData();
  form.set("confirmation", "DELETE");
  await deleteAccount(null, form);
  expect(await listApprovedAnalyticsSnapshots(owner.saved.id)).toEqual([]);
  expect(await listApprovedAnalyticsSnapshots(other.saved.id)).toHaveLength(1);
  const admin = await student("admin@example.test", "admin");
  await approve(admin.saved.id);
  await expect(deleteAccount(null, form)).rejects.toThrow();
  expect(await listApprovedAnalyticsSnapshots(admin.saved.id)).toHaveLength(1);
});

async function schedule(studentId: string, week = "2026-10-12") {
  const inserted = await getPostgresDatabase().execute(sql`
    insert into weekly_schedules (student_id, week_start_date, generated_at, schedule, source_snapshot_ids, generation_inputs, policy_version)
    values (${studentId}::uuid, ${week}::date, now(), '{}'::jsonb, '{}'::uuid[], '{}'::jsonb, 'fixture') returning id
  `);
  const id = inserted.rows[0].id;
  if (typeof id !== "string") throw new Error("Schedule fixture missing");
  await getPostgresDatabase().execute(sql`insert into activity_check_ins (schedule_id, activity_id, status) values (${id}::uuid, 'MONDAY:0', 'completed')`);
  return id;
}
async function checkIns(scheduleId: string) {
  return (await getPostgresDatabase().execute(sql`select activity_id from activity_check_ins where schedule_id = ${scheduleId}::uuid`)).rows;
}
it("reset rolls back all Postgres writes if the reset fails", async () => {
  const { saved } = await student("admin@example.test", "admin");
  await approve(saved.id);
  const id = await schedule(saved.id);
  await expect(postgresAdminTestRepositories.inTransaction(async (writes) => {
    await writes.deleteSchedules(saved.id);
    await writes.deleteSnapshots(saved.id);
    throw new Error("forced reset failure");
  })).rejects.toThrow("forced reset failure");
  expect(await listApprovedAnalyticsSnapshots(saved.id)).toHaveLength(1);
  expect(await checkIns(id)).toEqual([{ activity_id: "MONDAY:0" }]);
});
it("admin rebuild deletes only the current week's schedule and its Activity check-ins", async () => {
  const other = await student("other@example.test");
  const otherSchedule = await schedule(other.saved.id);
  const admin = await student("admin@example.test", "admin");
  await database.owner.execute(sql`update accounts set simulated_date = '2026-10-14' where id = ${admin.account.id}`);
  const current = await schedule(admin.saved.id);
  const earlier = await schedule(admin.saved.id, "2026-10-05");
  await approve(admin.saved.id);
  await rebuildThisWeek();
  expect(await checkIns(current)).toEqual([]);
  expect(await checkIns(earlier)).toHaveLength(1);
  expect(await checkIns(otherSchedule)).toHaveLength(1);
  expect(await listApprovedAnalyticsSnapshots(admin.saved.id)).toHaveLength(1);
  expect(await findAccountById(admin.account.id)).toMatchObject({ simulatedDate: "2026-10-14" });
});
it("uses the simulated calendar date when Chicago's evening falls on tomorrow in UTC", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-15T03:00:00Z"));
  const { saved, account } = await student("admin@example.test", "admin");
  await database.owner.execute(sql`update accounts set simulated_date = '2026-10-07' where id = ${account.id}`);
  if (!state.session) throw new Error("Session fixture missing");
  const clock = await studentSideClock(state.session.user);
  await createApprovedAnalyticsSnapshot(saved.id, prepareApprovedSnapshot(confirmed(), clock.now, clock.real, snapshotWeekOptions(clock)));
  expect((await listApprovedAnalyticsSnapshots(saved.id))[0]).toMatchObject({ weekOf: "2026-10-07", approvedAt: "2026-10-08T03:00:00.000Z", extraction: { source: "7sage_screenshot" } });
});
it("rejects missing screenshot input", async () => {
  await student("missing-input@example.test");
  const response = await extract(await screenshotRequest("http://localhost/api/analytics/extract", {}));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "No image provided" });
});
