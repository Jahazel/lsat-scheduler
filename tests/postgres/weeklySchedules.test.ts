import { renderToStaticMarkup } from "react-dom/server";
import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, beforeEach, expect, it, vi } from "vitest";
import { setUpAppTestDatabase } from "./appTestDatabase";
import { getPostgresDatabase } from "../../src/lib/postgres";
import { createStudent } from "../../src/lib/studentRepository";
import { createApprovedAnalyticsSnapshot } from "../../src/lib/analyticsSnapshotRepository";
import { listWeeklySchedulesForStudent, postgresCurrentWeekRepositories } from "../../src/lib/weeklyScheduleRepository";
import { saveActivityCheckIn } from "../../src/app/dashboard/actions";
import { postgresActivityCheckIns } from "../../src/lib/activityCheckInRepository";
import { SCHEDULING_POLICY_VERSION } from "../../src/lib/currentWeeklySchedule";
import ProgressPage from "../../src/app/progress/page";
import { expectUnexpectedFailure } from "./plannedAnswer";
import DashboardPage from "../../src/app/dashboard/page";

const state = vi.hoisted((): { session: Session | null } => ({ session: null }));
vi.mock("@/auth", () => ({ auth: async () => state.session }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => import("./fakeNavigation"));

const database = setUpAppTestDatabase();
beforeEach(async () => {
  state.session = null;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-12T16:00:00Z"));
  await database.owner.execute(sql`truncate accounts cascade`);
});
afterAll(() => vi.useRealTimers());
async function student(email = "student@example.test", role: "student" | "admin" = "student") {
  const account = await database.createAccountAsOwner({ email, name: "Student", role });
  if (!account) throw new Error("Account fixture already exists");
  const saved = await createStudent(account.id, {
    currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
    preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
    dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
  });
  if (!saved) throw new Error("Student fixture already exists");
  state.session = { user: account, expires: "2099-01-01" };
  return { account, saved };
}
async function approve(studentId: string) {
  await createApprovedAnalyticsSnapshot(studentId, {
    status: "approved", weekOf: "2026-10-12", lrAccuracyByType: { Strengthen: 0.7 }, lrTopPriorityLogicTypes: [],
    rcAccuracyByType: { Law: 0.58, Comparative: 0.7, Science: 0.64, Humanities: 0.81, Art: 0.77 },
    approvedAt: new Date(), extraction: { source: "7sage_screenshot", extractedAt: new Date() },
    confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt: new Date() },
  });
}
const dashboard = () => DashboardPage({ searchParams: Promise.resolve({}) });

it("two parallel This week visits save one identical Weekly schedule as the app role", async () => {
  const { saved } = await student();
  await approve(saved.id);
  const pages = await Promise.all([dashboard(), dashboard()]);
  expect(pages.map((page) => renderToStaticMarkup(page)).every((page) => page.includes("Your plan for this week"))).toBe(true);
  const schedules = await listWeeklySchedulesForStudent(saved.id);
  expect(schedules).toHaveLength(1);
  expect(schedules[0]).toMatchObject({ studentId: saved.id, weekStartDate: "2026-10-12", policyVersion: SCHEDULING_POLICY_VERSION });
  expect(schedules[0].sourceSnapshotIds).toHaveLength(1);
  expect((await getPostgresDatabase().execute(sql`select current_user`)).rows).toEqual([{ current_user: database.role }]);
  await dashboard();
  expect(await listWeeklySchedulesForStudent(saved.id)).toEqual(schedules);
});

it("checks off and clears a line across reloads without changing the planned schedule", async () => {
  const { saved } = await student();
  await approve(saved.id);
  await dashboard();
  const [schedule] = await listWeeklySchedulesForStudent(saved.id);
  const input = { scheduleId: schedule.id, activityId: "MONDAY:0", status: "completed" as const };
  const checkIn = await saveActivityCheckIn(input);
  expect(checkIn).toEqual({ id: expect.any(String), ...input });
  expect(await postgresActivityCheckIns.listForSchedule(schedule.id)).toContainEqual(checkIn);
  expect(renderToStaticMarkup(await dashboard())).toContain('aria-valuenow="1"');
  const cleared = await saveActivityCheckIn({ ...input, status: "not_started" });
  expect(cleared).toEqual({ ...checkIn, status: "not_started" });
  expect(await postgresActivityCheckIns.listForSchedule(schedule.id)).toContainEqual(cleared);
  expect(renderToStaticMarkup(await dashboard())).toContain('aria-valuenow="0"');
  expect(await listWeeklySchedulesForStudent(saved.id)).toEqual([schedule]);
});

