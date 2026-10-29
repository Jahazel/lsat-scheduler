import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import { setUpAppTestDatabase } from "./appTestDatabase";
import { getPostgresDatabase } from "../../src/lib/postgres";
import { createStudent } from "../../src/lib/studentRepository";
import type { Student } from "../../src/lib/types";
import { deleteAccount } from "../../src/app/account/actions";
import { finishAccountDeletion } from "../../src/lib/accountDeletion";
import { accountSessionToken } from "../../src/lib/accountSession";
import { createGoogleAccountOnSignIn } from "../../src/lib/authAccounts";
import { runDailyCleanup } from "../../src/lib/dailyCleanup";
import { DELETION_WILL_FINISH_PATH, DISABLED_SIGN_IN_PATH } from "../../src/lib/loginNotice";
import { expectUnexpectedFailure } from "./plannedAnswer";

const { originalSecret } = vi.hoisted(() => {
  const originalSecret = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "account-deletion-test-secret-0123456789";
  return { originalSecret };
});
const state = vi.hoisted((): { session: Session | null } => ({ session: null }));
vi.mock("@/auth", () => ({ auth: async () => state.session, signOut: vi.fn() }));
const { signOut } = await import("@/auth");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-vercel-forwarded-for": "203.0.113.1" }) }));

