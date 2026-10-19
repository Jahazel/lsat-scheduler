import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { createAppTestDatabase } from "./appTestDatabase";
import { closePostgresDatabase, getPostgresDatabase } from "../../src/lib/postgres";
import { createAccount } from "../../src/lib/accountRepository";
import { createStudent } from "../../src/lib/studentRepository";
import { listApprovedAnalyticsSnapshots } from "../../src/lib/analyticsSnapshotRepository";
import { summarizeAnalyticsRows } from "../../src/lib/analytics";
import { analyticsTrend } from "../../src/lib/currentWeeklySchedule";
import type { Student } from "../../src/lib/types";
import { POST as approve } from "../../src/app/api/analytics/route";
import { POST as extract } from "../../src/app/api/analytics/extract/route";
import { generateTestSample, resetEverything, resetTestData } from "../../src/app/admin/test/actions";
import { deleteAccount } from "../../src/app/account/actions";
import { postgresAdminTestRepositories } from "../../src/lib/adminTestRepositories";
import { findAccountById } from "../../src/lib/accountRepository";
import { rebuildThisWeek } from "../../src/app/admin/test/actions";

const state = vi.hoisted((): { session: Session | null } => ({ session: null }));
vi.mock("@/auth", () => ({ auth: async () => state.session, signOut: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

let database: Awaited<ReturnType<typeof createAppTestDatabase>>;
const originalSetting = process.env.DATABASE_URL;
beforeAll(async () => {
  await closePostgresDatabase();
  database = await createAppTestDatabase();
  process.env.DATABASE_URL = database.setting;
});
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
afterAll(async () => {
  vi.unstubAllEnvs();
  await closePostgresDatabase();
  process.env.DATABASE_URL = originalSetting;
  await database?.cleanup();
});
const profile: Student = {
  currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
};
async function student(email: string, role: "student" | "admin" = "student") {
  const account = await createAccount({ email, name: email, role });
  if (!account) throw new Error("Account fixture already exists");
  const saved = await createStudent(account.id, profile);
  if (!saved) throw new Error("Student fixture already exists");
  state.session = { user: { ...account, email, name: email }, expires: "2099-01-01" };
  return { account, saved };
}
function approval(body: unknown) {
  return approve(new NextRequest("http://localhost/api/analytics", { method: "POST", body: JSON.stringify(body) }));
}
function confirmed(values: { lrAccuracyByType: Record<string, number>; lrTopPriorityLogicTypes: string[] } = { lrAccuracyByType: { Strengthen: 0.7 }, lrTopPriorityLogicTypes: [] }) {
  const now = new Date().toISOString();
  return { ...values, extraction: { source: "7sage_screenshot", extractedAt: now }, confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt: now } };
}
function upload() {
  const form = new FormData();
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=", "base64");
  form.set("image", new File([png], "analytics.png", { type: "image/png" }));
  return extract(new NextRequest("http://localhost/api/analytics/extract", { method: "POST", body: form }));
}
it("uploads with the fake extractor, reviews corrected values, and appends approved snapshots as the app role", async () => {
  const { saved } = await student("one@example.test");
  expect((await getPostgresDatabase().execute(sql`select current_user`)).rows).toEqual([{ current_user: database.role }]);
  const extracted = await upload();
  expect(extracted.status).toBe(200);
  const { rows } = await extracted.json();
  const reviewed = summarizeAnalyticsRows(rows);
  reviewed.lrAccuracyByType.Strengthen = 0.82;
  const approved = confirmed(reviewed);
  expect((await approval(approved)).status).toBe(201);
  expect((await approval(approved)).status).toBe(201);
  const snapshots = await listApprovedAnalyticsSnapshots(saved.id);
  expect(snapshots).toHaveLength(2);
  expect(snapshots[0]).toMatchObject({ studentId: saved.id, lrAccuracyByType: { Strengthen: 0.82 }, extraction: approved.extraction, confirmation: approved.confirmation });
});
it("returns the plain extraction failure without saving a snapshot", async () => {
  const { saved } = await student("failure@example.test");
  vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake-failure");
  const response = await upload();
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({ error: "Couldn't read that screenshot" });
  expect(await listApprovedAnalyticsSnapshots(saved.id)).toEqual([]);
});
it("keeps approval with the session owner and reads the three newest approved snapshots for the Performance trend", async () => {
  const a = await student("a@example.test");
  vi.useFakeTimers({ toFake: ["Date"] });
  for (const [index, accuracy] of [0.1, 0.4, 0.6, 0.8].entries()) {
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 12, 12, index)));
    expect((await approval({ ...confirmed({ lrAccuracyByType: { Strengthen: accuracy }, lrTopPriorityLogicTypes: [] }), studentId: "someone-else" })).status).toBe(201);
  }
  const b = await student("b@example.test");
  expect(await listApprovedAnalyticsSnapshots(b.saved.id)).toEqual([]);
  expect((await approval(confirmed({ lrAccuracyByType: { Strengthen: 0.99 }, lrTopPriorityLogicTypes: [] }))).status).toBe(201);
  const snapshots = await listApprovedAnalyticsSnapshots(a.saved.id);
  expect(snapshots.map((snapshot) => snapshot.lrAccuracyByType.Strengthen)).toEqual([0.8, 0.6, 0.4, 0.1]);
  expect(analyticsTrend(snapshots, "2026-10-12").lrAccuracyByType.Strengthen).toBeCloseTo(0.7);
});
it.each([
  ["unconfirmed", (body: ReturnType<typeof confirmed>) => ({ ...body, confirmation: { ...body.confirmation, isLatestAnalytics: false } })],
  ["empty", (body: ReturnType<typeof confirmed>) => ({ ...body, lrAccuracyByType: {}, lrTopPriorityLogicTypes: [] })],
  ["stale", (body: ReturnType<typeof confirmed>) => ({ ...body, extraction: { ...body.extraction, extractedAt: new Date(Date.now() - 86400001).toISOString() } })],
  ["future extraction", (body: ReturnType<typeof confirmed>) => ({ ...body, extraction: { ...body.extraction, extractedAt: new Date(Date.now() + 60000).toISOString() } })],
  ["confirmation before review", (body: ReturnType<typeof confirmed>) => ({ ...body, confirmation: { ...body.confirmation, confirmedAt: new Date(Date.now() - 60000).toISOString() } })],
])("rejects %s without saving a snapshot", async (_name, change) => {
  const { saved } = await student("invalid@example.test");
  expect((await approval(change(confirmed()))).status).toBe(422);
  expect(await listApprovedAnalyticsSnapshots(saved.id)).toEqual([]);
});
it("requires a session and an onboarded Student, and rejects malformed JSON", async () => {
  expect((await approval(confirmed())).status).toBe(401);
  const owner = await createAccount({ email: "new@example.test", name: "New" });
  if (!owner) throw new Error("Account fixture missing");
  state.session = { user: owner, expires: "2099-01-01" };
  expect((await approval(confirmed())).status).toBe(404);
  expect((await approve(new NextRequest("http://localhost/api/analytics", { method: "POST", body: "{" }))).status).toBe(422);
});