it("shows finished weeks in Progress and refuses check-in changes to them", async () => {
  const { saved } = await student();
  await approve(saved.id);
  await dashboard();
  const [schedule] = await listWeeklySchedulesForStudent(saved.id);
  const progress = (week?: string) => ProgressPage({ searchParams: Promise.resolve({ week }) });
  expect(renderToStaticMarkup(await progress())).toContain("No finished weeks yet.");
  await saveActivityCheckIn({ scheduleId: schedule.id, activityId: "MONDAY:0", status: "completed" });
  vi.setSystemTime(new Date("2026-10-19T16:00:00Z"));
  const markup = renderToStaticMarkup(await progress());
  expect(markup).toContain('href="/progress?week=2026-10-12"');
  expect(markup).toContain("Avg. done");
  expect(markup).not.toContain("No finished weeks yet.");
  expect(renderToStaticMarkup(await progress("2026-10-12"))).toContain("Your past plan");
  await expectUnexpectedFailure(database, saveActivityCheckIn({ scheduleId: schedule.id, activityId: "MONDAY:0", status: "not_started" }), "Error");
  expect(await postgresActivityCheckIns.listForSchedule(schedule.id))
    .toContainEqual(expect.objectContaining({ activityId: "MONDAY:0", status: "completed" }));
  expect(await listWeeklySchedulesForStudent(saved.id)).toEqual([schedule]);
  await expect(DashboardPage({ searchParams: Promise.resolve({ historyWeek: "2026-10-12" }) }))
    .rejects.toThrow("redirect:/progress?week=2026-10-12");
  await expect(progress("2026-10-19")).rejects.toThrow("redirect:/dashboard");
  expect(renderToStaticMarkup(await progress("2000-01-03"))).toContain("Your weeks");
});

it.each(["student", "admin"] as const)("refuses another student's check-in for a %s", async (role) => {
  const owner = await student();
  await approve(owner.saved.id);
  await dashboard();
  const [schedule] = await listWeeklySchedulesForStudent(owner.saved.id);
  await student("other@example.test", role);
  await expectUnexpectedFailure(database, saveActivityCheckIn({ scheduleId: schedule.id, activityId: "MONDAY:0", status: "completed" }), "Error");
  expect((await postgresActivityCheckIns.listForSchedule(schedule.id)).every((row) => row.status === "not_started")).toBe(true);
  expect(renderToStaticMarkup(await ProgressPage({ searchParams: Promise.resolve({}) }))).toContain("No finished weeks yet.");
});

it("requires a session and a Student, and rejects malformed or missing activities", async () => {
  const input = { scheduleId: "00000000-0000-4000-8000-000000000000", activityId: "MONDAY:0", status: "completed" as const };
  await expectUnexpectedFailure(database, saveActivityCheckIn(input), "Error");
  await expect(dashboard()).rejects.toThrow("redirect:/login");
  const account = await database.createAccountAsOwner({ email: "new@example.test", name: "New" });
  if (!account) throw new Error("Missing fixture");
  state.session = { user: account, expires: "2099-01-01" };
  await expectUnexpectedFailure(database, saveActivityCheckIn(input), "Error");
  await expect(dashboard()).rejects.toThrow("redirect:/onboarding");
  const { saved } = await student();
  await approve(saved.id);
  await dashboard();
  const [schedule] = await listWeeklySchedulesForStudent(saved.id);
  for (const activityId of ["MONDAY:999", "MONDAY:00"]) {
    await expectUnexpectedFailure(database, saveActivityCheckIn({ ...input, scheduleId: schedule.id, activityId }), "Error");
  }
  await expectUnexpectedFailure(database, saveActivityCheckIn({ ...input, scheduleId: schedule.id, activityId: "INVALID:0" }), "ZodError");
  // @ts-expect-error A check-in is checked off or not; there is no Skip.
  await expectUnexpectedFailure(database, saveActivityCheckIn({ ...input, scheduleId: schedule.id, status: "skipped" }), "ZodError");
  await expectUnexpectedFailure(database, saveActivityCheckIn({ ...input, scheduleId: "not-a-uuid" }), "ZodError");
});

