import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { closePostgresDatabase, createPostgresConnection } from "../../src/lib/postgres";
import { countAction } from "../../src/lib/actionLimits";
import { createAccount, endAllSessions, findAccountById } from "../../src/lib/accountRepository";
import { postgresAdminTestRepositories } from "../../src/lib/adminTestRepositories";
import { postgresAdminClock } from "../../src/lib/studentClock";
import { createPostgresTestDatabase } from "./testDatabase";

const role = `drillmap_app_test_${randomUUID().replaceAll("-", "")}`;
let database: Awaited<ReturnType<typeof createPostgresTestDatabase>> | undefined;
let owner: ReturnType<typeof createPostgresConnection> | undefined;
let app: ReturnType<typeof createPostgresConnection> | undefined;
let roleSql: string;
let grantsSql: string;
let appSetting: string;

function connectApp() {
  vi.stubEnv("DATABASE_URL", appSetting);
  try {
    return createPostgresConnection();
  } finally {
    vi.unstubAllEnvs();
  }
}

beforeAll(async () => {
  database = await createPostgresTestDatabase();
  owner = createPostgresConnection({ database: database.name });
  await owner.db.execute(sql`grant create on schema public to public`);
  await owner.db.execute(sql`grant update on weekly_schedules to public`);
  roleSql = await readFile("sql/app-role.sql", "utf8");
  grantsSql = await readFile("sql/app-role-grants.sql", "utf8");
  await applyAppRoleSql();
  const password = randomBytes(32).toString("hex");
  await owner.db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('drillmap.app_role', ${role}, true)`);
    await tx.execute(sql`select set_config('drillmap.test_password', ${password}, true)`);
    await tx.execute(sql.raw(`DO $$ BEGIN
      EXECUTE format('ALTER ROLE %I PASSWORD %L',
        current_setting('drillmap.app_role'), current_setting('drillmap.test_password'));
    END $$;`));
  });
  const setting = new URL(database.setting);
  setting.username = role;
  setting.password = password;
  setting.searchParams.delete("user");
  setting.searchParams.delete("password");
  appSetting = setting.toString();
  app = connectApp();
});

afterAll(async () => {
  try {
    await app?.close();
    await owner?.close();
    await database?.cleanup();
  } finally {
    const admin = createPostgresConnection({ database: "postgres" });
    try {
      await admin.db.execute(sql`drop role if exists ${sql.identifier(role)}`);
    } finally {
      await admin.close();
    }
  }
});

function appDb() {
  if (!app) throw new Error("App role setup did not finish.");
  return app.db;
}

function ownerDb() {
  if (!owner) throw new Error("Owner setup did not finish.");
  return owner.db;
}

async function applyAppRoleSql() {
  await ownerDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('drillmap.app_role', ${role}, true)`);
    await tx.execute(sql.raw(roleSql));
    await tx.execute(sql.raw(grantsSql));
  });
}

beforeEach(async () => {
  await ownerDb().execute(sql`truncate public.accounts, public.action_counters, public.pending_signups cascade`);
});

const ownedRecords = z.object({
  account_id: z.uuid().brand<"AccountId">(),
  student_id: z.uuid().brand<"StudentId">(),
  snapshot_id: z.uuid().brand<"AnalyticsSnapshotId">(),
  practice_test_id: z.uuid().brand<"PracticeTestResultId">(),
  schedule_id: z.uuid().brand<"WeeklyScheduleId">(),
  check_in_id: z.uuid().brand<"ActivityCheckInId">(),
});

