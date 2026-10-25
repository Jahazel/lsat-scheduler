import { renderToStaticMarkup } from "react-dom/server";
import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { createAppTestDatabase } from "./appTestDatabase";
import { closePostgresDatabase } from "../../src/lib/postgres";
import { findAccountById } from "../../src/lib/accountRepository";
import { createStudent, updateStudentByAccountId } from "../../src/lib/studentRepository";
import { listWeeklySchedulesForStudent } from "../../src/lib/weeklyScheduleRepository";
import { postgresActivityCheckIns } from "../../src/lib/activityCheckInRepository";
import { saveActivityCheckIn } from "../../src/app/dashboard/actions";
import { postgresAdminTestRepositories } from "../../src/lib/adminTestRepositories";
import { resetTestWorkspace } from "../../src/lib/adminTestWorkspace";
import type { Student } from "../../src/lib/types";
import { createApprovedAnalyticsSnapshot } from "../../src/lib/analyticsSnapshotRepository";
import AdminPage from "../../src/app/admin/page";
import AdminStudentPage from "../../src/app/admin/students/[id]/page";
import DashboardPage from "../../src/app/dashboard/page";
import { GET as listStudentsRoute } from "../../src/app/api/students/route";
import { GET as studentRoute } from "../../src/app/api/students/[id]/route";
import {
  generateTestSample, rebuildThisWeek, resetEverything, resetTestData, setSimulatedDate,
} from "../../src/app/admin/test/actions";

const state = vi.hoisted((): { session: Session | null } => ({ session: null }));
vi.mock("@/auth", () => ({ auth: async () => state.session }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
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
  vi.setSystemTime(new Date("2026-10-12T16:00:00Z"));
  await database.owner.execute(sql`truncate accounts cascade`);
});
afterAll(async () => {
  vi.useRealTimers();
  await closePostgresDatabase();
  process.env.DATABASE_URL = originalSetting;
  await database?.cleanup();
});

const profile: Student = {
  currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
};

async function student(name: string, role: "student" | "admin" = "student") {
  const email = `${name.toLowerCase()}@example.test`;
  const account = await database.createAccountAsOwner({ email, name, role });
  if (!account) throw new Error("Account fixture already exists");
  const saved = await createStudent(account.id, profile);
  if (!saved) throw new Error("Student fixture already exists");
  return { account: { ...account, email, name }, saved };
}

function signIn(account: { id: string; role: "student" | "admin"; email: string; name: string }) {
  state.session = { user: account, expires: "2099-01-01" };
}

async function everyRow() {
  const { rows } = await database.owner.execute(sql`select
    (select coalesce(json_agg(t order by t.id), '[]') from accounts t) as accounts,
    (select coalesce(json_agg(t order by t.id), '[]') from students t) as students,
    (select coalesce(json_agg(t order by t.id), '[]') from analytics_snapshots t) as analytics_snapshots,
    (select coalesce(json_agg(t order by t.id), '[]') from weekly_schedules t) as weekly_schedules,
    (select coalesce(json_agg(t order by t.id), '[]') from activity_check_ins t) as activity_check_ins`);
  return rows[0];
}