it("ensures only missing check-ins under parallel visits and preserves existing reports", async () => {
  const { saved } = await student();
  await approve(saved.id);
  await dashboard();
  const [schedule] = await listWeeklySchedulesForStudent(saved.id);
  await getPostgresDatabase().execute(sql`delete from activity_check_ins where schedule_id = ${schedule.id}::uuid`);
  const first = await saveActivityCheckIn({ scheduleId: schedule.id, activityId: "MONDAY:0", status: "completed" });
  await Promise.all([dashboard(), dashboard()]);
  const checkIns = await postgresActivityCheckIns.listForSchedule(schedule.id);
  expect(checkIns).toContainEqual(first);
  expect(checkIns.filter((row) => row.activityId !== "MONDAY:0").every((row) => row.status === "not_started")).toBe(true);
  const count = Object.values(schedule.schedule.days).reduce((sum, day) => sum + day.activities.length, 0);
  expect(checkIns).toHaveLength(count);
});

it("cannot update a saved schedule as either the app role or database owner", async () => {
  const { saved } = await student();
  await approve(saved.id);
  await dashboard();
  const [schedule] = await listWeeklySchedulesForStudent(saved.id);
  await expect(getPostgresDatabase().execute(sql`update weekly_schedules set policy_version = 'changed' where id = ${schedule.id}::uuid`)).rejects.toThrow();
  await expect(database.owner.execute(sql`update weekly_schedules set policy_version = 'changed' where id = ${schedule.id}::uuid`)).rejects.toThrow();
  expect(await listWeeklySchedulesForStudent(saved.id)).toEqual([schedule]);
});

it.each(["student", "admin"] as const)("shows This week for a %s and opens the weekly upload for a new week", async (role) => {
  const { saved } = await student("student@example.test", role);
  await expect(dashboard()).rejects.toThrow("redirect:/dashboard/upload");
  await approve(saved.id);
  expect(renderToStaticMarkup(await dashboard())).toContain("Your plan for this week");
  vi.setSystemTime(new Date("2026-10-19T16:00:00Z"));
  await expect(dashboard()).rejects.toThrow("redirect:/dashboard/upload");
  expect(await listWeeklySchedulesForStudent(saved.id)).toHaveLength(1);
});


it("returns the same saved record to two competing insertions without an UPDATE", async () => {
  const { saved } = await student();
  await approve(saved.id);
  await dashboard();
  const [candidate] = await listWeeklySchedulesForStudent(saved.id);
  await getPostgresDatabase().execute(sql`delete from weekly_schedules where id = ${candidate.id}::uuid`);
  const first = { ...candidate, policyVersion: "candidate-a" };
  const second = { ...candidate, policyVersion: "candidate-b" };
  const results = await Promise.all([
    postgresCurrentWeekRepositories.weeklySchedules.create(first),
    postgresCurrentWeekRepositories.weeklySchedules.create(second),
  ]);
  expect(results[0]).toEqual(results[1]);
  expect(await listWeeklySchedulesForStudent(saved.id)).toEqual([results[0]]);
  expect(results[0].id).not.toBe(candidate.id);
});

it.each(["student", "admin"] as const)("retains the %s's clock for newly ensured check-ins", async (role) => {
  const { saved, account } = await student("clock@example.test", role);
  if (role === "admin") {
    await database.owner.execute(sql`update accounts set simulated_date = '2027-01-04' where id = ${account.id}::uuid`);
  }
  const now = role === "admin" ? new Date("2027-01-04T16:00:00Z") : new Date();
  await createApprovedAnalyticsSnapshot(saved.id, {
    status: "approved", weekOf: now.toISOString().slice(0, 10), lrAccuracyByType: { Strengthen: 0.7 }, lrTopPriorityLogicTypes: [],
    rcAccuracyByType: { Law: 0.58, Comparative: 0.7, Science: 0.64, Humanities: 0.81, Art: 0.77 },
    approvedAt: now, extraction: { source: "7sage_screenshot", extractedAt: now },
    confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt: now },
  });
  await dashboard();
  const [schedule] = await listWeeklySchedulesForStudent(saved.id);
  await getPostgresDatabase().execute(sql`delete from activity_check_ins where schedule_id = ${schedule.id}::uuid`);
  vi.setSystemTime(new Date("2026-10-13T16:00:00Z"));
  await dashboard();
  const { rows } = await getPostgresDatabase().execute(sql`select extract(epoch from created_at)::double precision as seconds from activity_check_ins where schedule_id = ${schedule.id}::uuid`);
  expect(rows.length).toBeGreaterThan(0);
  const expected = role === "admin" ? new Date(schedule.generatedAt) : new Date("2026-10-13T16:00:00Z");
  for (const row of rows) expect(row.seconds).toBe(expected.getTime() / 1000);
});
