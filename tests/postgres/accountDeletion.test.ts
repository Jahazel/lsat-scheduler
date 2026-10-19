import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { createAppTestDatabase } from "./appTestDatabase";
import { closePostgresDatabase, getPostgresDatabase } from "../../src/lib/postgres";
import { createAccount } from "../../src/lib/accountRepository";
import { createStudent } from "../../src/lib/studentRepository";
import type { Student } from "../../src/lib/types";
import { deleteAccount } from "../../src/app/account/actions";

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
  await database.owner.execute(sql`truncate accounts cascade`);
});
afterAll(async () => {
  await closePostgresDatabase();
  process.env.DATABASE_URL = originalSetting;
  await database?.cleanup();
});

const profile: Student = {
  currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
};

async function studentWithRecords(email: string) {
  const account = await createAccount({ email, name: email, role: "student" });
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
  state.session = { user: { ...account, email, name: email }, expires: "2099-01-01" };
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

function confirmedDeletion() {
  const form = new FormData();
  form.set("confirmation", "DELETE");
  return form;
}

it("removes the Account, student, Analytics snapshots, Weekly schedules, and Activity check-ins", async () => {
  const owner = await studentWithRecords("owner@example.test");
  expect(await ownedRecords(owner.account.id, owner.student.id))
    .toEqual({ accounts: 1, students: 1, analytics_snapshots: 1, weekly_schedules: 2, activity_check_ins: 2 });
  await deleteAccount(confirmedDeletion());
  expect(await ownedRecords(owner.account.id, owner.student.id))
    .toEqual({ accounts: 0, students: 0, analytics_snapshots: 0, weekly_schedules: 0, activity_check_ins: 0 });
});

it("refuses deletion without the typed confirmation and keeps every record", async () => {
  const owner = await studentWithRecords("owner@example.test");
  await expect(deleteAccount(new FormData())).rejects.toThrow("Type DELETE");
  expect(await ownedRecords(owner.account.id, owner.student.id))
    .toEqual({ accounts: 1, students: 1, analytics_snapshots: 1, weekly_schedules: 2, activity_check_ins: 2 });
});

it("leaves another student's records untouched", async () => {
  const other = await studentWithRecords("other@example.test");
  const owner = await studentWithRecords("owner@example.test");
  await deleteAccount(confirmedDeletion());
  expect(await ownedRecords(owner.account.id, owner.student.id))
    .toEqual({ accounts: 0, students: 0, analytics_snapshots: 0, weekly_schedules: 0, activity_check_ins: 0 });
  expect(await ownedRecords(other.account.id, other.student.id))
    .toEqual({ accounts: 1, students: 1, analytics_snapshots: 1, weekly_schedules: 2, activity_check_ins: 2 });
});

it("keeps every record when the last cascading delete fails", async () => {
  const other = await studentWithRecords("other@example.test");
  const owner = await studentWithRecords("owner@example.test");
  await database.owner.execute(sql`create function reject_check_in_delete_test() returns trigger language plpgsql as
    'BEGIN RAISE EXCEPTION ''forced check-in delete failure''; END;'`);
  await database.owner.execute(sql`create trigger reject_check_in_delete_test before delete on activity_check_ins
    for each row execute function reject_check_in_delete_test()`);
  try {
    await expect(deleteAccount(confirmedDeletion())).rejects.toThrow();
    const full = { accounts: 1, students: 1, analytics_snapshots: 1, weekly_schedules: 2, activity_check_ins: 2 };
    expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(full);
    expect(await ownedRecords(other.account.id, other.student.id)).toEqual(full);
  } finally {
    await database.owner.execute(sql`drop trigger reject_check_in_delete_test on activity_check_ins`);
    await database.owner.execute(sql`drop function reject_check_in_delete_test()`);
  }
});