async function createOwnedRecords() {
  const result = await appDb().execute(sql`
    with account as (
      insert into accounts (email, name, password_hash) values (${`${randomUUID()}@example.test`}, 'Student', 'hash') returning id
    ), student as (
      insert into students (
        account_id, platform, current_score, goal_score, goal_test_date,
        preferred_practice_test_day, accommodation,
        monday_capacity_minutes, tuesday_capacity_minutes, wednesday_capacity_minutes,
        thursday_capacity_minutes, friday_capacity_minutes, saturday_capacity_minutes, sunday_capacity_minutes
      ) select id, '7Sage', 150, 170, '2026-11-01', 'SATURDAY', 1, 60, 60, 60, 60, 60, 60, 60
        from account returning id
    ), snapshot as (
      insert into analytics_snapshots (
        student_id, week_of, lr_accuracy_by_type, lr_top_priority_logic_types,
        approved_at, extraction_source, extracted_at, extracted_values_match, is_latest_analytics, confirmed_at
      ) select id, '2026-10-05', '{"Weaken":55}', ARRAY['Causal reasoning'],
        now(), 'admin_sample', now(), true, true, now() from student returning id
    ), practice_test as (
      insert into practice_test_results (
        student_id, week_of, prep_test, sections, missed_stem_type_counts,
        approved_at, extraction_source, extracted_at, extracted_values_match, is_this_weeks_practice_test, confirmed_at
      ) select id, '2026-10-05', 158, '[{},{},{},{}]', '{"Weaken":1}',
        now(), 'admin_sample', now(), true, true, now() from student returning id
    ), schedule as (
      insert into weekly_schedules (
        student_id, week_start_date, generated_at, schedule, source_snapshot_ids, generation_inputs, policy_version
      ) select student.id, '2026-10-05', now(), '{}', ARRAY[snapshot.id], '{}', 'adaptive-weekly-schedule-v2'
        from student, snapshot returning id
    ), check_in as (
      insert into activity_check_ins (schedule_id, activity_id, status)
        select id, 'MONDAY:0', 'not_started' from schedule returning id
    ) select account.id as account_id, student.id as student_id, snapshot.id as snapshot_id,
        practice_test.id as practice_test_id, schedule.id as schedule_id, check_in.id as check_in_id
      from account, student, snapshot, practice_test, schedule, check_in
  `);
  return ownedRecords.parse(result.rows[0]);
}

it("connects as the SQL-created app role and reads and writes Accounts", async () => {
  const db = appDb();
  expect((await db.execute(sql`select current_user, session_user`)).rows)
    .toEqual([{ current_user: role, session_user: role }]);
  await db.execute(sql`insert into accounts (email, name, google_id) values ('role@example.test', 'Student', 'google-role')`);
  expect((await db.execute(sql`select email, name from accounts`)).rows)
    .toEqual([{ email: "role@example.test", name: "Student" }]);
});

it("reads, inserts, corrects, and deletes the six app tables with the allowed permissions", async () => {
  const db = appDb();
  const records = await createOwnedRecords();
  await db.execute(sql`update accounts set simulated_date = '2026-11-02' where id = ${records.account_id}`);
  await db.execute(sql`update students set current_score = 155 where id = ${records.student_id}`);
  await db.execute(sql`update analytics_snapshots set lr_accuracy_by_type = '{"Weaken":60}' where id = ${records.snapshot_id}`);
  await db.execute(sql`update practice_test_results set prep_test = 157 where id = ${records.practice_test_id}`);
  await db.execute(sql`update activity_check_ins set status = 'completed' where id = ${records.check_in_id}`);
  expect((await db.execute(sql`
    select accounts.simulated_date, students.current_score, analytics_snapshots.lr_accuracy_by_type,
      weekly_schedules.policy_version, activity_check_ins.status
    from accounts join students on students.account_id = accounts.id
      join analytics_snapshots on analytics_snapshots.student_id = students.id
      join weekly_schedules on weekly_schedules.student_id = students.id
      join activity_check_ins on activity_check_ins.schedule_id = weekly_schedules.id
    where accounts.id = ${records.account_id}
  `)).rows).toEqual([{
    simulated_date: "2026-11-02", current_score: 155, lr_accuracy_by_type: { Weaken: 60 },
    policy_version: "adaptive-weekly-schedule-v2", status: "completed",
  }]);
  expect((await db.execute(sql`select prep_test from practice_test_results`)).rows).toEqual([{ prep_test: 157 }]);
  for (const table of ["activity_check_ins", "weekly_schedules", "analytics_snapshots", "practice_test_results", "students", "accounts"]) {
    await db.execute(sql`delete from ${sql.identifier(table)}`);
    expect((await db.execute(sql`select * from ${sql.identifier(table)}`)).rows).toEqual([]);
  }
});

it.each([
  ["a role", sql`create role ${sql.identifier(`${role}_probe`)}`],
  ["a database", sql`create database ${sql.identifier(`${role}_probe`)}`],
  ["a table", sql`create table public.role_probe (value integer)`],
  ["a temporary table", sql`create temporary table role_probe (value integer)`],
  ["a schema", sql`create schema role_probe`],
  ["a column", sql`alter table accounts add column role_probe text`],
  ["a sequence", sql`create sequence public.role_probe`],
  ["a function", sql`create function public.role_probe() returns integer language sql as 'select 1'`],
  ["a view", sql`create view public.role_probe as select id from accounts`],
  ["an index", sql`create index role_probe on accounts (name)`],
  ["a dropped table", sql`drop table students`],
  ["a disabled trigger", sql`alter table weekly_schedules disable trigger weekly_schedules_refuse_update`],
  ["a truncated table", sql`truncate students`],
])("refuses %s through the app login", async (_description, query) => {
  await expect(appDb().execute(query)).rejects.toMatchObject({ cause: { code: "42501" } });
});

