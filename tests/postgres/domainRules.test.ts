import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { beforeEach, expect, it } from "vitest";
import { z } from "zod";
import { getPostgresDatabase } from "../../src/lib/postgres";

const db = getPostgresDatabase();
const accountIdSchema = z.uuid().brand<"AccountId">();
const studentIdSchema = z.uuid().brand<"StudentId">();
const snapshotIdSchema = z.uuid().brand<"AnalyticsSnapshotId">();
const accountRow = z.object({ id: accountIdSchema });
const studentRow = z.object({ id: studentIdSchema });
const snapshotRow = z.object({ id: snapshotIdSchema });
const scheduleRow = z.object({ id: z.uuid().brand<"WeeklyScheduleId">() });
const checkInRow = z.object({ id: z.uuid().brand<"ActivityCheckInId">() });

type AccountId = z.infer<typeof accountIdSchema>;
type StudentId = z.infer<typeof studentIdSchema>;
type AnalyticsSnapshotId = z.infer<typeof snapshotIdSchema>;
type WeeklyScheduleId = z.infer<typeof scheduleRow>["id"];

async function createAccount() {
  return accountRow.parse((await db.execute(sql`
    insert into accounts (email, name, google_id) values (${`${randomUUID()}@example.test`}, 'Student', ${randomUUID()}) returning id
  `)).rows[0]).id;
}

async function createStudent({ accountId }: { accountId: AccountId }) {
  return studentRow.parse((await db.execute(sql`
    insert into students (
      account_id, platform, current_score, goal_score, goal_test_date,
      preferred_practice_test_day, accommodation,
      monday_capacity_minutes, tuesday_capacity_minutes, wednesday_capacity_minutes,
      thursday_capacity_minutes, friday_capacity_minutes, saturday_capacity_minutes, sunday_capacity_minutes
    ) values (${accountId}, '7Sage', 150, 170, '2026-11-01', 'SATURDAY', 1, 30, 45, 60, 90, 120, 480, 180)
    returning id
  `)).rows[0]).id;
}

async function createSnapshot({ studentId }: { studentId: StudentId }) {
  return snapshotRow.parse((await db.execute(sql`
    insert into analytics_snapshots (
      student_id, week_of, lr_accuracy_by_type, lr_top_priority_logic_types,
      approved_at, extraction_source, extracted_at, extracted_values_match, is_latest_analytics, confirmed_at
    ) values (
      ${studentId}, '2026-10-05', '{"Weaken": 55}', ARRAY['Causal reasoning'],
      '2026-10-09T12:00:00Z', '7sage_screenshot', '2026-10-09T11:00:00Z', true, true, '2026-10-09T12:00:00Z'
    ) returning id
  `)).rows[0]).id;
}

// These tests check JSON storage. The app continues to validate the nested shapes.
const schedule = {
  studentName: "Student", weekOf: "2026-10-05",
  days: {
    MONDAY: {
      day: "MONDAY", type: "practice_test",
      activities: [{ kind: "PT", label: "Practice test", minutes: 180 }], totalMinutes: 180,
    },
  },
};
const generationInputs = { analytics: { weekOf: "2026-10-05", lrAccuracyByType: { Weaken: 55 }, lrTopPriorityLogicTypes: ["Causal reasoning"] } };

async function createSchedule({ studentId, snapshotIds = [], week = "2026-10-05" }: {
  studentId: StudentId; snapshotIds?: AnalyticsSnapshotId[]; week?: string;
}) {
  return scheduleRow.parse((await db.execute(sql`
    insert into weekly_schedules (
      student_id, week_start_date, generated_at, schedule, source_snapshot_ids, generation_inputs, policy_version
    ) values (${studentId}, ${week}, '2026-10-05T12:00:00Z', ${JSON.stringify(schedule)}::jsonb,
      ${`{${snapshotIds.join(",")}}`}::uuid[], ${JSON.stringify(generationInputs)}::jsonb, 'adaptive-weekly-schedule-v2')
    returning id
  `)).rows[0]).id;
}

