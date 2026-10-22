import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sql } from "drizzle-orm";
import { expect, it } from "vitest";
import { createPostgresConnection } from "../../src/lib/postgres";
import { createPostgresTestDatabase } from "./testDatabase";

const exec = promisify(execFile);

it("applies the migration command once and leaves the applied list unchanged on a second run", async () => {
  const database = await createPostgresTestDatabase();
  const connection = createPostgresConnection({ database: database.name });
  const db = connection.db;
  try {
    // Empty this test's own database, never the database shared by other suites.
    await db.execute(sql`drop schema public cascade`);
    await db.execute(sql`create schema public`);
    await db.execute(sql`drop schema drillmap_migrations cascade`);
    const options = { env: { ...process.env, DATABASE_URL: database.setting } };
    const first = await exec(process.execPath, ["--import", "tsx", "scripts/migrate-postgres.mts"], options);
    expect(first.stdout).toContain("Postgres migrations are up to date.");
    const applied = await db.execute(sql`select * from drillmap_migrations.applied order by id`);
    expect(applied.rows).toHaveLength(8);
    const second = await exec(process.execPath, ["--import", "tsx", "scripts/migrate-postgres.mts"], options);
    expect(second.stdout).toContain("Postgres migrations are up to date.");
    expect((await db.execute(sql`select * from drillmap_migrations.applied order by id`)).rows).toEqual(applied.rows);
  } finally {
    await connection.close();
    await database.cleanup();
  }
});
