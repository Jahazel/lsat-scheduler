import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { createPostgresConnection } from "../../src/lib/postgres";
import { createPostgresTestDatabase } from "./testDatabase";

const role = `drillmap_app_test_${randomUUID().replaceAll("-", "")}`;
let database: Awaited<ReturnType<typeof createPostgresTestDatabase>> | undefined;
let owner: ReturnType<typeof createPostgresConnection> | undefined;
let app: ReturnType<typeof createPostgresConnection> | undefined;
let roleSql: string;
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
  });
}

beforeEach(async () => {
  await ownerDb().execute(sql`truncate public.accounts, public.leads cascade`);
});

const ownedRecords = z.object({
  account_id: z.uuid().brand<"AccountId">(),
  student_id: z.uuid().brand<"StudentId">(),
  snapshot_id: z.uuid().brand<"AnalyticsSnapshotId">(),
  schedule_id: z.uuid().brand<"WeeklyScheduleId">(),
  check_in_id: z.uuid().brand<"ActivityCheckInId">(),
});

async function createOwnedRecords() {
  const result = await appDb().execute(sql`
    with account as (
      insert into accounts (email, name) values (${`${randomUUID()}@example.test`}, 'Student') returning id
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
    ), schedule as (
      insert into weekly_schedules (
        student_id, week_start_date, generated_at, schedule, source_snapshot_ids, generation_inputs, policy_version
      ) select student.id, '2026-10-05', now(), '{}', ARRAY[snapshot.id], '{}', 'adaptive-weekly-schedule-v2'
        from student, snapshot returning id
    ), check_in as (
      insert into activity_check_ins (schedule_id, activity_id, status)
        select id, 'MONDAY:0', 'not_started' from schedule returning id
    ) select account.id as account_id, student.id as student_id, snapshot.id as snapshot_id,
        schedule.id as schedule_id, check_in.id as check_in_id
      from account, student, snapshot, schedule, check_in
  `);
  return ownedRecords.parse(result.rows[0]);
}

it("connects as the SQL-created app role and reads and writes Accounts", async () => {
  const db = appDb();
  expect((await db.execute(sql`select current_user, session_user`)).rows)
    .toEqual([{ current_user: role, session_user: role }]);
  await db.execute(sql`insert into accounts (email, name) values ('role@example.test', 'Student')`);
  expect((await db.execute(sql`select email, name from accounts`)).rows)
    .toEqual([{ email: "role@example.test", name: "Student" }]);
});

it("reads, inserts, corrects, and deletes the six app tables with the allowed permissions", async () => {
  const db = appDb();
  const records = await createOwnedRecords();
  await db.execute(sql`update accounts set name = 'Updated' where id = ${records.account_id}`);
  await db.execute(sql`update students set current_score = 155 where id = ${records.student_id}`);
  await db.execute(sql`update analytics_snapshots set lr_accuracy_by_type = '{"Weaken":60}' where id = ${records.snapshot_id}`);
  await db.execute(sql`update activity_check_ins set status = 'completed' where id = ${records.check_in_id}`);
  await db.execute(sql`insert into leads (email) values ('lead@example.test')`);
  await db.execute(sql`update leads set email = 'updated-lead@example.test'`);
  expect((await db.execute(sql`
    select accounts.name, students.current_score, analytics_snapshots.lr_accuracy_by_type,
      weekly_schedules.policy_version, activity_check_ins.status
    from accounts join students on students.account_id = accounts.id
      join analytics_snapshots on analytics_snapshots.student_id = students.id
      join weekly_schedules on weekly_schedules.student_id = students.id
      join activity_check_ins on activity_check_ins.schedule_id = weekly_schedules.id
    where accounts.id = ${records.account_id}
  `)).rows).toEqual([{
    name: "Updated", current_score: 155, lr_accuracy_by_type: { Weaken: 60 },
    policy_version: "adaptive-weekly-schedule-v2", status: "completed",
  }]);
  expect((await db.execute(sql`select email from leads`)).rows).toEqual([{ email: "updated-lead@example.test" }]);
  for (const table of ["activity_check_ins", "weekly_schedules", "analytics_snapshots", "students", "accounts", "leads"]) {
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
  ["a dropped table", sql`drop table leads`],
  ["a disabled trigger", sql`alter table weekly_schedules disable trigger weekly_schedules_refuse_update`],
  ["a truncated table", sql`truncate leads`],
])("refuses %s through the app login", async (_description, query) => {
  await expect(appDb().execute(query)).rejects.toMatchObject({ cause: { code: "42501" } });
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

it("refuses orphan students, Analytics snapshots, Weekly schedules, and Activity check-ins", async () => {
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
    sql`insert into weekly_schedules (
      student_id, week_start_date, generated_at, schedule, source_snapshot_ids, generation_inputs, policy_version
    ) values (${missingOwner}, '2026-10-05', now(), '{}', '{}', '{}', 'adaptive-weekly-schedule-v2')`,
    sql`insert into activity_check_ins (schedule_id, activity_id, status)
      values (${missingOwner}, 'MONDAY:0', 'not_started')`,
  ]) {
    await expect(appDb().execute(query)).rejects.toMatchObject({ cause: { code: "23503" } });
  }
});

it("deletes all records owned by an Account and keeps other Accounts and leads", async () => {
  const db = appDb();
  const records = await createOwnedRecords();
  const other = await createOwnedRecords();
  await db.execute(sql`insert into leads (email) values ('unrelated@example.test')`);
  await db.execute(sql`delete from accounts where id = ${records.account_id}`);
  for (const [table, deletedId, keptId] of [
    ["accounts", records.account_id, other.account_id],
    ["students", records.student_id, other.student_id],
    ["analytics_snapshots", records.snapshot_id, other.snapshot_id],
    ["weekly_schedules", records.schedule_id, other.schedule_id],
    ["activity_check_ins", records.check_in_id, other.check_in_id],
  ]) {
    expect((await db.execute(sql`select id from ${sql.identifier(table)} where id = ${deletedId}`)).rows).toEqual([]);
    expect((await db.execute(sql`select id from ${sql.identifier(table)} where id = ${keptId}`)).rows).toEqual([{ id: keptId }]);
  }
  expect((await db.execute(sql`select email from leads`)).rows).toEqual([{ email: "unrelated@example.test" }]);
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