async function createCheckIn({ scheduleId, activityId = "MONDAY:0" }: {
  scheduleId: WeeklyScheduleId; activityId?: string;
}) {
  return checkInRow.parse((await db.execute(sql`
    insert into activity_check_ins (schedule_id, activity_id, status)
    values (${scheduleId}, ${activityId}, 'not_started') returning id
  `)).rows[0]).id;
}

beforeEach(async () => {
  await db.execute(sql`truncate accounts, pending_signups cascade`);
});

it("reads Daily capacity and Accommodation as numbers", async () => {
  const studentId = await createStudent({ accountId: await createAccount() });
  for (const accommodation of [1, 1.5, 2]) {
    await db.execute(sql`
      update students set accommodation = ${accommodation} where id = ${studentId}
    `);
    expect((await db.execute(sql`
      select accommodation, monday_capacity_minutes, tuesday_capacity_minutes,
        wednesday_capacity_minutes, thursday_capacity_minutes, friday_capacity_minutes,
        saturday_capacity_minutes, sunday_capacity_minutes from students where id = ${studentId}
    `)).rows).toEqual([{
      accommodation, monday_capacity_minutes: 30, tuesday_capacity_minutes: 45,
      wednesday_capacity_minutes: 60, thursday_capacity_minutes: 90, friday_capacity_minutes: 120,
      saturday_capacity_minutes: 480, sunday_capacity_minutes: 180,
    }]);
  }
});

it("ties each student to one Account and refuses orphan or duplicate students", async () => {
  await expect(createStudent({ accountId: accountIdSchema.parse(randomUUID()) }))
    .rejects.toMatchObject({ cause: { code: "23503", constraint: "students_account_id_fkey" } });
  const accountId = await createAccount();
  const studentId = await createStudent({ accountId });
  await expect(createStudent({ accountId })).rejects.toMatchObject({ cause: { code: "23505", constraint: "students_account_id_key" } });
  await db.execute(sql`delete from accounts where id = ${accountId}`);
  expect((await db.execute(sql`select id from students where id = ${studentId}`)).rows).toEqual([]);
});

it("stores approved Analytics snapshot facts and deletes them with their student", async () => {
  await expect(createSnapshot({ studentId: studentIdSchema.parse(randomUUID()) }))
    .rejects.toMatchObject({ cause: { code: "23503", constraint: "analytics_snapshots_student_id_fkey" } });
  const accountId = await createAccount();
  const studentId = await createStudent({ accountId });
  const snapshotId = await createSnapshot({ studentId });
  expect((await db.execute(sql`
    select lr_accuracy_by_type, lr_top_priority_logic_types, extraction_source,
      extracted_values_match, is_latest_analytics from analytics_snapshots where id = ${snapshotId}
  `)).rows).toEqual([{
    lr_accuracy_by_type: { Weaken: 55 }, lr_top_priority_logic_types: ["Causal reasoning"],
    extraction_source: "7sage_screenshot", extracted_values_match: true, is_latest_analytics: true,
  }]);
  await db.execute(sql`delete from students where id = ${studentId}`);
  expect((await db.execute(sql`select id from analytics_snapshots where id = ${snapshotId}`)).rows).toEqual([]);
  expect((await db.execute(sql`select id from accounts where id = ${accountId}`)).rows).toEqual([{ id: accountId }]);
});

it("stores one Weekly schedule per student and week and keeps its analytics after a source snapshot is deleted", async () => {
  await expect(createSchedule({ studentId: studentIdSchema.parse(randomUUID()) }))
    .rejects.toMatchObject({ cause: { code: "23503", constraint: "weekly_schedules_student_id_fkey" } });
  const studentId = await createStudent({ accountId: await createAccount() });
  const snapshotId = await createSnapshot({ studentId });
  const scheduleId = await createSchedule({ studentId, snapshotIds: [snapshotId] });
  await expect(createSchedule({ studentId }))
    .rejects.toMatchObject({ cause: { code: "23505", constraint: "weekly_schedules_student_week_unique" } });
  await createSchedule({ studentId, week: "2026-10-12" });
  await createSchedule({ studentId: await createStudent({ accountId: await createAccount() }) });
  await db.execute(sql`delete from analytics_snapshots where id = ${snapshotId}`);
  expect((await db.execute(sql`
    select schedule, source_snapshot_ids, generation_inputs, policy_version from weekly_schedules where id = ${scheduleId}
  `)).rows).toEqual([{
    schedule, source_snapshot_ids: [snapshotId], generation_inputs: generationInputs, policy_version: "adaptive-weekly-schedule-v2",
  }]);
});

