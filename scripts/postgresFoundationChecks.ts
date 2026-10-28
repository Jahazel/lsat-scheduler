import { deepStrictEqual, ok, rejects } from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { TLSSocket } from "node:tls";
import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { createPostgresConnection } from "../src/lib/postgres";

type Connection = ReturnType<typeof createPostgresConnection>;
const ids = z.object({ account_id: z.uuid(), student_id: z.uuid(), snapshot_id: z.uuid(), practice_test_id: z.uuid(), schedule_id: z.uuid(), check_in_id: z.uuid() });

export async function checkPostgresFoundation(connection: Connection) {
  const { db, requiresEncryption } = connection;
  const messages: string[] = [];
  const client = await db.$client.connect();
  try {
    const stream = client.connection.stream;
    deepStrictEqual(stream instanceof TLSSocket, requiresEncryption);
    if (stream instanceof TLSSocket) ok(stream.encrypted && stream.authorized);
  } finally {
    client.release();
  }
  messages.push(requiresEncryption
    ? "PASS: Encrypted connection with certificate and host-name checks"
    : "PASS: Loopback connection uses no encryption. Remote encryption remains untested.");

  deepStrictEqual((await db.execute(sql`
    select rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolinherit, rolreplication, rolbypassrls,
      exists(select from pg_auth_members where member = pg_roles.oid) as has_membership
    from pg_roles where rolname = current_user
  `)).rows, [{
    rolcanlogin: true, rolsuper: false, rolcreatedb: false, rolcreaterole: false,
    rolinherit: false, rolreplication: false, rolbypassrls: false, has_membership: false,
  }]);

  const probe = sql.identifier(`foundation_${randomUUID().replaceAll("-", "")}`);
  // CREATE DATABASE cannot run in a transaction. Check the role attributes first.
  let databaseCreated = false;
  try {
    await rejects((async () => {
      await db.execute(sql`create database ${probe}`);
      databaseCreated = true;
    })(), (error: unknown) => z.object({ cause: z.object({ code: z.literal("42501") }) }).safeParse(error).success);
  } finally {
    if (databaseCreated) await db.execute(sql`drop database ${probe}`);
  }

  const rollback = new Error("Roll back successful foundation checks.");
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`set local search_path to public, pg_catalog`);
      await tx.execute(sql`set local statement_timeout = '10s'`);
      await tx.execute(sql`set local lock_timeout = '5s'`);
      async function refused(query: SQL, code: string) {
        await rejects(tx.transaction(async (savepoint) => {
          await savepoint.execute(query);
        }), (error: unknown) => z.object({ cause: z.object({ code: z.literal(code) }) }).safeParse(error).success);
      }
      async function createOwnedRecords() {
        return ids.parse((await tx.execute(sql`
          with account as (
            insert into accounts (email, name, google_id) values (${`${randomUUID()}@example.test`}, 'Foundation check', ${randomUUID()}) returning id
          ), student as (
            insert into students (
              account_id, platform, current_score, goal_score, goal_test_date, preferred_practice_test_day, accommodation,
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
        `)).rows[0]);
      }
      const records = await createOwnedRecords();
      const other = await createOwnedRecords();
      await tx.execute(sql`update accounts set simulated_date = '2026-11-02', session_version = session_version + 1
        where id = ${records.account_id}`);
      await tx.execute(sql`update students set current_score = 155 where id = ${records.student_id}`);
      await tx.execute(sql`update analytics_snapshots set lr_accuracy_by_type = '{"Weaken":60}' where id = ${records.snapshot_id}`);
      await tx.execute(sql`update practice_test_results set prep_test = 157 where id = ${records.practice_test_id}`);
      deepStrictEqual((await tx.execute(sql`select prep_test from practice_test_results where id = ${records.practice_test_id}`)).rows,
        [{ prep_test: 157 }]);
      await tx.execute(sql`update activity_check_ins set status = 'completed' where id = ${records.check_in_id}`);
      deepStrictEqual((await tx.execute(sql`
        select accounts.simulated_date, accounts.session_version, students.current_score, analytics_snapshots.lr_accuracy_by_type,
          weekly_schedules.policy_version, activity_check_ins.status
        from accounts join students on students.account_id = accounts.id
          join analytics_snapshots on analytics_snapshots.student_id = students.id
          join weekly_schedules on weekly_schedules.student_id = students.id
          join activity_check_ins on activity_check_ins.schedule_id = weekly_schedules.id
        where accounts.id = ${records.account_id}
      `)).rows, [{ simulated_date: "2026-11-02", session_version: 1, current_score: 155, lr_accuracy_by_type: { Weaken: 60 },
        policy_version: "adaptive-weekly-schedule-v2", status: "completed" }]);
      messages.push("PASS: App reads and writes");

      for (const query of [
        sql`create role ${probe}`,
        sql`create table public.${probe} (value integer)`, sql`create temporary table ${probe} (value integer)`,
        sql`create schema ${probe}`, sql`alter table accounts add column ${probe} text`,
      ]) await refused(query, "42501");
      for (const query of [
        sql`update weekly_schedules set policy_version = 'changed' where id = ${records.schedule_id}`,
        sql`update weekly_schedules set policy_version = policy_version where id = ${records.schedule_id}`,
        sql`update weekly_schedules set policy_version = 'changed' where false`,
      ]) await refused(query, "42501");
      messages.push("PASS: Limited role and immutable Weekly schedules");

      for (const query of [
        sql`update accounts set role = 'admin' where id = ${records.account_id}`,
        sql`update accounts set disabled_at = now() where id = ${records.account_id}`,
        sql`update accounts set google_id = ${randomUUID()} where id = ${records.account_id}`,
        sql`update accounts set email = ${`${randomUUID()}@example.test`} where id = ${records.account_id}`,
        sql`insert into accounts (email, name, role) values (${`${randomUUID()}@example.test`}, 'Foundation check', 'admin')`,
        sql`insert into accounts (email, name, disabled_at) values (${`${randomUUID()}@example.test`}, 'Foundation check', now())`,
      ]) await refused(query, "42501");
      messages.push("PASS: Admin role, disabled time, and Google ID changes refused");

      for (const query of [
        sql`select hash from drillmap_migrations.applied`,
        sql`insert into drillmap_migrations.applied (hash) values ('changed')`,
        sql`update drillmap_migrations.applied set hash = 'changed'`,
        sql`delete from drillmap_migrations.applied`,
      ]) await refused(query, "42501");
      messages.push("PASS: Owner-only migration journal refused");

      const missing = randomUUID();
      for (const query of [
        sql`update students set account_id = ${missing} where id = ${records.student_id}`,
        sql`update analytics_snapshots set student_id = ${missing} where id = ${records.snapshot_id}`,
        sql`update practice_test_results set student_id = ${missing} where id = ${records.practice_test_id}`,
        sql`insert into weekly_schedules (student_id, week_start_date, generated_at, schedule, source_snapshot_ids, generation_inputs, policy_version)
          values (${missing}, '2026-10-05', now(), '{}', '{}', '{}', 'adaptive-weekly-schedule-v2')`,
        sql`insert into activity_check_ins (schedule_id, activity_id, status) values (${missing}, 'MONDAY:0', 'not_started')`,
      ]) await refused(query, "23503");
      for (const query of [
        sql`update students set account_id = ${other.account_id} where id = ${records.student_id}`,
        sql`insert into weekly_schedules (student_id, week_start_date, generated_at, schedule, source_snapshot_ids, generation_inputs, policy_version)
          values (${records.student_id}, '2026-10-05', now(), '{}', '{}', '{}', 'adaptive-weekly-schedule-v2')`,
        sql`insert into activity_check_ins (schedule_id, activity_id, status) values (${records.schedule_id}, 'MONDAY:0', 'not_started')`,
      ]) await refused(query, "23505");
      for (const query of [
        sql`update activity_check_ins set schedule_id = ${other.schedule_id} where id = ${records.check_in_id}`,
        sql`update activity_check_ins set activity_id = 'MONDAY:1' where id = ${records.check_in_id}`,
        sql`update students set platform = 'Other' where id = ${records.student_id}`,
        sql`update students set accommodation = 1.25 where id = ${records.student_id}`,
        sql`update students set preferred_practice_test_day = 'FUNDAY' where id = ${records.student_id}`,
        sql`update activity_check_ins set status = 'unknown' where id = ${records.check_in_id}`,
        sql`update activity_check_ins set status = 'skipped' where id = ${records.check_in_id}`,
      ]) await refused(query, "23514");
      for (const day of ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]) {
        for (const value of [15, 31, 495, 30.1]) {
          await refused(sql`update students set ${sql.identifier(`${day}_capacity_minutes`)} = ${value} where id = ${records.student_id}`, "23514");
        }
      }
      messages.push("PASS: Database rules");

      await tx.execute(sql`delete from accounts where id = ${records.account_id}`);
      for (const [table, deletedId, keptId] of [
        ["accounts", records.account_id, other.account_id], ["students", records.student_id, other.student_id],
        ["analytics_snapshots", records.snapshot_id, other.snapshot_id], ["practice_test_results", records.practice_test_id, other.practice_test_id],
        ["weekly_schedules", records.schedule_id, other.schedule_id],
        ["activity_check_ins", records.check_in_id, other.check_in_id],
      ]) {
        deepStrictEqual((await tx.execute(sql`select id from ${sql.identifier(table)} where id = ${deletedId}`)).rows, []);
        deepStrictEqual((await tx.execute(sql`select id from ${sql.identifier(table)} where id = ${keptId}`)).rows, [{ id: keptId }]);
      }
      messages.push("PASS: Account deletion");
      for (const [table, id] of [
        ["activity_check_ins", other.check_in_id], ["weekly_schedules", other.schedule_id],
        ["analytics_snapshots", other.snapshot_id], ["practice_test_results", other.practice_test_id], ["students", other.student_id], ["accounts", other.account_id],
      ]) {
        deepStrictEqual((await tx.execute(sql`delete from ${sql.identifier(table)} where id = ${id} returning id`)).rows, [{ id }]);
      }
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  messages.push("PASS: Throwaway records rolled back");
  return messages;
}
