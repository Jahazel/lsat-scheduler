import { execFile } from "node:child_process";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { closePostgresDatabase, createPostgresConnection } from "../../src/lib/postgres";
import { createPostgresTestDatabase } from "./testDatabase";

let database: Awaited<ReturnType<typeof createPostgresTestDatabase>>;
let owner: ReturnType<typeof createPostgresConnection>;
beforeAll(async () => {
  await closePostgresDatabase();
  database = await createPostgresTestDatabase();
  owner = createPostgresConnection({ database: database.name });
});
beforeEach(async () => {
  await owner.db.execute(sql`truncate accounts, leads cascade`);
});
afterAll(async () => {
  await owner?.close();
  await database?.cleanup();
});

function runScript(name: string, args: string[]) {
  return new Promise<{ code: number; output: string }>((resolve, reject) => {
    execFile(process.execPath, ["--import", "tsx", `scripts/${name}.mts`, ...args], {
      env: { PATH: process.env.PATH, NODE_ENV: "test", DATABASE_URL: database.setting },
      timeout: 15000,
    }, (error, stdout, stderr) => {
      if (error?.killed || error?.signal) return reject(new Error(`${name} timed out.`));
      resolve({ code: typeof error?.code === "number" ? error.code : 0, output: stdout + stderr });
    });
  });
}

async function rows(query: ReturnType<typeof sql>) {
  return (await owner.db.execute(query)).rows;
}

async function seedStudentWithRecords(email: string) {
  const [account] = await rows(sql`insert into accounts (email, name, google_id) values (${email}, ${email}, ${`google-${email}`}) returning id`);
  const [student] = await rows(sql`
    insert into students (
      account_id, platform, current_score, goal_score, goal_test_date, preferred_practice_test_day, accommodation,
      monday_capacity_minutes, tuesday_capacity_minutes, wednesday_capacity_minutes, thursday_capacity_minutes,
      friday_capacity_minutes, saturday_capacity_minutes, sunday_capacity_minutes
    ) values (${account.id}::uuid, '7Sage', 150, 165, '2027-06-01', 'SATURDAY', 1, 90, 90, 90, 90, 90, 90, 90)
    returning id
  `);
  await owner.db.execute(sql`
    insert into analytics_snapshots (
      student_id, week_of, approved_at, lr_accuracy_by_type, lr_top_priority_logic_types,
      extraction_source, extracted_at, extracted_values_match, is_latest_analytics, confirmed_at
    ) values (
      ${student.id}::uuid, '2026-10-12'::date, now(), '{"Strengthen": 0.7}'::jsonb, '{}'::text[],
      '7sage_screenshot', now(), true, true, now()
    )
  `);
  const [schedule] = await rows(sql`
    insert into weekly_schedules (student_id, week_start_date, generated_at, schedule, source_snapshot_ids, generation_inputs, policy_version)
    values (${student.id}::uuid, '2026-10-12'::date, now(), '{}'::jsonb, '{}'::uuid[], '{}'::jsonb, 'fixture') returning id
  `);
  await owner.db.execute(sql`
    insert into activity_check_ins (schedule_id, activity_id, status) values (${schedule.id}::uuid, 'MONDAY:0', 'completed')
  `);
}

async function recordCounts() {
  const [counts] = await rows(sql`
    select
      (select count(*) from accounts)::int as accounts,
      (select count(*) from leads)::int as leads,
      (select count(*) from students)::int as students,
      (select count(*) from analytics_snapshots)::int as analytics_snapshots,
      (select count(*) from weekly_schedules)::int as weekly_schedules,
      (select count(*) from activity_check_ins)::int as activity_check_ins
  `);
  return counts;
}

it("reset deletes every student and its records and keeps Accounts and leads", async () => {
  await seedStudentWithRecords("first@test.local");
  await seedStudentWithRecords("second@test.local");
  await owner.db.execute(sql`insert into accounts (email, name, google_id) values ('no-student@test.local', 'No Student', 'google-no-student')`);
  await owner.db.execute(sql`insert into leads (email) values ('lead@test.local')`);

  const unconfirmed = await runScript("reset-dev-data", []);
  expect(unconfirmed.code).toBe(1);
  expect(unconfirmed.output).toContain("Re-run with --yes to confirm.");
  expect(await recordCounts()).toMatchObject({ students: 2, weekly_schedules: 2 });

  const reset = await runScript("reset-dev-data", ["--yes"]);
  expect(reset.code).toBe(0);
  expect(reset.output).toMatch(
    /^Reset dev data on [^:]+(?::\d+)?: {"activityCheckIns":2,"weeklySchedules":2,"analyticsSnapshots":2,"students":2}\n$/,
  );
  expect(await recordCounts()).toEqual({
    accounts: 3, leads: 1, students: 0, analytics_snapshots: 0, weekly_schedules: 0, activity_check_ins: 0,
  });
});

it("make-admin refuses an Account that never signed in with Google", async () => {
  await owner.db.execute(sql`insert into accounts (email, name, password_hash) values ('password-only@test.local', 'Old', 'old-hash')`);

  const refused = await runScript("make-admin", ["password-only@test.local"]);
  expect(refused.code).toBe(1);
  expect(refused.output).toContain("has not signed in with Google");
  expect(await rows(sql`select role, password_hash is not null as has_password from accounts`))
    .toEqual([{ role: "student", has_password: true }]);
});

it("make-admin promotes a Google Account", async () => {
  await owner.db.execute(sql`insert into accounts (email, name, google_id)
    values ('promote@test.local', 'Promote', 'throwaway-google')`);

  const promoted = await runScript("make-admin", ["Promote@Test.Local"]);
  expect(promoted.code).toBe(0);
  expect(promoted.output).toContain("Made promote@test.local an admin on ");
  expect(await rows(sql`select role, password_hash, google_id from accounts where email = 'promote@test.local'`))
    .toEqual([{ role: "admin", password_hash: null, google_id: "throwaway-google" }]);

  const missing = await runScript("make-admin", ["missing@test.local"]);
  expect(missing.code).toBe(1);
  expect(missing.output).toContain("No account found for missing@test.local");
});
