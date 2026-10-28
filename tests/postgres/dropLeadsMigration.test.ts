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
  migrateRest = await migrateUpTo(connection.db, "0015_drop_leads");
});

afterEach(async () => {
  await connection.close();
  await database.cleanup();
});

it("drops the leads table with every old lead and keeps Accounts", async () => {
  await connection.db.execute(sql`insert into leads (email) values ('old-lead@example.test'), ('kept@example.test')`);
  await connection.db.execute(sql`insert into accounts (email, name, google_id) values ('kept@example.test', 'Kept', 'google-kept')`);

  await migrateRest();

  expect((await connection.db.execute(sql`select to_regclass('public.leads') as leads`)).rows).toEqual([{ leads: null }]);
  expect((await connection.db.execute(sql`select email from accounts`)).rows).toEqual([{ email: "kept@example.test" }]);
  await connection.db.execute(sql`insert into accounts (email, name, google_id) values (' New@Example.test ', 'New', 'google-new')`);
  expect((await connection.db.execute(sql`select email from accounts order by email`)).rows)
    .toEqual([{ email: "kept@example.test" }, { email: "new@example.test" }]);
});
