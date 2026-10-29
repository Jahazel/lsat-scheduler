import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setUpAppTestDatabase } from "./appTestDatabase";
import { finishDeletion } from "../../src/lib/accountDeletion";
import { accountSessionToken } from "../../src/lib/accountSession";
import { createGoogleAccountOnSignIn } from "../../src/lib/authAccounts";
import { runDailyCleanup } from "../../src/lib/dailyCleanup";
import { logIn } from "../../src/lib/passwordAccount";
import { hashPassword } from "../../src/lib/passwordHash";
import { getPostgresDatabase } from "../../src/lib/postgres";
import { createStudent } from "../../src/lib/studentRepository";
import type { Student } from "../../src/lib/types";
import { deleteAccount } from "../../src/app/account/actions";
import { expectUnexpectedFailure } from "./plannedAnswer";

const state = vi.hoisted((): { session: Session | null } => ({ session: null }));
const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("@/auth", () => ({ auth: async () => state.session, signOut }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-vercel-forwarded-for": "203.0.113.1" }) }));

const database = setUpAppTestDatabase();
const AUTH_SECRET = "account-deletion-test-secret-0123456789";

beforeEach(async () => {
  state.session = null;
  signOut.mockClear();
  vi.stubEnv("AUTH_SECRET", AUTH_SECRET);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));
  await database.owner.execute(sql`truncate accounts, deletion_list, security_log cascade`);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

const profile: Student = {
  currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
};

const minutesAgo = (minutes: number) => Math.floor(Date.now() / 1000) - minutes * 60;

const PASSWORD = "a long enough password";

async function studentWithRecords(email: string, role: "student" | "admin" = "student", signIn: "google" | "password" = "google") {
  const account = await database.createAccountAsOwner(signIn === "google"
    ? { email, name: email, role }
    : { email, name: email, role, googleId: null, passwordHash: await hashPassword(PASSWORD) });
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
    ) values (${student.id}::uuid, '2026-10-12', 158, '[{},{},{},{}]', '{}', now(), 'admin_sample', now(), true, true, now())
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
const allRecords = {
  accounts: 1, students: 1, analytics_snapshots: 1, practice_test_results: 1, weekly_schedules: 2, activity_check_ins: 2,
};
const noRecords = {
  accounts: 0, students: 0, analytics_snapshots: 0, practice_test_results: 0, weekly_schedules: 0, activity_check_ins: 0,
};

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

const emailHashOf = (email: string) => createHmac("sha256", AUTH_SECRET).update(email).digest("hex");
const passwordForm = (password: string) => {
  const form = confirmation("DELETE");
  form.set("currentPassword", password);
  return form;
};
const passwordLogIn = (email: string, password: string) =>
  logIn({ email, password }, { route: "/login", ipAddress: "203.0.113.1", realNow: new Date() });

function googleSignIn(email: string) {
  return createGoogleAccountOnSignIn({
    user: { email, name: email },
    account: { provider: "google", providerAccountId: `google-${email}`, type: "oidc" },
    profile: { sub: `google-${email}`, email, email_verified: true },
  });
}

function sessionOf(accountId: string) {
  return accountSessionToken({ token: { id: accountId, sessionVersion: 0, signedInAt: minutesAgo(1) } });
}

async function markOf(accountId: string) {
  const { rows } = await database.owner.execute<{ deleting_since: string | null }>(
    sql`select deleting_since from accounts where id = ${accountId}::uuid`,
  );
  return rows[0]?.deleting_since;
}

async function deletionListRows() {
  return (await database.owner.execute(sql`
    select account_id, email_hash, deleted_on = current_date as written_today from deletion_list order by account_id
  `)).rows;
}

async function securityEvents() {
  return (await database.owner.execute(sql`
    select event, result, route, account_id is not null as names_account, error_type from security_log order by logged_at, event
  `)).rows;
}

async function whileStepTwoFails(work: () => Promise<void>) {
  await database.owner.execute(sql`create function reject_check_in_delete_test() returns trigger language plpgsql as
    'BEGIN RAISE EXCEPTION ''forced check-in delete failure''; END;'`);
  await database.owner.execute(sql`create trigger reject_check_in_delete_test before delete on activity_check_ins
    for each row execute function reject_check_in_delete_test()`);
  try {
    await work();
  } finally {
    await database.owner.execute(sql`drop trigger reject_check_in_delete_test on activity_check_ins`);
    await database.owner.execute(sql`drop function reject_check_in_delete_test()`);
  }
}

it("logs the deletion as before and adds one deletion list row with the keyed email hash", async () => {
  const owner = await studentWithRecords("owner@example.test");
  await deleteWith("DELETE");
  expect(signOut).toHaveBeenCalledWith({ redirectTo: "/" });
  expect(await deletionListRows()).toEqual([{ account_id: owner.account.id, email_hash: emailHashOf("owner@example.test"), written_today: true }]);
  expect(await securityEvents()).toEqual([
    { event: "account_deletion", result: "deleted", route: "/account", names_account: false, error_type: null },
  ]);
});

it("marks the Account, refuses its sessions at once, and says deletion will finish when step 2 fails", async () => {
  const other = await studentWithRecords("other@example.test");
  const owner = await studentWithRecords("owner@example.test");
  expect(await sessionOf(owner.account.id)).not.toBeNull();
  await whileStepTwoFails(async () => {
    expect(await deleteWith("DELETE")).toBeNull();
  });
  expect(signOut).toHaveBeenCalledWith({ redirectTo: "/login?notice=DeletionWillFinish" });
  expect(await markOf(owner.account.id)).toEqual(expect.any(String));
  expect(await sessionOf(owner.account.id)).toBeNull();
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(allRecords);
  expect(await ownedRecords(other.account.id, other.student.id)).toEqual(allRecords);
  expect(await sessionOf(other.account.id)).not.toBeNull();
  expect(await deletionListRows()).toEqual([]);
  expect(await securityEvents()).toEqual([
    { event: "unexpected_failure", result: "failed", route: "/account", names_account: false, error_type: "Error:P0001" },
    { event: "account_deletion", result: "willFinish", route: "/account", names_account: true, error_type: null },
  ]);
});

it("finishes on a Google sign-in retry, never signs in, and a second finish changes nothing", async () => {
  const owner = await studentWithRecords("owner@example.test");
  await whileStepTwoFails(async () => {
    await deleteWith("DELETE");
    const mark = await markOf(owner.account.id);
    expect(await googleSignIn("owner@example.test")).toBe("/login?notice=DeletionWillFinish");
    expect(await markOf(owner.account.id)).toEqual(mark);
    expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(allRecords);
  });

  expect(await googleSignIn("owner@example.test")).toBe("/login?notice=AccountDeleted");
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(noRecords);
  expect(await deletionListRows()).toEqual([{ account_id: owner.account.id, email_hash: emailHashOf("owner@example.test"), written_today: true }]);

  expect(await finishDeletion(owner.account.id, "/account")).toBe("deleted");
  expect(await runDailyCleanup()).toMatchObject({ accountDeletionsFinished: 0, accountDeletionsLeft: 0 });
  expect(await deletionListRows()).toHaveLength(1);
  expect((await securityEvents()).filter((entry) => entry.event === "sign_in")).toEqual([
    { event: "sign_in", result: "deletionWillFinish", route: "/api/auth/callback/google", names_account: false, error_type: null },
    { event: "sign_in", result: "accountDeleted", route: "/api/auth/callback/google", names_account: false, error_type: null },
  ]);
});

it("finishes a password Account's deletion on a sign-in retry only after the password matches", async () => {
  const owner = await studentWithRecords("owner@example.test", "student", "password");
  await whileStepTwoFails(async () => {
    expect(await deleteAccount(null, passwordForm(PASSWORD))).toBeNull();
  });
  expect(signOut).toHaveBeenCalledWith({ redirectTo: "/login?notice=DeletionWillFinish" });

  expect(await passwordLogIn("owner@example.test", "a wrong password")).toEqual({ kind: "refused", code: "wrongEmailOrPassword" });
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(allRecords);

  expect(await passwordLogIn("owner@example.test", PASSWORD)).toEqual({ kind: "refused", code: "accountDeleted" });
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(noRecords);
  expect(await deletionListRows()).toHaveLength(1);
});

it("finishes a marked Account in one daily job run", async () => {
  const owner = await studentWithRecords("owner@example.test");
  await whileStepTwoFails(async () => {
    await deleteWith("DELETE");
    expect(await runDailyCleanup()).toMatchObject({ accountDeletionsFinished: 0, accountDeletionsLeft: 1 });
  });
  expect(await runDailyCleanup()).toMatchObject({ accountDeletionsFinished: 1, accountDeletionsLeft: 0 });
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(noRecords);
  expect(await deletionListRows()).toHaveLength(1);
});

it("writes one deletion list row when two finishes run at once", async () => {
  const owner = await studentWithRecords("owner@example.test");
  await database.owner.execute(sql`update accounts set deleting_since = now() where id = ${owner.account.id}`);
  expect(await Promise.all([finishDeletion(owner.account.id, "/account"), finishDeletion(owner.account.id, "/account")]))
    .toEqual(["deleted", "deleted"]);
  expect(await deletionListRows()).toHaveLength(1);
});

it("never deletes an Account that has no mark", async () => {
  const owner = await studentWithRecords("owner@example.test");
  expect(await finishDeletion(owner.account.id, "/account")).toBe("deleted");
  expect(await ownedRecords(owner.account.id, owner.student.id)).toEqual(allRecords);
  expect(await deletionListRows()).toEqual([]);
});

it("refuses to clear or move the mark, for the app login and the database owner", async () => {
  const owner = await studentWithRecords("owner@example.test");
  const db = getPostgresDatabase();
  await db.execute(sql`update accounts set deleting_since = now() where id = ${owner.account.id}`);
  const mark = await markOf(owner.account.id);
  for (const change of [
    () => db.execute(sql`update accounts set deleting_since = null where id = ${owner.account.id}`),
    () => db.execute(sql`update accounts set deleting_since = now() + interval '1 day' where id = ${owner.account.id}`),
    () => database.owner.execute(sql`update accounts set deleting_since = null where id = ${owner.account.id}`),
  ]) {
    await expect(change()).rejects.toMatchObject({ cause: { code: "P0001" } });
  }
  await db.execute(sql`update accounts set deleting_since = coalesce(deleting_since, now()) where id = ${owner.account.id}`);
  expect(await markOf(owner.account.id)).toEqual(mark);
});

it("removes every record that names an Account when the Account goes", async () => {
  const blocking = await database.owner.execute(sql`
    select conrelid::regclass::text as table_name, conname from pg_constraint
    where contype = 'f' and confdeltype not in ('c', 'n')
  `);
  expect(blocking.rows).toEqual([]);
});
