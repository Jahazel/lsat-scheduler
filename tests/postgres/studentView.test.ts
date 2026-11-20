import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, beforeEach, expect, it, vi } from "vitest";
import { setUpAppTestDatabase } from "./appTestDatabase";
import { createApprovedAnalyticsSnapshot } from "../../src/lib/analyticsSnapshotRepository";
import { createStudent } from "../../src/lib/studentRepository";
import { listStudentRows, loadStudentView } from "../../src/lib/studentView";
import type { Student } from "../../src/lib/types";
import DashboardPage from "../../src/app/dashboard/(this-week)/page";

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

const profile: Student = {
  currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 60, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 60 },
};

async function student(name: string, role: "student" | "admin" = "student") {
  const email = `${name.toLowerCase()}@example.test`;
  const account = await database.createAccountAsOwner({ email, name, role });
  if (!account) throw new Error("Account fixture already exists");
  if (role === "student") await database.writeBillingRecordAsOwner(account.id);
  const saved = await createStudent(account.id, profile);
  if (!saved) throw new Error("Student fixture already exists");
  return { account: { ...account, email, name }, saved };
}

async function saveWeek({ account, saved }: Awaited<ReturnType<typeof student>>, monday: string) {
  vi.setSystemTime(new Date(`${monday}T16:00:00Z`));
  await createApprovedAnalyticsSnapshot(saved.id, {
    status: "approved", weekOf: monday, lrAccuracyByType: { Strengthen: 0.7 }, lrTopPriorityLogicTypes: [],
    rcAccuracyByType: { Law: 0.58, Comparative: 0.7, Science: 0.64, Humanities: 0.81, Art: 0.77 },
    approvedAt: new Date(), extraction: { source: "7sage_screenshot", extractedAt: new Date() },
    confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt: new Date() },
  });
  state.session = { user: account, expires: "2099-01-01" };
  await DashboardPage({ searchParams: Promise.resolve({}) });
  state.session = null;
}

async function holdWeekOf(accountId: string, monday: string) {
  await database.owner.execute(sql`delete from billing_records where account_id = ${accountId}`);
  await database.writeBillingRecordAsOwner(accountId, {
    stripeStatus: "trialing", firstChargeSucceeded: false, freeWeekEndsAt: new Date(`${monday}T05:00:00Z`),
  });
}

it("loads a student's past weeks newest first without the held week, with only their check-ins", async () => {
  const sam = await student("Sam");
  for (const monday of ["2026-09-28", "2026-10-05", "2026-10-12"]) await saveWeek(sam, monday);
  await holdWeekOf(sam.account.id, "2026-10-05");
  const now = new Date("2026-10-19T16:00:00Z");

  const view = await loadStudentView(sam.saved.id, now);
  expect(view?.thisWeekStart).toBe("2026-10-19");
  expect(view?.pastWeeks.schedules.map((week) => week.weekStartDate)).toEqual(["2026-10-12", "2026-09-28"]);
  const kept = new Set(view?.pastWeeks.schedules.map((week) => week.id));
  expect(view?.pastWeeks.checkIns.length).toBeGreaterThan(0);
  expect(view?.pastWeeks.checkIns.every((checkIn) => kept.has(checkIn.scheduleId))).toBe(true);

  await database.owner.execute(sql`update billing_records set first_charge_succeeded = true, stripe_status = 'active'`);
  const paid = await loadStudentView(sam.saved.id, now);
  expect(paid?.pastWeeks.schedules.map((week) => week.weekStartDate)).toEqual(["2026-10-12", "2026-10-05", "2026-09-28"]);
});

it("loads a student's facts, this week, and uploads, and hides a held this week", async () => {
  const sam = await student("Sam");
  await saveWeek(sam, "2026-10-12");
  const now = new Date("2026-10-12T16:00:00Z");

  const view = await loadStudentView(sam.saved.id, now);
  expect(view).toMatchObject({
    student: { id: sam.saved.id, email: "sam@example.test", goalScore: 165, weeklyMinutes: 570 },
    plan: "paid",
    needsAnalytics: false,
    thisWeek: { kind: "schedule", schedule: { weekStartDate: "2026-10-12" } },
  });
  expect(view?.uploads.flatMap((month) => month.uploads)).toHaveLength(1);

  await holdWeekOf(sam.account.id, "2026-10-12");
  expect((await loadStudentView(sam.saved.id, now))?.thisWeek).toEqual({ kind: "held_week" });

  const nia = await student("Nia");
  expect(await loadStudentView(nia.saved.id, now)).toMatchObject({
    needsAnalytics: true, uploads: [], pastWeeks: { schedules: [], checkIns: [] }, thisWeek: { kind: "analytics_required" },
  });
});

it("loads no view for an Admin-owned, missing, or malformed student ID", async () => {
  const admin = await student("Admin", "admin");
  for (const id of [admin.saved.id, "00000000-0000-4000-8000-000000000000", "not-a-uuid"]) {
    expect(await loadStudentView(id, new Date("2026-10-12T16:00:00Z"))).toBeNull();
  }
});

it("lists each student's row with this week ready, held, or none and their weekly minutes", async () => {
  const ready = await student("Ready");
  await saveWeek(ready, "2026-10-12");
  const held = await student("Held");
  await saveWeek(held, "2026-10-12");
  await holdWeekOf(held.account.id, "2026-10-12");
  await student("None");
  await student("Admin", "admin");

  const rows = await listStudentRows(new Date("2026-10-12T16:00:00Z"));
  expect(rows.map(({ name, thisWeek, weeklyMinutes, needsAnalytics }) => ({ name, thisWeek, weeklyMinutes, needsAnalytics }))).toEqual([
    { name: "Held", thisWeek: "held", weeklyMinutes: 570, needsAnalytics: false },
    { name: "None", thisWeek: "none", weeklyMinutes: 570, needsAnalytics: true },
    { name: "Ready", thisWeek: "ready", weeklyMinutes: 570, needsAnalytics: false },
  ]);
});
