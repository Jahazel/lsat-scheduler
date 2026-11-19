import { sql } from "drizzle-orm";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createPostgresConnection } from "../../src/lib/postgres";
import { migrateUpTo } from "./partialMigrations";
import { createPostgresTestDatabase } from "./testDatabase";

let database: Awaited<ReturnType<typeof createPostgresTestDatabase>>;
let connection: ReturnType<typeof createPostgresConnection>;
let migrateRest: () => Promise<void>;

beforeEach(async () => {
  database = await createPostgresTestDatabase();
  connection = createPostgresConnection({ database: database.name });
  migrateRest = await migrateUpTo(connection.db, "0026_snapshot_score");
});

afterEach(async () => {
  await connection.close();
  await database.cleanup();
});

it("adds an empty score to each saved snapshot and changes nothing else", async () => {
  const { db } = connection;
  const [account] = (await db.execute<{ id: string }>(sql`
    insert into accounts (email, name, google_id) values ('old@example.test', 'Old', 'google-old') returning id
  `)).rows;
  const [student] = (await db.execute<{ id: string }>(sql`
    insert into students (
      account_id, platform, current_score, goal_score, goal_test_date, preferred_practice_test_day, accommodation,
      monday_capacity_minutes, tuesday_capacity_minutes, wednesday_capacity_minutes, thursday_capacity_minutes,
      friday_capacity_minutes, saturday_capacity_minutes, sunday_capacity_minutes
    ) values (${account!.id}::uuid, '7Sage', 150, 165, '2027-06-01', 'SATURDAY', 1, 90, 90, 90, 90, 90, 90, 90)
    returning id
  `)).rows;
  await db.execute(sql`
    insert into analytics_snapshots (
      student_id, week_of, approved_at, lr_accuracy_by_type, lr_top_priority_logic_types,
      extraction_source, extracted_at, extracted_values_match, is_latest_analytics, confirmed_at
    ) values (
      ${student!.id}::uuid, '2026-10-12'::date, now(), '{"Strengthen": 0.7}'::jsonb, '{}'::text[],
      '7sage_screenshot', now(), true, true, now()
    )
  `);
  const before = (await db.execute(sql`select * from analytics_snapshots`)).rows;

  await migrateRest();

  expect((await db.execute(sql`select * from analytics_snapshots`)).rows).toEqual(before.map((row) => ({ ...row, score: null })));
});