it("refuses every Weekly schedule update by the database owner but allows delete and insert", async () => {
  expect((await db.execute(sql`
    select current_user = pg_get_userbyid(datdba) as is_owner from pg_database where datname = current_database()
  `)).rows).toEqual([{ is_owner: true }]);
  const studentId = await createStudent({ accountId: await createAccount() });
  const scheduleId = await createSchedule({ studentId });
  const before = (await db.execute(sql`select * from weekly_schedules where id = ${scheduleId}`)).rows;
  for (const update of [
    sql`update weekly_schedules set policy_version = 'changed' where id = ${scheduleId}`,
    sql`update weekly_schedules set schedule = '{}'::jsonb where id = ${scheduleId}`,
    sql`update weekly_schedules set policy_version = policy_version where id = ${scheduleId}`,
    sql`update weekly_schedules set policy_version = 'changed' where false`,
  ]) {
    await expect(db.execute(update)).rejects.toMatchObject({ cause: { code: "23514", message: "Weekly schedules are immutable; create a new schedule instead of updating an existing one." } });
  }
  expect((await db.execute(sql`select * from weekly_schedules where id = ${scheduleId}`)).rows).toEqual(before);
  await db.execute(sql`delete from weekly_schedules where id = ${scheduleId}`);
  const replacementId = await createSchedule({ studentId });
  expect(replacementId).not.toBe(scheduleId);
});

it("creates one Activity check-in per Weekly schedule and Schedule activity and deletes it with its schedule", async () => {
  await expect(createCheckIn({ scheduleId: scheduleRow.shape.id.parse(randomUUID()) }))
    .rejects.toMatchObject({ cause: { code: "23503", constraint: "activity_check_ins_schedule_id_fkey" } });
  const studentId = await createStudent({ accountId: await createAccount() });
  const scheduleId = await createSchedule({ studentId });
  const checkInId = await createCheckIn({ scheduleId });
  await expect(createCheckIn({ scheduleId }))
    .rejects.toMatchObject({ cause: { code: "23505", constraint: "activity_check_ins_schedule_activity_unique" } });
  await createCheckIn({ scheduleId, activityId: "MONDAY:1" });
  await createCheckIn({ scheduleId: await createSchedule({ studentId, week: "2026-10-12" }) });
  await db.execute(sql`update activity_check_ins set status = 'completed' where id = ${checkInId}`);
  expect((await db.execute(sql`select status from activity_check_ins where id = ${checkInId}`)).rows)
    .toEqual([{ status: "completed" }]);
  await db.execute(sql`update activity_check_ins set status = 'not_started' where id = ${checkInId}`);
  expect((await db.execute(sql`select status from activity_check_ins where id = ${checkInId}`)).rows)
    .toEqual([{ status: "not_started" }]);
  await db.execute(sql`delete from weekly_schedules where id = ${scheduleId}`);
  expect((await db.execute(sql`select id from activity_check_ins where schedule_id = ${scheduleId}`)).rows).toEqual([]);
});

it("refuses changes to an Activity check-in's Weekly schedule or Schedule activity", async () => {
  const studentId = await createStudent({ accountId: await createAccount() });
  const scheduleId = await createSchedule({ studentId });
  const otherScheduleId = await createSchedule({ studentId, week: "2026-10-12" });
  const checkInId = await createCheckIn({ scheduleId });
  for (const update of [
    sql`update activity_check_ins set schedule_id = ${otherScheduleId} where id = ${checkInId}`,
    sql`update activity_check_ins set activity_id = 'MONDAY:1' where id = ${checkInId}`,
  ]) {
    await expect(db.execute(update)).rejects.toMatchObject({ cause: {
      code: "23514", message: "An Activity check-in cannot change its Weekly schedule or Schedule activity.",
    } });
  }
  await db.execute(sql`
    update activity_check_ins set schedule_id = ${scheduleId}, activity_id = 'MONDAY:0', status = 'completed'
    where id = ${checkInId}
  `);
  expect((await db.execute(sql`
    select schedule_id, activity_id, status from activity_check_ins where id = ${checkInId}
  `)).rows).toEqual([{ schedule_id: scheduleId, activity_id: "MONDAY:0", status: "completed" }]);
});

