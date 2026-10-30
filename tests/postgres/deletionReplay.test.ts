import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, expect, it } from "vitest";
import { finishDeletion } from "../../src/lib/accountDeletion";
import { emailHash } from "../../src/lib/emailHash";
import {
  closePostgresDatabase, createPostgresConnection, getPostgresDatabase, postgresSettingForDatabase,
} from "../../src/lib/postgres";
import { createPostgresTestDatabase } from "./testDatabase";

const AUTH_SECRET = "deletion-replay-test-secret-0123456789";
const originalSetting = process.env.DATABASE_URL;
const originalSecret = process.env.AUTH_SECRET;
const liveName = `drillmap_test_${randomUUID().replaceAll("-", "")}`;
const liveSetting = postgresSettingForDatabase(liveName);
let backup: Awaited<ReturnType<typeof createPostgresTestDatabase>>;
let restored: ReturnType<typeof createPostgresConnection>;
let deletedId: string;
let keptId: string;
let sameEmailId: string;
let markedId: string;

async function seedStudentWithRecords(db: ReturnType<typeof createPostgresConnection>["db"], email: string) {
  const [account] = (await db.execute<{ id: string }>(sql`
    insert into accounts (email, name, google_id) values (${email}, ${email}, ${`google-${email}`}) returning id
  `)).rows;
  const [student] = (await db.execute<{ id: string }>(sql`
    insert into students (
      account_id, platform, current_score, goal_score, goal_test_date, preferred_practice_test_day, accommodation,
      monday_capacity_minutes, tuesday_capacity_minutes, wednesday_capacity_minutes, thursday_capacity_minutes,
      friday_capacity_minutes, saturday_capacity_minutes, sunday_capacity_minutes
    ) values (${account.id}::uuid, '7Sage', 150, 165, '2027-06-01', 'SATURDAY', 1, 90, 90, 90, 90, 90, 90, 90)
    returning id
  `)).rows;
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
  const [schedule] = (await db.execute<{ id: string }>(sql`
    insert into weekly_schedules (student_id, week_start_date, generated_at, schedule, source_snapshot_ids, generation_inputs, policy_version)
    values (${student.id}::uuid, '2026-10-12'::date, now(), '{}'::jsonb, '{}'::uuid[], '{}'::jsonb, 'fixture') returning id
  `)).rows;
  await db.execute(sql`
    insert into activity_check_ins (schedule_id, activity_id, status) values (${schedule.id}::uuid, 'MONDAY:0', 'completed')
  `);
  return account.id;
}

async function recordsOf(accountId: string) {
  const [counts] = (await restored.db.execute(sql`
    select
      (select count(*) from accounts where id = ${accountId}::uuid)::int as accounts,
      (select count(*) from students where account_id = ${accountId}::uuid)::int as students,
      (select count(*) from analytics_snapshots join students s on s.id = student_id where s.account_id = ${accountId}::uuid)::int as analytics_snapshots,
      (select count(*) from practice_test_results join students s on s.id = student_id where s.account_id = ${accountId}::uuid)::int as practice_test_results,
      (select count(*) from weekly_schedules join students s on s.id = student_id where s.account_id = ${accountId}::uuid)::int as weekly_schedules,
      (select count(*) from activity_check_ins c join weekly_schedules w on w.id = c.schedule_id
        join students s on s.id = w.student_id where s.account_id = ${accountId}::uuid)::int as activity_check_ins
  `)).rows;
  return counts;
}

const allRecords = {
  accounts: 1, students: 1, analytics_snapshots: 1, practice_test_results: 1, weekly_schedules: 1, activity_check_ins: 1,
};
const noRecords = {
  accounts: 0, students: 0, analytics_snapshots: 0, practice_test_results: 0, weekly_schedules: 0, activity_check_ins: 0,
};

function replay() {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    execFile(process.execPath, ["--import", "tsx", "scripts/replay-deletions.mts"], {
      env: { PATH: process.env.PATH, NODE_ENV: "test", DATABASE_URL: backup.setting, DELETION_LIST_URL: liveSetting, AUTH_SECRET },
      timeout: 15000,
    }, (error, stdout, stderr) => {
      if (error?.killed || error?.signal) return reject(new Error("replay-deletions timed out."));
      resolve({ code: typeof error?.code === "number" ? error.code : 0, stdout, stderr });
    });
  });
}

