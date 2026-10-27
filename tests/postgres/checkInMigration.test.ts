import { sql } from "drizzle-orm";
import { expect, it } from "vitest";
import { createPostgresConnection } from "../../src/lib/postgres";
import { migrateUpTo } from "./partialMigrations";
import { createPostgresTestDatabase } from "./testDatabase";

it("turns skipped check-ins into not started and drops actual minutes", async () => {
  const database = await createPostgresTestDatabase();
  const connection = createPostgresConnection({ database: database.name });
  const db = connection.db;
  try {
    const migrateRest = await migrateUpTo(db, "0003_check_off_only");

    const { rows: [schedule] } = await db.execute<{ id: string }>(sql`
      with account as (
        insert into accounts (email, name, google_id) values ('check-off@example.test', 'Student', 'google-check-off') returning id
      ), student as (
        insert into students (
          account_id, platform, current_score, goal_score, goal_test_date, preferred_practice_test_day, accommodation,
          monday_capacity_minutes, tuesday_capacity_minutes, wednesday_capacity_minutes, thursday_capacity_minutes,
          friday_capacity_minutes, saturday_capacity_minutes, sunday_capacity_minutes
        ) select id, '7Sage', 150, 170, '2026-11-01', 'SATURDAY', 1, 90, 90, 90, 90, 90, 90, 90 from account returning id
      )
      insert into weekly_schedules (
        student_id, week_start_date, generated_at, schedule, source_snapshot_ids, generation_inputs, policy_version
      ) select id, '2026-10-05', '2026-10-05T12:00:00Z', '{}'::jsonb, '{}'::uuid[], '{}'::jsonb, 'adaptive-weekly-schedule-v2'
      from student returning id
    `);
    await db.execute(sql`
      insert into activity_check_ins (schedule_id, activity_id, status, actual_minutes) values
        (${schedule!.id}, 'MONDAY:0', 'skipped', null),
        (${schedule!.id}, 'MONDAY:1', 'completed', 45),
        (${schedule!.id}, 'MONDAY:2', 'not_started', null)
    `);

    await migrateRest();

    expect((await db.execute(sql`
      select activity_id, status from activity_check_ins order by activity_id
    `)).rows).toEqual([
      { activity_id: "MONDAY:0", status: "not_started" },
      { activity_id: "MONDAY:1", status: "completed" },
      { activity_id: "MONDAY:2", status: "not_started" },
    ]);
    expect((await db.execute(sql`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'activity_check_ins' and column_name = 'actual_minutes'
    `)).rows).toEqual([]);
    for (const status of ["skipped", "unknown"]) {
      await expect(db.execute(sql`update activity_check_ins set status = ${status} where activity_id = 'MONDAY:2'`))
        .rejects.toMatchObject({ cause: { code: "23514", constraint: "activity_check_ins_status_check" } });
    }
  } finally {
    await connection.close();
    await database.cleanup();
  }
});