it("advances the update time on Analytics snapshots and Activity check-ins", async () => {
  const studentId = await createStudent({ accountId: await createAccount() });
  const snapshotId = await createSnapshot({ studentId });
  const checkInId = await createCheckIn({ scheduleId: await createSchedule({ studentId }) });
  const timestampRow = z.object({ created_at: z.string(), updated_at: z.string() });
  const cases = [
    { table: "analytics_snapshots", id: snapshotId, update: sql`lr_accuracy_by_type = '{"Weaken": 60}'::jsonb` },
    { table: "activity_check_ins", id: checkInId, update: sql`status = 'completed'` },
  ];
  await db.transaction(async (tx) => {
    for (const { table, id, update } of cases) {
      // Two updates in one transaction must each get their own update time.
      await tx.execute(sql`update ${sql.identifier(table)} set ${update} where id = ${id}`);
      const before = timestampRow.parse((await tx.execute(sql`
        select created_at, updated_at from ${sql.identifier(table)} where id = ${id}
      `)).rows[0]);
      expect((await tx.execute(sql`
        update ${sql.identifier(table)} set ${update} where id = ${id}
        returning created_at, updated_at > ${before.updated_at}::timestamptz as advanced
      `)).rows).toEqual([{ created_at: before.created_at, advanced: true }]);
    }
  });
});

it("deleting an Account removes its student, Analytics snapshots, Weekly schedules, and Activity check-ins", async () => {
  const accountId = await createAccount();
  const studentId = await createStudent({ accountId });
  const snapshotId = await createSnapshot({ studentId });
  for (const week of ["2026-10-05", "2026-10-12"]) {
    await createCheckIn({ scheduleId: await createSchedule({ studentId, snapshotIds: [snapshotId], week }) });
  }
  const otherAccountId = await createAccount();
  const otherStudentId = await createStudent({ accountId: otherAccountId });
  await createSnapshot({ studentId: otherStudentId });
  await createCheckIn({ scheduleId: await createSchedule({ studentId: otherStudentId }) });
  await db.execute(sql`delete from accounts where id = ${accountId}`);
  for (const table of ["accounts", "students", "analytics_snapshots", "weekly_schedules", "activity_check_ins"]) {
    expect((await db.execute(sql`select count(*)::integer as count from ${sql.identifier(table)}`)).rows).toEqual([{ count: 1 }]);
  }
  expect((await db.execute(sql`select id from accounts`)).rows).toEqual([{ id: otherAccountId }]);
  expect((await db.execute(sql`select id from students`)).rows).toEqual([{ id: otherStudentId }]);
});

it.each(["owner", "ADMIN", "", null])("refuses an unknown or missing Account role %s", async (role) => {
  await expect(db.execute(sql`
    insert into accounts (email, name, google_id, role) values ('invalid@example.test', 'Student', 'google-invalid', ${role})
  `))
    .rejects.toMatchObject({ cause: role === null
      ? { code: "23502", table: "accounts", column: "role" }
      : { code: "23514", constraint: "accounts_role_check" } });
});

it.each([
  { field: "platform", value: "Other", code: "23514" },
  { field: "platform", value: null, code: "23502" },
  { field: "accommodation", value: 1.25, code: "23514" },
  { field: "accommodation", value: 0, code: "23514" },
  { field: "accommodation", value: null, code: "23502" },
  { field: "preferred_practice_test_day", value: "FUNDAY", code: "23514" },
  { field: "preferred_practice_test_day", value: "saturday", code: "23514" },
  { field: "preferred_practice_test_day", value: null, code: "23502" },
])("refuses invalid student $field value $value", async ({ field, value, code }) => {
  const studentId = await createStudent({ accountId: await createAccount() });
  await expect(db.execute(sql`update students set ${sql.identifier(field)} = ${value} where id = ${studentId}`))
    .rejects.toMatchObject({ cause: value === null
      ? { code, table: "students", column: field }
      : { code, constraint: `students_${field}_check` } });
});

