import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { expect, it } from "vitest";
import { createPostgresConnection } from "../../src/lib/postgres";
import { createPostgresTestDatabase } from "./testDatabase";

const MIGRATIONS = { migrationsSchema: "drillmap_migrations", migrationsTable: "applied" };

// A copy of the migration folder that stops before the check-off migration.
async function migrationsBeforeCheckOff() {
  const folder = await mkdtemp(path.join(tmpdir(), "drillmap-migrations-"));
  await cp(path.resolve("migrations"), folder, { recursive: true });
  const journalPath = path.join(folder, "meta", "_journal.json");
  const journal = JSON.parse(await readFile(journalPath, "utf8")) as { entries: { tag: string }[] };
  const stop = journal.entries.findIndex(({ tag }) => tag === "0003_check_off_only");
  expect(stop).toBeGreaterThan(0);
  await writeFile(journalPath, JSON.stringify({ ...journal, entries: journal.entries.slice(0, stop) }));
  return folder;
}

it("turns skipped check-ins into not started and drops actual minutes", async () => {
  const database = await createPostgresTestDatabase();
  const connection = createPostgresConnection({ database: database.name });
  const db = connection.db;
  const folder = await migrationsBeforeCheckOff();
  try {
    await db.execute(sql`drop schema public cascade`);
    await db.execute(sql`create schema public`);
    await db.execute(sql`drop schema drillmap_migrations cascade`);
    await migrate(db, { migrationsFolder: folder, ...MIGRATIONS });

    const { rows: [schedule] } = await db.execute<{ id: string }>(sql`
      with account as (
        insert into accounts (email, name) values ('check-off@example.test', 'Student') returning id
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

    await migrate(db, { migrationsFolder: path.resolve("migrations"), ...MIGRATIONS });

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
    await rm(folder, { recursive: true, force: true });
    await connection.close();
    await database.cleanup();
  }
});