it("counts, refuses, and deletes ended action counters through the app login", async () => {
  vi.stubEnv("DATABASE_URL", appSetting);
  try {
    const at = new Date("2026-10-24T15:00:00Z");
    for (let index = 0; index < 10; index += 1) expect(await countAction("signupFromIpAddress", "203.0.113.7", at)).toEqual({ allowed: true });
    expect(await countAction("signupFromIpAddress", "203.0.113.7", at)).toMatchObject({ allowed: false });
    expect(await countAction("signupFromIpAddress", "203.0.113.7", new Date("2026-10-24T16:00:00Z"))).toEqual({ allowed: true });
    expect((await appDb().execute(sql`select window_start from action_counters`)).rows).toHaveLength(1);
  } finally {
    await closePostgresDatabase();
    vi.unstubAllEnvs();
  }
});

async function asApp<T>(work: () => Promise<T>) {
  vi.stubEnv("DATABASE_URL", appSetting);
  try {
    return await work();
  } finally {
    await closePostgresDatabase();
    vi.unstubAllEnvs();
  }
}

it("refuses Admin role, disabled time, and Google ID changes through the app login", async () => {
  const records = await createOwnedRecords();
  for (const change of [
    sql`update accounts set role = 'admin' where id = ${records.account_id}`,
    sql`update accounts set disabled_at = null where id = ${records.account_id}`,
    sql`update accounts set google_id = 'stolen' where id = ${records.account_id}`,
    sql`insert into accounts (email, name, role) values ('admin@example.test', 'Admin', 'admin')`,
    sql`insert into accounts (email, name, disabled_at) values ('disabled@example.test', 'Disabled', null)`,
  ]) {
    await expect(appDb().execute(change)).rejects.toMatchObject({ cause: { code: "42501" } });
  }
  expect((await appDb().execute(sql`select role, google_id from accounts`)).rows)
    .toEqual([{ role: "student", google_id: null }]);
});

it("sets a password Account's hash and manages pending signups and reset tokens through the app login", async () => {
  const db = appDb();
  const records = await createOwnedRecords();
  await db.execute(sql`update accounts set password_hash = 'new-hash' where id = ${records.account_id}`);
  await db.execute(sql`
    insert into pending_signups (email, name, password_hash, token_hash, token_expires_at)
    values ('pending@example.test', 'Pending', 'hash', 'token-1', now() + interval '1 day')
  `);
  await db.execute(sql`update pending_signups set token_hash = 'token-2' where email = 'pending@example.test'`);
  await db.execute(sql`
    insert into reset_tokens (account_id, token_hash, expires_at) values (${records.account_id}, 'reset-1', now())
  `);
  await db.execute(sql`update reset_tokens set token_hash = 'reset-2' where account_id = ${records.account_id}`);
  expect((await db.execute(sql`
    select accounts.password_hash, pending_signups.token_hash as signup_token, reset_tokens.token_hash as reset_token
    from accounts, pending_signups, reset_tokens where accounts.id = ${records.account_id}
  `)).rows).toEqual([{ password_hash: "new-hash", signup_token: "token-2", reset_token: "reset-2" }]);
  await db.execute(sql`delete from pending_signups`);
  await db.execute(sql`delete from reset_tokens`);
  expect((await db.execute(sql`
    select (select count(*)::integer from pending_signups) as signups, (select count(*)::integer from reset_tokens) as resets
  `)).rows).toEqual([{ signups: 0, resets: 0 }]);
});

