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
  migrateRest = await migrateUpTo(connection.db, "0018_inactive_accounts");
});

afterEach(async () => {
  await connection.close();
  await database.cleanup();
});

it("starts each existing Account's last sign-in at the migration time, with no warning", async () => {
  await connection.db.execute(sql`insert into accounts (email, name, google_id) values ('old@example.test', 'Old', 'google-old')`);
  const { rows: [before] } = await connection.db.execute<{ now: string }>(sql`select now()`);

  await migrateRest();

  const { rows: [after] } = await connection.db.execute<{ now: string }>(sql`select now()`);
  const { rows } = await connection.db.execute<{ last_signed_in_at: string; inactive_warning_sent_at: string | null }>(
    sql`select last_signed_in_at, inactive_warning_sent_at from accounts`,
  );
  expect(rows).toEqual([{ last_signed_in_at: expect.any(String), inactive_warning_sent_at: null }]);
  const lastSignedIn = new Date(rows[0].last_signed_in_at).getTime();
  expect(lastSignedIn).toBeGreaterThan(new Date(before.now).getTime());
  expect(lastSignedIn).toBeLessThanOrEqual(new Date(after.now).getTime());
});