it("All students lists non-Admin students by name with their email, marks who needs analytics, and writes nothing", async () => {
  await student("zed");
  const bea = await student("Bea");
  await approve(bea.saved.id);
  const admin = await student("Admin", "admin");
  await student("amy");
  signIn(admin.account);
  const before = await everyRow();
  const markup = renderToStaticMarkup(await AdminPage());
  expect(await everyRow()).toEqual(before);
  const names = [...markup.matchAll(/<span class="font-medium[^"]*">([^<]+)<\/span>/g)].map((match) => match[1]);
  expect(names).toEqual(["amy", "Bea", "zed"]);
  expect(markup).toContain("bea@example.test");
  const marked = [...markup.matchAll(/<span class="font-medium[^"]*">([^<]+)<\/span>(<span[^>]*>Needs analytics)?/g)]
    .filter((match) => match[2]).map((match) => match[1]);
  expect(marked).toEqual(["amy", "zed"]);
  expect(markup).not.toContain("admin@example.test");
});

async function approve(studentId: string, weekOf = "2026-10-12") {
  await createApprovedAnalyticsSnapshot(studentId, {
    status: "approved", weekOf, lrAccuracyByType: { Strengthen: 0.7 }, lrTopPriorityLogicTypes: [],
    rcAccuracyByType: { Law: 0.58, Comparative: 0.7, Science: 0.64, Humanities: 0.81, Art: 0.77 },
    approvedAt: new Date(), extraction: { source: "7sage_screenshot", extractedAt: new Date() },
    confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt: new Date() },
  });
}
const dashboard = () => DashboardPage({ searchParams: Promise.resolve({}) });
const studentPage = (id: string) => AdminStudentPage({ params: Promise.resolve({ id }) });
const studentApi = (id: string) => studentRoute(new Request(`http://localhost/api/students/${id}`), { params: Promise.resolve({ id }) });

it("an Admin reads a student's Weekly schedule and profile without saving a schedule or check-in", async () => {
  const withSchedule = await student("Sam");
  await approve(withSchedule.saved.id);
  signIn(withSchedule.account);
  await dashboard();
  await database.owner.execute(sql`delete from activity_check_ins`);
  const withoutSchedule = await student("Nia");
  await approve(withoutSchedule.saved.id);
  const admin = await student("Admin", "admin");
  signIn(admin.account);
  const before = await everyRow();
  const markup = renderToStaticMarkup(await studentPage(withSchedule.saved.id));
  expect(markup).toContain("Viewing as admin — read only");
  expect(markup).toContain("sam@example.test");
  expect(markup).toContain("Your plan for this week");
  expect(renderToStaticMarkup(await studentPage(withoutSchedule.saved.id))).not.toContain("Your plan for this week");
  const response = await studentApi(withSchedule.saved.id);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    ...profile, id: withSchedule.saved.id, userId: withSchedule.account.id, name: "Sam", email: "sam@example.test",
  });
  const list = await listStudentsRoute();
  expect((await list.json()).map((record: { name: string }) => record.name)).toEqual(["Nia", "Sam"]);
  expect(await everyRow()).toEqual(before);
});

it("an Admin gets not found for an Admin-owned, missing, or malformed student ID", async () => {
  const admin = await student("Admin", "admin");
  signIn(admin.account);
  for (const id of [admin.saved.id, "00000000-0000-4000-8000-000000000000", "not-a-uuid"]) {
    await expect(studentPage(id)).rejects.toThrow("not-found");
    expect((await studentApi(id)).status).toBe(404);
  }
});

it.each(["student", "no-session"] as const)("refuses a %s the Admin pages, routes, and test tools without changing data", async (actor) => {
  const other = await student("Sam");
  await approve(other.saved.id);
  signIn(other.account);
  await dashboard();
  state.session = null;
  if (actor === "student") signIn(other.account);
  const before = await everyRow();
  await expect(AdminPage()).rejects.toThrow("redirect:/dashboard");
  await expect(studentPage(other.saved.id)).rejects.toThrow("redirect:/dashboard");
  expect((await listStudentsRoute()).status).toBe(403);
  expect((await studentApi(other.saved.id)).status).toBe(403);
  for (const tool of [
    () => setSimulatedDate("2026-10-20"), () => generateTestSample("steady"), rebuildThisWeek, resetTestData, resetEverything,
  ]) {
    await expect(tool()).rejects.toThrow("Admin access required.");
  }
  expect(await everyRow()).toEqual(before);
});