beforeAll(async () => {
  await closePostgresDatabase();
  process.env.AUTH_SECRET = AUTH_SECRET;
  backup = await createPostgresTestDatabase();
  const seeding = createPostgresConnection({ database: backup.name });
  try {
    deletedId = await seedStudentWithRecords(seeding.db, "deleted@test.local");
    keptId = await seedStudentWithRecords(seeding.db, "kept@test.local");
    sameEmailId = await seedStudentWithRecords(seeding.db, "same-email@test.local");
    markedId = await seedStudentWithRecords(seeding.db, "marked@test.local");
  } finally {
    await seeding.close();
  }
  const admin = createPostgresConnection({ database: "postgres" });
  try {
    await admin.db.execute(sql`create database ${sql.identifier(liveName)} template ${sql.identifier(backup.name)}`);
  } finally {
    await admin.close();
  }

  process.env.DATABASE_URL = liveSetting;
  const live = getPostgresDatabase();
  await live.execute(sql`update accounts set deleting_since = now() where id = ${deletedId}::uuid`);
  expect(await finishDeletion(deletedId, "/account")).toBe("deleted");
  await live.execute(sql`update accounts set deleting_since = now() where id = ${markedId}::uuid`);
  await live.execute(sql`
    insert into deletion_list (account_id, email_hash) values (${randomUUID()}::uuid, ${emailHash("same-email@test.local")})
  `);
  await closePostgresDatabase();
  process.env.DATABASE_URL = originalSetting;

  restored = createPostgresConnection({ database: backup.name });
});

afterAll(async () => {
  await restored?.close();
  await backup?.cleanup();
  const admin = createPostgresConnection({ database: "postgres" });
  try {
    await admin.db.execute(sql`drop database if exists ${sql.identifier(liveName)} with (force)`);
  } finally {
    await admin.close();
  }
  process.env.DATABASE_URL = originalSetting;
  process.env.AUTH_SECRET = originalSecret;
});

it("deletes each restored Account on the deletion list or marked deleting, with all its records, and a second run deletes nothing", async () => {
  expect(await recordsOf(deletedId)).toEqual(allRecords);
  expect(await recordsOf(sameEmailId)).toEqual(allRecords);
  expect(await recordsOf(markedId)).toEqual(allRecords);

  const first = await replay();
  expect(first).toEqual({ code: 0, stdout: "Deletion list rows: 2. Restored Accounts deleted: 3.\n", stderr: "" });
  expect(await recordsOf(deletedId)).toEqual(noRecords);
  expect(await recordsOf(sameEmailId)).toEqual(noRecords);
  expect(await recordsOf(markedId)).toEqual(noRecords);
  expect(await recordsOf(keptId)).toEqual(allRecords);
  const listed = (await restored.db.execute<{ account_id: string }>(sql`select account_id from deletion_list`)).rows;
  expect(listed).toHaveLength(4);
  expect(listed.map((row) => row.account_id)).toEqual(expect.arrayContaining([deletedId, sameEmailId, markedId]));

  const second = await replay();
  expect(second).toEqual({ code: 0, stdout: "Deletion list rows: 2. Restored Accounts deleted: 0.\n", stderr: "" });
  expect(await recordsOf(keptId)).toEqual(allRecords);
  expect((await restored.db.execute(sql`select 1 from deletion_list`)).rows).toHaveLength(4);
});

it("refuses to run without the key that made the email hashes", async () => {
  const result = await new Promise<{ code: number; output: string }>((resolve) => {
    execFile(process.execPath, ["--import", "tsx", "scripts/replay-deletions.mts"], {
      env: { PATH: process.env.PATH, NODE_ENV: "test", DATABASE_URL: backup.setting, DELETION_LIST_URL: liveSetting },
      timeout: 15000,
    }, (error, stdout, stderr) => resolve({ code: typeof error?.code === "number" ? error.code : 0, output: stdout + stderr }));
  });
  expect(result).toEqual({ code: 1, output: "AUTH_SECRET is not set.\n" });
});
