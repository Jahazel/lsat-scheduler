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
const leadRow = z.object({ id: z.uuid().brand<"LeadId">() });

type AccountId = z.infer<typeof accountIdSchema>;
type StudentId = z.infer<typeof studentIdSchema>;
type AnalyticsSnapshotId = z.infer<typeof snapshotIdSchema>;
type WeeklyScheduleId = z.infer<typeof scheduleRow>["id"];

async function createAccount() {
  return accountRow.parse((await db.execute(sql`
    insert into accounts (email, name) values (${`${randomUUID()}@example.test`}, 'Student') returning id
  `)).rows[0]).id;
}

async function createStudent({ accountId }: { accountId: AccountId }) {
  return studentRow.parse((await db.execute(sql`
    insert into students (
      account_id, platform, current_score, goal_score, goal_test_date,
      preferred_practice_test_day, accommodation_multiplier,
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
  await db.execute(sql`truncate accounts, leads cascade`);
});

it("ties each student to one Account and refuses orphan or duplicate students", async () => {
  await expect(createStudent({ accountId: accountIdSchema.parse(randomUUID()) })).rejects.toMatchObject({ cause: { code: "23503" } });
  const accountId = await createAccount();
  const studentId = await createStudent({ accountId });
  await expect(createStudent({ accountId })).rejects.toMatchObject({ cause: { code: "23505" } });
  await db.execute(sql`delete from accounts where id = ${accountId}`);
  expect((await db.execute(sql`select id from students where id = ${studentId}`)).rows).toEqual([]);
});

it("stores approved Analytics snapshot facts and deletes them with their student", async () => {
  await expect(createSnapshot({ studentId: studentIdSchema.parse(randomUUID()) })).rejects.toMatchObject({ cause: { code: "23503" } });
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
  await expect(createSchedule({ studentId: studentIdSchema.parse(randomUUID()) })).rejects.toMatchObject({ cause: { code: "23503" } });
  const studentId = await createStudent({ accountId: await createAccount() });
  const snapshotId = await createSnapshot({ studentId });
  const scheduleId = await createSchedule({ studentId, snapshotIds: [snapshotId] });
  await expect(createSchedule({ studentId })).rejects.toMatchObject({ cause: { code: "23505" } });
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
  await expect(createCheckIn({ scheduleId: scheduleRow.shape.id.parse(randomUUID()) })).rejects.toMatchObject({ cause: { code: "23503" } });
  const studentId = await createStudent({ accountId: await createAccount() });
  const scheduleId = await createSchedule({ studentId });
  const checkInId = await createCheckIn({ scheduleId });
  await expect(createCheckIn({ scheduleId })).rejects.toMatchObject({ cause: { code: "23505" } });
  await createCheckIn({ scheduleId, activityId: "MONDAY:1" });
  await createCheckIn({ scheduleId: await createSchedule({ studentId, week: "2026-10-12" }) });
  await db.execute(sql`
    update activity_check_ins set status = 'completed', actual_minutes = 42.5 where id = ${checkInId}
  `);
  expect((await db.execute(sql`select status, actual_minutes from activity_check_ins where id = ${checkInId}`)).rows)
    .toEqual([{ status: "completed", actual_minutes: 42.5 }]);
  await db.execute(sql`
    update activity_check_ins set status = 'skipped', actual_minutes = null where id = ${checkInId}
  `);
  expect((await db.execute(sql`select status, actual_minutes from activity_check_ins where id = ${checkInId}`)).rows)
    .toEqual([{ status: "skipped", actual_minutes: null }]);
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
    await expect(db.execute(update)).rejects.toMatchObject({ cause: { code: "23514" } });
  }
  await db.execute(sql`
    update activity_check_ins set schedule_id = ${scheduleId}, activity_id = 'MONDAY:0', status = 'completed', actual_minutes = 0
    where id = ${checkInId}
  `);
  expect((await db.execute(sql`
    select schedule_id, activity_id, status, actual_minutes from activity_check_ins where id = ${checkInId}
  `)).rows).toEqual([{ schedule_id: scheduleId, activity_id: "MONDAY:0", status: "completed", actual_minutes: 0 }]);
});

it("deleting an Account removes all of its students, Analytics snapshots, Weekly schedules, and Activity check-ins", async () => {
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
  await db.execute(sql`insert into leads (email) values ('independent@example.test')`);
  await db.execute(sql`delete from accounts where id = ${accountId}`);
  for (const table of ["accounts", "students", "analytics_snapshots", "weekly_schedules", "activity_check_ins", "leads"]) {
    expect((await db.execute(sql`select count(*)::integer as count from ${sql.identifier(table)}`)).rows).toEqual([{ count: 1 }]);
  }
  expect((await db.execute(sql`select id from accounts`)).rows).toEqual([{ id: otherAccountId }]);
  expect((await db.execute(sql`select id from students`)).rows).toEqual([{ id: otherStudentId }]);
});

it.each(["owner", "ADMIN", "", null])("refuses an unknown or missing Account role %s", async (role) => {
  await expect(db.execute(sql`insert into accounts (email, name, role) values ('invalid@example.test', 'Student', ${role})`))
    .rejects.toMatchObject({ cause: { code: role === null ? "23502" : "23514" } });
});

it.each([
  { field: "platform", value: "Other", code: "23514" },
  { field: "platform", value: null, code: "23502" },
  { field: "accommodation_multiplier", value: 1.25, code: "23514" },
  { field: "accommodation_multiplier", value: 0, code: "23514" },
  { field: "accommodation_multiplier", value: null, code: "23502" },
  { field: "preferred_practice_test_day", value: "FUNDAY", code: "23514" },
  { field: "preferred_practice_test_day", value: "saturday", code: "23514" },
  { field: "preferred_practice_test_day", value: null, code: "23502" },
])("refuses invalid student $field value $value", async ({ field, value, code }) => {
  const studentId = await createStudent({ accountId: await createAccount() });
  await expect(db.execute(sql`update students set ${sql.identifier(field)} = ${value} where id = ${studentId}`))
    .rejects.toMatchObject({ cause: { code } });
});

it.each(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])(
  "requires %s Daily capacity from 30 to 480 minutes in 15-minute steps", async (day) => {
    const studentId = await createStudent({ accountId: await createAccount() });
    const column = sql.identifier(`${day}_capacity_minutes`);
    for (const value of [0, 15, 29, 31, 479, 481, 495, -30]) {
      await expect(db.execute(sql`update students set ${column} = ${value} where id = ${studentId}`))
        .rejects.toMatchObject({ cause: { code: "23514" } });
    }
    await expect(db.execute(sql`update students set ${column} = 30.1 where id = ${studentId}`))
      .rejects.toMatchObject({ cause: { code: "23514" } });
    await expect(db.execute(sql`update students set ${column} = null where id = ${studentId}`))
      .rejects.toMatchObject({ cause: { code: "23502" } });
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
          update students set platform = ${platform}, accommodation_multiplier = ${accommodation},
            preferred_practice_test_day = ${day} where id = ${studentId}
        `);
      }
    }
  }
});