it("refuses an Admin role or both sign-in methods on a password Account through the app login", async () => {
  const records = await createOwnedRecords();
  await expect(appDb().execute(sql`update accounts set role = 'admin' where id = ${records.account_id}`))
    .rejects.toMatchObject({ cause: { code: "42501" } });
  await expect(appDb().execute(sql`
    insert into accounts (email, name, password_hash, google_id) values ('both@example.test', 'Both', 'hash', 'google-both')
  `)).rejects.toMatchObject({ cause: { code: "23514", constraint: "accounts_one_sign_in_method" } });
  const google = await asApp(() => createAccount({ email: "google@example.test", name: "Google", googleId: "google-id" }));
  await expect(appDb().execute(sql`update accounts set password_hash = 'hash' where id = ${google!.id}`))
    .rejects.toMatchObject({ cause: { code: "23514", constraint: "accounts_one_sign_in_method" } });
  expect((await appDb().execute(sql`select role, password_hash from accounts order by password_hash nulls first`)).rows)
    .toEqual([{ role: "student", password_hash: null }, { role: "student", password_hash: "hash" }]);
});

it("creates a student Account, moves and resets the test date, ends sessions, and deletes the Account through the app login", async () => {
  const created = await asApp(() => createAccount({ email: "new@example.test", name: "New", googleId: "google-new" }));
  expect(created).toMatchObject({ role: "student" });
  const id = z.uuid().brand<"AccountId">().parse(created?.id);
  await ownerDb().execute(sql`update accounts set role = 'admin' where id = ${id}`);
  await asApp(async () => {
    expect(await postgresAdminClock.moveDate(id, null, "2026-11-02")).toBe(true);
    expect(await findAccountById(id)).toMatchObject({ simulatedDate: "2026-11-02" });
    await postgresAdminTestRepositories.inTransaction((writes) => writes.clearSimulatedDate(id));
    expect(await findAccountById(id)).toMatchObject({ simulatedDate: null, sessionVersion: 1 });
    await endAllSessions(id);
    expect(await findAccountById(id)).toMatchObject({ sessionVersion: 2 });
  });
  await appDb().execute(sql`delete from accounts where id = ${id}`);
  expect((await appDb().execute(sql`select id from accounts`)).rows).toEqual([]);
});

it("reads the scan settings but refuses changing the emergency switch or the monthly limit through the app login", async () => {
  expect((await appDb().execute(sql`select scanning_off, monthly_limit_usd from scan_settings`)).rows)
    .toEqual([{ scanning_off: false, monthly_limit_usd: 10 }]);
  for (const change of [
    sql`update scan_settings set scanning_off = true`,
    sql`update scan_settings set monthly_limit_usd = 1000`,
    sql`delete from scan_settings`,
    sql`insert into scan_settings default values`,
  ]) {
    await expect(appDb().execute(change)).rejects.toMatchObject({ cause: { code: "42501" } });
  }
});

it("refuses switching the app login to the database owner", async () => {
  const row = z.object({ current_user: z.string() }).parse((await ownerDb().execute(sql`select current_user`)).rows[0]);
  await expect(appDb().execute(sql`set role ${sql.identifier(row.current_user)}`))
    .rejects.toMatchObject({ cause: { code: "42501" } });
});

it("has no administration attributes or memberships in other roles", async () => {
  expect((await appDb().execute(sql`
    select rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolinherit, rolreplication, rolbypassrls,
      exists(select from pg_auth_members where member = pg_roles.oid) as has_membership
    from pg_roles where rolname = current_user
  `)).rows).toEqual([{
    rolcanlogin: true, rolsuper: false, rolcreatedb: false, rolcreaterole: false,
    rolinherit: false, rolreplication: false, rolbypassrls: false, has_membership: false,
  }]);
});

it("refuses Weekly schedule updates by permission even with the trigger disabled", async () => {
  const records = await createOwnedRecords();
  await ownerDb().execute(sql`alter table weekly_schedules disable trigger weekly_schedules_refuse_update`);
  try {
    for (const update of [
      sql`update weekly_schedules set policy_version = 'changed' where id = ${records.schedule_id}`,
      sql`update weekly_schedules set policy_version = policy_version where id = ${records.schedule_id}`,
      sql`update weekly_schedules set policy_version = 'changed' where false`,
    ]) {
      await expect(appDb().execute(update)).rejects.toMatchObject({
        cause: { code: "42501", message: "permission denied for table weekly_schedules" },
      });
    }
    expect((await appDb().execute(sql`select policy_version from weekly_schedules`)).rows)
      .toEqual([{ policy_version: "adaptive-weekly-schedule-v2" }]);
  } finally {
    await ownerDb().execute(sql`alter table weekly_schedules enable trigger weekly_schedules_refuse_update`);
  }
});