it("generates an admin Sample analytics snapshot and approves it on the simulated date", async () => {
  const { saved, account } = await student("admin@example.test", "admin");
  await database.owner.execute(sql`update accounts set simulated_date = '2027-03-08' where id = ${account.id}`);
  const sample = await generateTestSample("improving");
  expect(sample.rows.length).toBeGreaterThan(0);
  const body = confirmed(summarizeAnalyticsRows(sample.rows));
  const response = await approval({ ...body, extraction: { source: "admin_sample", extractedAt: sample.extractedAt } });
  expect(response.status).toBe(201);
  const [snapshot] = await listApprovedAnalyticsSnapshots(saved.id);
  expect(snapshot).toMatchObject({ weekOf: "2027-03-08", extraction: { source: "admin_sample" } });
  expect(snapshot.approvedAt.slice(0, 10)).toMatch(/^2027-03-0[89]$/);
  const next = await generateTestSample("steady");
  expect(next.rows.length).toBeGreaterThan(0);
});
it.each(["student", "stale-admin"])("refuses Sample analytics snapshots from a %s", async (role) => {
  const { saved } = await student("student@example.test");
  if (role === "stale-admin" && state.session?.user) state.session.user.role = "admin";
  await expect(generateTestSample("steady")).rejects.toThrow();
  const body = confirmed();
  expect((await approval({ ...body, extraction: { ...body.extraction, source: "admin_sample" } })).status).toBe(403);
  expect(await listApprovedAnalyticsSnapshots(saved.id)).toEqual([]);
});
it("asks an admin to generate a new sample after 24 hours", async () => {
  const { saved } = await student("admin@example.test", "admin");
  const body = confirmed();
  const response = await approval({ ...body, extraction: { source: "admin_sample", extractedAt: new Date(Date.now() - 86400001).toISOString() } });
  expect(response.status).toBe(422);
  expect(await response.json()).toEqual({ error: "Generate a new sample analytics snapshot before saving." });
  expect(await listApprovedAnalyticsSnapshots(saved.id)).toEqual([]);
});
it.each([["admin_sample", 201], ["7sage_screenshot", 422]])("handles a browser clock behind extraction for %s", async (source, status) => {
  await student("admin@example.test", "admin");
  const body = confirmed();
  const response = await approval({ ...body, extraction: { source, extractedAt: new Date(Date.now() - 60000).toISOString() }, confirmation: { ...body.confirmation, confirmedAt: new Date(Date.now() - 120000).toISOString() } });
  expect(response.status).toBe(status);
});
it("resets only the admin's test snapshots and keeps the other student's approved snapshots", async () => {
  const other = await student("other@example.test");
  await approval(confirmed());
  const admin = await student("admin@example.test", "admin");
  await database.owner.execute(sql`update accounts set simulated_date = '2027-03-08' where id = ${admin.account.id}`);
  await approval(confirmed());
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
  await approval(confirmed());
  const owner = await student("owner@example.test");
  await approval(confirmed());
  const form = new FormData();
  form.set("confirmation", "DELETE");
  await deleteAccount(form);
  expect(await listApprovedAnalyticsSnapshots(owner.saved.id)).toEqual([]);
  expect(await listApprovedAnalyticsSnapshots(other.saved.id)).toHaveLength(1);
  const admin = await student("admin@example.test", "admin");
  await approval(confirmed());
  await expect(deleteAccount(form)).rejects.toThrow();
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
  await approval(confirmed());
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
  await approval(confirmed());
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
  expect((await approval(confirmed())).status).toBe(201);
  expect((await listApprovedAnalyticsSnapshots(saved.id))[0]).toMatchObject({ weekOf: "2026-10-07", approvedAt: "2026-10-08T03:00:00.000Z", extraction: { source: "7sage_screenshot" } });
});
it.each(["student", "admin"] as const)("ignores a supplied schedule test date and another Student ID for a %s's screenshot", async (role) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-14T16:00:00Z"));
  const { saved } = await student("owner@example.test", role);
  expect((await approval({ ...confirmed(), scheduleTestDate: "2026-09-21", studentId: "someone-else" })).status).toBe(201);
  expect((await listApprovedAnalyticsSnapshots(saved.id))[0]).toMatchObject({ studentId: saved.id, weekOf: "2026-09-14", approvedAt: "2026-09-14T16:00:00.000Z" });
});
it("rejects missing screenshot input", async () => {
  const response = await extract(new NextRequest("http://localhost/api/analytics/extract", { method: "POST", body: new FormData() }));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "No image provided" });
});
it("retains existing acceptance of fabricated screenshot provenance and unknown analytics labels", async () => {
  const { saved } = await student("evidence@example.test");
  const body = confirmed({ lrAccuracyByType: { "Unknown analytics label": 0.93 }, lrTopPriorityLogicTypes: [] });
  expect((await approval(body)).status).toBe(201);
  const [snapshot] = await listApprovedAnalyticsSnapshots(saved.id);
  expect(snapshot).toMatchObject({ lrAccuracyByType: { "Unknown analytics label": 0.93 }, extraction: body.extraction });
});
it("retains the approval handler's lack of an independent Origin check and cache-control header", async () => {
  await student("evidence@example.test");
  const response = await approve(new NextRequest("http://localhost/api/analytics", {
    method: "POST", headers: { Origin: "https://foreign.example.test", "Content-Type": "application/json" }, body: JSON.stringify(confirmed()),
  }));
  expect(response.status).toBe(201);
  expect(response.headers.get("cache-control")).toBeNull();
});