it("refuses unknown check-in status and invalid actual minutes on insert and update", async () => {
  const scheduleId = await createSchedule({ studentId: await createStudent({ accountId: await createAccount() }) });
  const checkInId = await createCheckIn({ scheduleId });
  const cases = [
    { status: "unknown", minutes: null },
    { status: "completed", minutes: -1 },
    { status: "completed", minutes: "NaN" },
    { status: "completed", minutes: "Infinity" },
    { status: "not_started", minutes: 0 },
    { status: "skipped", minutes: 15 },
  ];
  for (const { status, minutes } of cases) {
    await expect(db.execute(sql`
      insert into activity_check_ins (schedule_id, activity_id, status, actual_minutes)
      values (${scheduleId}, 'MONDAY:1', ${status}, ${minutes})
    `)).rejects.toMatchObject({ cause: { code: "23514" } });
    await expect(db.execute(sql`
      update activity_check_ins set status = ${status}, actual_minutes = ${minutes} where id = ${checkInId}
    `)).rejects.toMatchObject({ cause: { code: "23514" } });
  }
  for (const status of ["not_started", "completed", "skipped"]) {
    await db.execute(sql`update activity_check_ins set status = ${status}, actual_minutes = null where id = ${checkInId}`);
  }
});

it("creates an Account with a database UUID and stores a normalized, unique email", async () => {
  const result = await db.execute(sql`
    insert into accounts (email, name) values ('  Student@Example.test  ', 'Student')
    returning id, email, role, password_hash, simulated_date
  `);
  const account = accountRow.parse(result.rows[0]);
  expect(result.rows[0]).toMatchObject({
    email: "student@example.test", role: "student", password_hash: null, simulated_date: null,
  });
  await expect(db.execute(sql`
    insert into accounts (email, name) values ('STUDENT@example.test', 'Duplicate')
  `)).rejects.toMatchObject({ cause: { code: "23505" } });
  await db.execute(sql`
    update accounts set email = ' Changed@Example.test ', role = 'admin',
      password_hash = 'fake-hash', simulated_date = '2026-10-12' where id = ${account.id}
  `);
  expect((await db.execute(sql`select email, role from accounts where id = ${account.id}`)).rows)
    .toEqual([{ email: "changed@example.test", role: "admin" }]);
});

it("keeps leads separate from Accounts with their own normalized, unique emails", async () => {
  const account = accountRow.parse((await db.execute(sql`
    insert into accounts (email, name) values ('lead@example.test', 'Account') returning id
  `)).rows[0]);
  const lead = await db.execute(sql`
    insert into leads (email) values (${"\t Lead@Example.test \n"}) returning id, email, created_at, updated_at
  `);
  leadRow.parse(lead.rows[0]);
  expect(lead.rows[0]).toMatchObject({ email: "lead@example.test", created_at: expect.any(String), updated_at: expect.any(String) });
  await expect(db.execute(sql`insert into leads (email) values ('LEAD@example.test')`))
    .rejects.toMatchObject({ cause: { code: "23505" } });
  await db.execute(sql`delete from accounts where id = ${account.id}`);
  expect((await db.execute(sql`select email from leads`)).rows).toEqual([{ email: "lead@example.test" }]);
});
