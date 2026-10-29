import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setUpAppTestDatabase } from "./appTestDatabase";
import { getPostgresDatabase } from "../../src/lib/postgres";
import { createStudent } from "../../src/lib/studentRepository";
import type { Student } from "../../src/lib/types";
import { deleteAccount } from "../../src/app/account/actions";
import { expectUnexpectedFailure } from "./plannedAnswer";

const state = vi.hoisted((): { session: Session | null } => ({ session: null }));
vi.mock("@/auth", () => ({ auth: async () => state.session, signOut: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-vercel-forwarded-for": "203.0.113.1" }) }));

const database = setUpAppTestDatabase();
beforeEach(async () => {
  state.session = null;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));
  await database.owner.execute(sql`truncate accounts cascade`);
});
afterEach(() => vi.useRealTimers());

const profile: Student = {
  currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
};

const minutesAgo = (minutes: number) => Math.floor(Date.now() / 1000) - minutes * 60;

async function studentWithRecords(email: string, role: "student" | "admin" = "student") {
  const account = await database.createAccountAsOwner({ email, name: email, role });
  if (!account) throw new Error("Account fixture already exists");
  const student = await createStudent(account.id, profile);
  if (!student) throw new Error("Student fixture already exists");
  const db = getPostgresDatabase();
  await db.execute(sql`
    insert into analytics_snapshots (
      student_id, week_of, approved_at, lr_accuracy_by_type, lr_top_priority_logic_types,
      extraction_source, extracted_at, extracted_values_match, is_latest_analytics, confirmed_at
    ) values (
      ${student.id}::uuid, '2026-10-12'::date, now(), '{"Strengthen": 0.7}'::jsonb, '{}'::text[],
      '7sage_screenshot', now(), true, true, now()
    )
  `);
  for (const week of ["2026-10-05", "2026-10-12"]) {
    const inserted = await db.execute(sql`
      insert into weekly_schedules (student_id, week_start_date, generated_at, schedule, source_snapshot_ids, generation_inputs, policy_version)
      values (${student.id}::uuid, ${week}::date, now(), '{}'::jsonb, '{}'::uuid[], '{}'::jsonb, 'fixture') returning id
    `);
    await db.execute(sql`
      insert into activity_check_ins (schedule_id, activity_id, status)
      values (${inserted.rows[0].id}::uuid, 'MONDAY:0', 'completed')
    `);
  }
  state.session = { user: { ...account, email, name: email }, signedInAt: minutesAgo(1), expires: "2099-01-01" };
  return { account, student };
}

async function ownedRecords(accountId: string, studentId: string) {
  const { rows } = await getPostgresDatabase().execute(sql`
    select
      (select count(*) from accounts where id = ${accountId}::uuid)::int as accounts,
      (select count(*) from students where id = ${studentId}::uuid)::int as students,
      (select count(*) from analytics_snapshots where student_id = ${studentId}::uuid)::int as analytics_snapshots,
      (select count(*) from weekly_schedules where student_id = ${studentId}::uuid)::int as weekly_schedules,
      (select count(*) from activity_check_ins c join weekly_schedules s on s.id = c.schedule_id
        where s.student_id = ${studentId}::uuid)::int as activity_check_ins
  `);
  return rows[0];
}

function confirmation(text: string) {
  const form = new FormData();
  form.set("confirmation", text);
  return form;
}
const deleteWith = (text: string) => deleteAccount(null, confirmation(text));
const allRecords = { accounts: 1, students: 1, analytics_snapshots: 1, weekly_schedules: 2, activity_check_ins: 2 };
const noRecords = { accounts: 0, students: 0, analytics_snapshots: 0, weekly_schedules: 0, activity_check_ins: 0 };

it("removes the Account, student, Analytics snapshots, Weekly schedules, and Activity check-ins", async () => {
  const owner = await studentWithRecords("owner@example.test");
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(allRecords);
  await deleteWith("DELETE");
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(noRecords);
});

it.each(["", "delete", " DELETE"])("refuses the confirmation %j and keeps every record", async (text) => {
  const owner = await studentWithRecords("owner@example.test");
  expect(await deleteWith(text)).toBe("wrong-text");
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(allRecords);
});

it("deletes with a Google sign-in exactly 10 minutes old", async () => {
  const owner = await studentWithRecords("owner@example.test");
  state.session = { ...state.session!, signedInAt: minutesAgo(10) };
  await deleteWith("DELETE");
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(noRecords);
});

it.each([
  ["more than 10 minutes old", () => minutesAgo(10) - 1],
  ["missing", () => undefined],
])("refuses deletion when the sign-in time is %s, even with DELETE typed", async (_name, signedInAt) => {
  const owner = await studentWithRecords("owner@example.test");
  state.session = { ...state.session!, signedInAt: signedInAt() };
  expect(await deleteWith("DELETE")).toBe("sign-in-too-old");
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(allRecords);
});

it("refuses an Admin with a recent sign-in and keeps every record", async () => {
  const admin = await studentWithRecords("admin@example.test", "admin");
  await expectUnexpectedFailure(database, deleteWith("DELETE"), "Error");
  expect(await ownedRecords(admin.account.id, admin.student.id)).toEqual(allRecords);
});

it("leaves another student's records untouched", async () => {
  const other = await studentWithRecords("other@example.test");
  const owner = await studentWithRecords("owner@example.test");
  await deleteWith("DELETE");
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(noRecords);
  expect(await ownedRecords(other.account.id, other.student.id)).toEqual(allRecords);
});

it("keeps every record when the last cascading delete fails", async () => {
  const other = await studentWithRecords("other@example.test");
  const owner = await studentWithRecords("owner@example.test");
  await database.owner.execute(sql`create function reject_check_in_delete_test() returns trigger language plpgsql as
    'BEGIN RAISE EXCEPTION ''forced check-in delete failure''; END;'`);
  await database.owner.execute(sql`create trigger reject_check_in_delete_test before delete on activity_check_ins
    for each row execute function reject_check_in_delete_test()`);
  try {
    await expectUnexpectedFailure(database, deleteWith("DELETE"), "Error:P0001");
    expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(allRecords);
    expect(await ownedRecords(other.account.id, other.student.id)).toEqual(allRecords);
  } finally {
    await database.owner.execute(sql`drop trigger reject_check_in_delete_test on activity_check_ins`);
    await database.owner.execute(sql`drop function reject_check_in_delete_test()`);
  }
});