const database = setUpAppTestDatabase();
beforeEach(async () => {
  state.session = null;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));
  await database.owner.execute(sql`truncate accounts, deletion_list, pending_signups, security_log cascade`);
});
afterEach(() => vi.useRealTimers());
afterAll(() => {
  process.env.AUTH_SECRET = originalSecret;
});

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
  await db.execute(sql`
    insert into practice_test_results (
      student_id, week_of, prep_test, sections, missed_stem_type_counts,
      approved_at, extraction_source, extracted_at, extracted_values_match, is_this_weeks_practice_test, confirmed_at
    ) values (
      ${student.id}::uuid, '2026-10-12'::date, 158, '[{},{},{},{}]'::jsonb, '{"Weaken":1}'::jsonb,
      now(), 'admin_sample', now(), true, true, now()
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
      (select count(*) from practice_test_results where student_id = ${studentId}::uuid)::int as practice_test_results,
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
const allRecords = { accounts: 1, students: 1, analytics_snapshots: 1, practice_test_results: 1, weekly_schedules: 2, activity_check_ins: 2 };
const noRecords = { accounts: 0, students: 0, analytics_snapshots: 0, practice_test_results: 0, weekly_schedules: 0, activity_check_ins: 0 };

const keyedHash = (email: string) => createHmac("sha256", process.env.AUTH_SECRET!).update(email).digest("hex");

async function deletionList() {
  const { rows } = await database.owner.execute(sql`
    select *, deleted_at > now() - interval '1 minute' as recent from deletion_list order by account_id
  `);
  return rows;
}

const listed = (accountId: string, email: string) => ({ account_id: accountId, email_hash: keyedHash(email), deleted_at: expect.anything(), recent: true });

async function deletionEvents() {
  const { rows } = await database.owner.execute(sql`
    select event, result, error_type from security_log where event in ('account_deletion', 'unexpected_failure') order by logged_at, id
  `);
  return rows;
}

const deletingSince = async (accountId: string) =>
  (await database.owner.execute(sql`select deleting_since::text from accounts where id = ${accountId}::uuid`)).rows[0]?.deleting_since;

async function sessionFor(accountId: string) {
  return accountSessionToken({ token: { id: accountId, sessionVersion: 0, signedInAt: minutesAgo(1) } });
}

async function googleSignIn(email: string) {
  return createGoogleAccountOnSignIn({
    user: { email, name: email },
    account: { provider: "google", providerAccountId: `google-${email}`, type: "oidc" },
    profile: { email_verified: true },
  });
}

async function failCheckInDeletes<T>(work: () => Promise<T>) {
  await database.owner.execute(sql`create function reject_check_in_delete_test() returns trigger language plpgsql as
    'BEGIN RAISE EXCEPTION ''forced check-in delete failure''; END;'`);
  await database.owner.execute(sql`create trigger reject_check_in_delete_test before delete on activity_check_ins
    for each row execute function reject_check_in_delete_test()`);
  try {
    return await work();
  } finally {
    await database.owner.execute(sql`drop trigger reject_check_in_delete_test on activity_check_ins`);
    await database.owner.execute(sql`drop function reject_check_in_delete_test()`);
  }
}

async function markedAfterFailedDeletion(email: string) {
  const owner = await studentWithRecords(email);
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(await failCheckInDeletes(() => deleteWith("DELETE"))).toBeNull();
    expect(signOut).toHaveBeenLastCalledWith({ redirectTo: DELETION_WILL_FINISH_PATH });
  } finally {
    logged.mockRestore();
  }
  return { ...owner, mark: await deletingSince(owner.account.id) };
}

it("removes the Account, Student, Analytics snapshots, Practice-test results, Weekly schedules, and Activity check-ins", async () => {
  const owner = await studentWithRecords("owner@example.test");
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(allRecords);
  await deleteWith("DELETE");
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(noRecords);
  expect(await deletionEvents()).toEqual([{ event: "account_deletion", result: "deleted", error_type: null }]);
});

it("adds exactly one deletion list row with only the Account ID, the security log's keyed email hash, and the time", async () => {
  const owner = await studentWithRecords("owner@example.test");
  await deleteWith("DELETE");
  expect(await deletionList()).toEqual([listed(owner.account.id, "owner@example.test")]);
  const columns = await database.owner.execute(sql`
    select column_name from information_schema.columns where table_name = 'deletion_list' order by ordinal_position
  `);
  expect(columns.rows.map((row) => row.column_name)).toEqual(["account_id", "email_hash", "deleted_at"]);
});

it("keeps a Pending signup with the deleted Account's email", async () => {
  await studentWithRecords("owner@example.test");
  await database.owner.execute(sql`
    insert into pending_signups (email, name, password_hash, token_hash, token_expires_at)
    values ('owner@example.test', 'Owner', 'hash', 'token-owner', now() + interval '1 day')
  `);
  await deleteWith("DELETE");
  expect((await database.owner.execute(sql`select email from pending_signups`)).rows).toEqual([{ email: "owner@example.test" }]);
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

it("marks the Account when step 2 fails, keeps its records, and tells the student that deletion will finish", async () => {
  const other = await studentWithRecords("other@example.test");
  const owner = await markedAfterFailedDeletion("owner@example.test");
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(allRecords);
  expect(await ownedRecords(other.account.id, other.student.id)).toEqual(allRecords);
  expect(owner.mark).toEqual(expect.any(String));
  expect(await deletionList()).toEqual([]);
  expect(await deletionEvents()).toEqual([
    { event: "unexpected_failure", result: "failed", error_type: "Error:P0001" },
    { event: "account_deletion", result: "will-finish", error_type: null },
  ]);
});

it("refuses every session of a marked Account at once, as for a Disabled Account", async () => {
  const other = await studentWithRecords("other@example.test");
  expect(await sessionFor(other.account.id)).toMatchObject({ id: other.account.id, role: "student" });
  const owner = await markedAfterFailedDeletion("owner@example.test");
  expect(await sessionFor(owner.account.id)).toBeNull();
  expect(await sessionFor(other.account.id)).toMatchObject({ id: other.account.id });
});

it("finishes the deletion on a Google sign-in retry and never gives access back", async () => {
  const owner = await markedAfterFailedDeletion("owner@example.test");
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(await failCheckInDeletes(() => googleSignIn("owner@example.test"))).toBe(DISABLED_SIGN_IN_PATH);
  } finally {
    logged.mockRestore();
  }
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(allRecords);
  expect(await deletingSince(owner.account.id)).toBe(owner.mark);
  expect(await sessionFor(owner.account.id)).toBeNull();

  expect(await googleSignIn("owner@example.test")).toBe(DISABLED_SIGN_IN_PATH);
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(noRecords);
  expect(await deletionList()).toEqual([listed(owner.account.id, "owner@example.test")]);
  expect(await sessionFor(owner.account.id)).toBeNull();
});

it("finishes every marked deletion in one daily job run, and a second run changes nothing", async () => {
  const other = await studentWithRecords("other@example.test");
  const owner = await markedAfterFailedDeletion("owner@example.test");
  expect(await runDailyCleanup()).toMatchObject({ accountDeletionsFinished: 1, accountDeletionsFailed: 0 });
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(noRecords);
  expect(await ownedRecords(other.account.id, other.student.id)).toEqual(allRecords);
  expect(await deletionList()).toEqual([listed(owner.account.id, "owner@example.test")]);

  expect(await runDailyCleanup()).toMatchObject({ accountDeletionsFinished: 0, accountDeletionsFailed: 0 });
  expect(await finishAccountDeletion(owner.account.id)).toBe(false);
  expect(await deletionList()).toEqual([listed(owner.account.id, "owner@example.test")]);
});

it("counts a daily job deletion that fails again, logs it, and keeps the mark", async () => {
  const owner = await markedAfterFailedDeletion("owner@example.test");
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(await failCheckInDeletes(runDailyCleanup)).toMatchObject({ accountDeletionsFinished: 0, accountDeletionsFailed: 1 });
  } finally {
    logged.mockRestore();
  }
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(allRecords);
  expect(await deletingSince(owner.account.id)).toBe(owner.mark);
  expect(await deletionEvents()).toEqual([
    { event: "unexpected_failure", result: "failed", error_type: "Error:P0001" },
    { event: "account_deletion", result: "will-finish", error_type: null },
    { event: "unexpected_failure", result: "failed", error_type: "Error:P0001" },
  ]);
});

it("never finishes the deletion of an Account that is not marked", async () => {
  const owner = await studentWithRecords("owner@example.test");
  expect(await finishAccountDeletion(owner.account.id)).toBe(false);
  expect(await runDailyCleanup()).toMatchObject({ accountDeletionsFinished: 0 });
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(allRecords);
  expect(await deletionList()).toEqual([]);
});

it.each([
  ["the app login", () => getPostgresDatabase()],
  ["the database owner", () => database.owner],
])("refuses clearing or moving the mark through %s", async (_name, db) => {
  const owner = await markedAfterFailedDeletion("owner@example.test");
  for (const change of [sql`null`, sql`now() + interval '1 day'`]) {
    await expect(db().execute(sql`update accounts set deleting_since = ${change} where id = ${owner.account.id}::uuid`))
      .rejects.toMatchObject({ cause: { message: "An Account marked deleting keeps its mark." } });
  }
  expect(await deletingSince(owner.account.id)).toBe(owner.mark);
});

it("deletes deletion list rows older than 30 days in the daily job and keeps newer ones", async () => {
  await database.owner.execute(sql`
    insert into deletion_list (account_id, email_hash, deleted_at) values
      ('00000000-0000-4000-8000-000000000031', ${keyedHash("old@example.test")}, now() - interval '30 days 1 minute'),
      ('00000000-0000-4000-8000-000000000029', ${keyedHash("new@example.test")}, now() - interval '29 days 23 hours')
  `);
  expect(await runDailyCleanup()).toMatchObject({ deletionListRemoved: 1 });
  expect((await database.owner.execute(sql`select account_id from deletion_list`)).rows)
    .toEqual([{ account_id: "00000000-0000-4000-8000-000000000029" }]);
});