it("Rebuild deletes the current week's schedule and check-ins, and This week recreates it without an update", async () => {
  vi.setSystemTime(new Date("2026-10-05T16:00:00Z"));
  const admin = await student("Admin", "admin");
  await approve(admin.saved.id, "2026-10-05");
  signIn(admin.account);
  await dashboard();
  vi.setSystemTime(new Date("2026-10-12T16:00:00Z"));
  await approve(admin.saved.id);
  await dashboard();
  const [current, earlier] = await listWeeklySchedulesForStudent(admin.saved.id);
  expect(current.weekStartDate).toBe("2026-10-12");
  await saveActivityCheckIn({ scheduleId: current.id, activityId: "MONDAY:0", status: "completed" });
  const capacity = { ...profile.dailyCapacityMinutes, MONDAY: 120 };
  expect(await updateStudentByAccountId(admin.account.id, { ...profile, dailyCapacityMinutes: capacity })).toBe(true);

  await rebuildThisWeek();
  expect(await listWeeklySchedulesForStudent(admin.saved.id)).toEqual([earlier]);
  expect(await postgresActivityCheckIns.listForSchedule(current.id)).toEqual([]);

  await dashboard();
  const [rebuilt] = await listWeeklySchedulesForStudent(admin.saved.id);
  expect(rebuilt).toMatchObject({ weekStartDate: "2026-10-12" });
  expect(rebuilt.id).not.toBe(current.id);
  expect(rebuilt.generationInputs.student.dailyCapacityMinutes).toEqual(capacity);
  await expect(database.owner.execute(sql`update weekly_schedules set policy_version = 'changed' where id = ${rebuilt.id}::uuid`)).rejects.toThrow();
  expect(await findAccountById(admin.account.id)).toMatchObject({ role: "admin", simulatedDate: null });
});

async function adminWithTestHistory() {
  const other = await student("Sam");
  await approve(other.saved.id);
  signIn(other.account);
  await dashboard();
  const admin = await student("Admin", "admin");
  await approve(admin.saved.id);
  signIn(admin.account);
  await dashboard();
  const [schedule] = await listWeeklySchedulesForStudent(admin.saved.id);
  await saveActivityCheckIn({ scheduleId: schedule.id, activityId: "MONDAY:0", status: "completed" });
  await database.owner.execute(sql`update accounts set simulated_date = '2026-10-14' where id = ${admin.account.id}::uuid`);
  return { admin, other };
}

it.each(["test-data", "everything"] as const)("a forced failure inside the %s reset leaves the data unchanged", async (scope) => {
  const { admin } = await adminWithTestHistory();
  const before = await everyRow();
  const failing = {
    ...postgresAdminTestRepositories,
    inTransaction: (work: Parameters<typeof postgresAdminTestRepositories.inTransaction>[0]) =>
      postgresAdminTestRepositories.inTransaction((writes) => work({
        ...writes,
        async clearSimulatedDate() { throw new Error("forced reset failure"); },
      })),
  };
  await expect(resetTestWorkspace(admin.account.id, scope, failing)).rejects.toThrow("forced reset failure");
  expect(await everyRow()).toEqual(before);
});

it("Reset everything deletes the Admin's student and test history and keeps their Account, role, and other students", async () => {
  const { admin, other } = await adminWithTestHistory();
  const otherRows = await everyRow();
  await resetEverything();
  const after = await everyRow();
  expect(await findAccountById(admin.account.id)).toEqual({
    id: admin.account.id, email: "admin@example.test", name: "Admin", role: "admin", simulatedDate: null,
    disabledAt: null, sessionVersion: 0,
  });
  expect(after.students).toEqual((otherRows.students as { id: string }[]).filter((row) => row.id === other.saved.id));
  for (const table of ["analytics_snapshots", "weekly_schedules"] as const) {
    expect((after[table] as { student_id: string }[]).every((row) => row.student_id === other.saved.id)).toBe(true);
    expect(after[table]).toHaveLength(1);
  }
  expect(await listWeeklySchedulesForStudent(admin.saved.id)).toEqual([]);
});