it("refuses orphan students, Analytics snapshots, Practice-test results, Weekly schedules, and Activity check-ins", async () => {
  const records = await createOwnedRecords();
  const missingOwner = randomUUID();
  for (const query of [
    sql`insert into students select gen_random_uuid(), ${missingOwner}::uuid, platform, current_score, goal_score,
      goal_test_date, preferred_practice_test_day, accommodation,
      monday_capacity_minutes, tuesday_capacity_minutes, wednesday_capacity_minutes,
      thursday_capacity_minutes, friday_capacity_minutes, saturday_capacity_minutes, sunday_capacity_minutes
      from students where id = ${records.student_id}`,
    sql`insert into analytics_snapshots (
      student_id, week_of, lr_accuracy_by_type, lr_top_priority_logic_types,
      approved_at, extraction_source, extracted_at, extracted_values_match, is_latest_analytics, confirmed_at
    ) values (${missingOwner}, '2026-10-05', '{}', '{}', now(), 'admin_sample', now(), true, true, now())`,
    sql`insert into practice_test_results (
      student_id, week_of, prep_test, sections, missed_stem_type_counts,
      approved_at, extraction_source, extracted_at, extracted_values_match, is_this_weeks_practice_test, confirmed_at
    ) values (${missingOwner}, '2026-10-05', 158, '[{},{},{},{}]', '{}', now(), 'admin_sample', now(), true, true, now())`,
    sql`insert into weekly_schedules (
      student_id, week_start_date, generated_at, schedule, source_snapshot_ids, generation_inputs, policy_version
    ) values (${missingOwner}, '2026-10-05', now(), '{}', '{}', '{}', 'adaptive-weekly-schedule-v2')`,
    sql`insert into activity_check_ins (schedule_id, activity_id, status)
      values (${missingOwner}, 'MONDAY:0', 'not_started')`,
  ]) {
    await expect(appDb().execute(query)).rejects.toMatchObject({ cause: { code: "23503" } });
  }
});

it("deletes all records owned by an Account and keeps other Accounts", async () => {
  const db = appDb();
  const records = await createOwnedRecords();
  const other = await createOwnedRecords();
  await db.execute(sql`delete from accounts where id = ${records.account_id}`);
  for (const [table, deletedId, keptId] of [
    ["accounts", records.account_id, other.account_id],
    ["students", records.student_id, other.student_id],
    ["analytics_snapshots", records.snapshot_id, other.snapshot_id],
    ["practice_test_results", records.practice_test_id, other.practice_test_id],
    ["weekly_schedules", records.schedule_id, other.schedule_id],
    ["activity_check_ins", records.check_in_id, other.check_in_id],
  ]) {
    expect((await db.execute(sql`select id from ${sql.identifier(table)} where id = ${deletedId}`)).rows).toEqual([]);
    expect((await db.execute(sql`select id from ${sql.identifier(table)} where id = ${keptId}`)).rows).toEqual([{ id: keptId }]);
  }
});

it("runs the role SQL twice without changing grants, data, or the working login", async () => {
  const records = await createOwnedRecords();
  const before = await ownerDb().execute(sql`
    select relname, relacl::text from pg_class
      where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname
  `);
  await applyAppRoleSql();
  expect((await ownerDb().execute(sql`
    select relname, relacl::text from pg_class
      where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname
  `)).rows).toEqual(before.rows);
  await app?.close();
  app = connectApp();
  expect((await appDb().execute(sql`select id from accounts`)).rows).toEqual([{ id: records.account_id }]);
});

it("removes direct and column update grants when the SQL runs again", async () => {
  const records = await createOwnedRecords();
  await ownerDb().execute(sql`grant update on weekly_schedules to ${sql.identifier(role)}`);
  await ownerDb().execute(sql`grant update (policy_version) on weekly_schedules to ${sql.identifier(role)}, public`);
  await applyAppRoleSql();
  await expect(appDb().execute(sql`update weekly_schedules set policy_version = 'changed' where id = ${records.schedule_id}`))
    .rejects.toMatchObject({ cause: { code: "42501" } });
});

it("refuses to reuse an existing role that can switch to an administration role", async () => {
  const row = z.object({ current_user: z.string() }).parse((await ownerDb().execute(sql`select current_user`)).rows[0]);
  await ownerDb().execute(sql`grant ${sql.identifier(row.current_user)} to ${sql.identifier(role)}`);
  try {
    await expect(applyAppRoleSql()).rejects.toMatchObject({
      cause: { message: "The app role must have no administration rights, memberships, or owned objects." },
    });
  } finally {
    await ownerDb().execute(sql`revoke ${sql.identifier(row.current_user)} from ${sql.identifier(role)}`);
  }
});