it.each(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])(
  "requires %s Daily capacity from 30 to 480 minutes in 15-minute steps", async (day) => {
    const studentId = await createStudent({ accountId: await createAccount() });
    const column = sql.identifier(`${day}_capacity_minutes`);
    for (const value of [0, 15, 29, 31, 479, 481, 495, -30]) {
      await expect(db.execute(sql`update students set ${column} = ${value} where id = ${studentId}`))
        .rejects.toMatchObject({ cause: { code: "23514", constraint: "daily_capacity_minutes_check" } });
    }
    await expect(db.execute(sql`update students set ${column} = 30.1 where id = ${studentId}`))
      .rejects.toMatchObject({ cause: { code: "23514", constraint: "daily_capacity_minutes_check" } });
    await expect(db.execute(sql`update students set ${column} = null where id = ${studentId}`))
      .rejects.toMatchObject({ cause: { code: "23502", table: "students", column: `${day}_capacity_minutes` } });
    for (const value of [30, 45, 480]) {
      await db.execute(sql`update students set ${column} = ${value} where id = ${studentId}`);
    }
  },
);

it("allows both platforms, all Accommodations, and all Preferred practice-test days", async () => {
  const studentId = await createStudent({ accountId: await createAccount() });
  for (const platform of ["7Sage", "LSAT Demon"]) {
    for (const accommodation of [1, 1.5, 2]) {
      for (const day of ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]) {
        await db.execute(sql`
          update students set platform = ${platform}, accommodation = ${accommodation},
            preferred_practice_test_day = ${day} where id = ${studentId}
        `);
      }
    }
  }
});

it("refuses any check-in status but not started and completed on insert and update", async () => {
  const scheduleId = await createSchedule({ studentId: await createStudent({ accountId: await createAccount() }) });
  const checkInId = await createCheckIn({ scheduleId });
  const constraint = "activity_check_ins_status_check";
  for (const status of ["unknown", "skipped"]) {
    await expect(db.execute(sql`
      insert into activity_check_ins (schedule_id, activity_id, status) values (${scheduleId}, 'MONDAY:1', ${status})
    `)).rejects.toMatchObject({ cause: { code: "23514", constraint } });
    await expect(db.execute(sql`update activity_check_ins set status = ${status} where id = ${checkInId}`))
      .rejects.toMatchObject({ cause: { code: "23514", constraint } });
  }
  for (const status of ["not_started", "completed"]) {
    await db.execute(sql`update activity_check_ins set status = ${status} where id = ${checkInId}`);
  }
});

it("creates an Account with a database UUID and stores a normalized, unique email", async () => {
  const result = await db.execute(sql`
    insert into accounts (email, name, google_id) values ('  Student@Example.test  ', 'Student', 'google-student')
    returning id, email, role, password_hash, simulated_date
  `);
  const account = accountRow.parse(result.rows[0]);
  expect(result.rows[0]).toMatchObject({
    email: "student@example.test", role: "student", password_hash: null, simulated_date: null,
  });
  await expect(db.execute(sql`
    insert into accounts (email, name, password_hash) values ('STUDENT@example.test', 'Duplicate', 'hash')
  `)).rejects.toMatchObject({ cause: { code: "23505", constraint: "accounts_email_key" } });
  await db.execute(sql`
    update accounts set email = ' Changed@Example.test ', role = 'admin',
      simulated_date = '2026-10-12' where id = ${account.id}
  `);
  expect((await db.execute(sql`select email, role from accounts where id = ${account.id}`)).rows)
    .toEqual([{ email: "changed@example.test", role: "admin" }]);
});

it("refuses empty or missing email on Account insert and update", async () => {
  const id = await createAccount();
  for (const email of ["", " \t\n ", null]) {
    const cause = email === null
      ? { code: "23502", table: "accounts", column: "email" }
      : { code: "23514", constraint: "accounts_email_normalized" };
    await expect(db.execute(sql`insert into accounts (email, name, password_hash) values (${email}, 'Student', 'hash')`))
      .rejects.toMatchObject({ cause });
    await expect(db.execute(sql`update accounts set email = ${email} where id = ${id}`))
      .rejects.toMatchObject({ cause });
  }
});

it("requires each Account to have exactly one sign-in method", async () => {
  const constraint = "accounts_one_sign_in_method";
  for (const methods of [sql`'hash', 'google-both'`, sql`null, null`]) {
    await expect(db.execute(sql`
      insert into accounts (email, name, password_hash, google_id) values ('refused@example.test', 'Student', ${methods})
    `)).rejects.toMatchObject({ cause: { code: "23514", constraint } });
  }
  const googleAccount = await createAccount();
  await expect(db.execute(sql`update accounts set password_hash = 'hash' where id = ${googleAccount}`))
    .rejects.toMatchObject({ cause: { code: "23514", constraint } });
  await expect(db.execute(sql`update accounts set google_id = null where id = ${googleAccount}`))
    .rejects.toMatchObject({ cause: { code: "23514", constraint } });
  await expect(db.execute(sql`insert into accounts (email, name, password_hash) values ('empty@example.test', 'Student', '')`))
    .rejects.toMatchObject({ cause: { code: "23514", constraint: "accounts_password_hash_not_empty" } });

  await db.execute(sql`insert into accounts (email, name, password_hash) values ('password@example.test', 'Student', 'hash')`);
  expect((await db.execute(sql`
    select email, password_hash is not null as has_password, google_id is not null as has_google
    from accounts order by has_password desc
  `)).rows).toEqual([
    { email: "password@example.test", has_password: true, has_google: false },
    { email: expect.stringMatching(/@example\.test$/), has_password: false, has_google: true },
  ]);
});

it("refuses an Admin with a password", async () => {
  const constraint = "accounts_admin_without_password";
  await expect(db.execute(sql`
    insert into accounts (email, name, password_hash, role) values ('admin@example.test', 'Admin', 'hash', 'admin')
  `)).rejects.toMatchObject({ cause: { code: "23514", constraint } });
  const { rows: [passwordAccount] } = await db.execute<{ id: string }>(sql`
    insert into accounts (email, name, password_hash) values ('student@example.test', 'Student', 'hash') returning id
  `);
  await expect(db.execute(sql`update accounts set role = 'admin' where id = ${passwordAccount!.id}`))
    .rejects.toMatchObject({ cause: { code: "23514", constraint } });
  expect((await db.execute(sql`select role from accounts`)).rows).toEqual([{ role: "student" }]);
});

it("keeps one pending signup per normalized email and refuses empty fields", async () => {
  const expires = "2026-10-28T12:00:00Z";
  await db.execute(sql`
    insert into pending_signups (email, name, password_hash, token_hash, token_expires_at)
    values (' New@Example.test ', 'New', 'hash', 'token-1', ${expires})
  `);
  expect((await db.execute(sql`select email, created_at is not null as dated from pending_signups`)).rows)
    .toEqual([{ email: "new@example.test", dated: true }]);
  await expect(db.execute(sql`
    insert into pending_signups (email, name, password_hash, token_hash, token_expires_at)
    values ('NEW@example.test', 'Again', 'hash', 'token-2', ${expires})
  `)).rejects.toMatchObject({ cause: { code: "23505", constraint: "pending_signups_pkey" } });
  for (const [column, value] of [["email", " "], ["password_hash", ""], ["token_hash", ""]] as const) {
    await expect(db.execute(sql`update pending_signups set ${sql.identifier(column)} = ${value}`))
      .rejects.toMatchObject({ cause: { code: "23514" } });
  }
});

it("keeps one reset token per Account and deletes it with the Account", async () => {
  const { rows: [account] } = await db.execute<{ id: string }>(sql`
    insert into accounts (email, name, password_hash) values ('reset@example.test', 'Student', 'hash') returning id
  `);
  await db.execute(sql`insert into reset_tokens (account_id, token_hash, expires_at) values (${account!.id}, 'token-1', now())`);
  await expect(db.execute(sql`insert into reset_tokens (account_id, token_hash, expires_at) values (${account!.id}, 'token-2', now())`))
    .rejects.toMatchObject({ cause: { code: "23505", constraint: "reset_tokens_pkey" } });
  await db.execute(sql`delete from accounts where id = ${account!.id}`);
  expect((await db.execute(sql`select * from reset_tokens`)).rows).toEqual([]);
});