it("adds security log entries but cannot read, change, or erase them, and prunes only entries older than 90 days", async () => {
  await ownerDb().execute(sql`truncate security_log`);
  await appDb().execute(sql`
    insert into security_log (event, result, route, error_code, error_type)
    values ('unexpected_failure', 'failed', '/api/cron/daily-cleanup', 'abcdef12', 'Error')
  `);
  for (const query of [
    sql`select * from security_log`,
    sql`update security_log set error_type = 'Changed'`,
    sql`delete from security_log`,
    sql`truncate security_log`,
    sql`insert into security_log (logged_at, event, result, route, error_code, error_type)
      values (now() - interval '1 year', 'unexpected_failure', 'failed', '/', 'abcdef13', 'Error')`,
  ]) {
    await expect(appDb().execute(query)).rejects.toMatchObject({ cause: { code: "42501" } });
  }
  await ownerDb().execute(sql`
    insert into security_log (logged_at, event, result, route, error_code, error_type)
    values (now() - interval '91 days', 'unexpected_failure', 'failed', '/', 'abcdef14', 'Error')
  `);
  const pruned = await appDb().execute<{ removed: string }>(sql`select prune_security_log() as removed`);
  expect(Number(pruned.rows[0]?.removed)).toBe(1);
  const left = await ownerDb().execute<{ error_code: string }>(sql`select error_code from security_log`);
  expect(left.rows).toEqual([{ error_code: "abcdef12" }]);
});

it("adds, reads, and deletes deletion list rows but cannot change them", async () => {
  const accountId = randomUUID();
  await appDb().execute(sql`insert into deletion_list (account_id, email_hash) values (${accountId}, repeat('c', 64))`);
  for (const query of [
    sql`update deletion_list set email_hash = repeat('d', 64) where account_id = ${accountId}`,
    sql`update deletion_list set deleted_on = current_date - 31 where account_id = ${accountId}`,
    sql`truncate deletion_list`,
  ]) {
    await expect(appDb().execute(query)).rejects.toMatchObject({ cause: { code: "42501" } });
  }
  const removed = await appDb().execute(sql`delete from deletion_list where account_id = ${accountId}`);
  expect(removed.rowCount).toBe(1);
});

it("refuses a security log entry that could hold free text", async () => {
  for (const [route, code, type] of [
    ["/api/cron/daily-cleanup", "abcdef123", "Error"],
    ["/api/cron/daily-cleanup", "abcdef12", "Error: token=abc"],
    ["https://example.test/api?token=abc", "abcdef12", "Error"],
  ]) {
    await expect(appDb().execute(sql`
      insert into security_log (event, result, route, error_code, error_type) values ('unexpected_failure', 'failed', ${route}, ${code}, ${type})
    `)).rejects.toMatchObject({ cause: { code: "23514" } });
  }
});

it("grants no read or write permission on migration bookkeeping or unrelated tables", async () => {
  await ownerDb().execute(sql`create table owner_only_probe (value integer)`);
  try {
    for (const query of [
      sql`select * from drillmap_migrations.applied`,
      sql`insert into drillmap_migrations.applied (hash) values ('changed')`,
      sql`select * from owner_only_probe`,
      sql`insert into owner_only_probe values (1)`,
    ]) {
      await expect(appDb().execute(query)).rejects.toMatchObject({ cause: { code: "42501" } });
    }
  } finally {
    await ownerDb().execute(sql`drop table owner_only_probe`);
  }
});

it("refuses to reuse an app role that owns a table", async () => {
  const row = z.object({ current_user: z.string() }).parse((await ownerDb().execute(sql`select current_user`)).rows[0]);
  await ownerDb().execute(sql`grant create on schema public to ${sql.identifier(role)}`);
  await ownerDb().execute(sql`create table owned_probe (value integer)`);
  await ownerDb().execute(sql`alter table owned_probe owner to ${sql.identifier(role)}`);
  try {
    await expect(applyAppRoleSql()).rejects.toMatchObject({
      cause: { message: "The app role must have no administration rights, memberships, or owned objects." },
    });
  } finally {
    await ownerDb().execute(sql`alter table owned_probe owner to ${sql.identifier(row.current_user)}`);
    await ownerDb().execute(sql`drop table owned_probe`);
    await ownerDb().execute(sql`revoke create on schema public from ${sql.identifier(role)}`);
  }
});
