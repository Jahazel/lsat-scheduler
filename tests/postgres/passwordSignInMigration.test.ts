import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createPostgresConnection } from "../../src/lib/postgres";
import { migrateUpTo } from "./partialMigrations";
import { createPostgresTestDatabase } from "./testDatabase";

const exec = promisify(execFile);

let database: Awaited<ReturnType<typeof createPostgresTestDatabase>>;
let connection: ReturnType<typeof createPostgresConnection>;
let migrateRest: () => Promise<void>;

beforeEach(async () => {
  database = await createPostgresTestDatabase();
  connection = createPostgresConnection({ database: database.name });
  migrateRest = await migrateUpTo(connection.db, "0012_password_sign_in");
});

afterEach(async () => {
  await connection.close();
  await database.cleanup();
});

const accountRows = () => connection.db.execute(sql`
  select email, password_hash, google_id, role from accounts order by email
`).then(({ rows }) => rows);

it("clears unused password hashes on Google Accounts and keeps every Account", async () => {
  await connection.db.execute(sql`
    insert into accounts (email, name, password_hash, google_id, role) values
      ('admin@example.test', 'Admin', 'old-admin-hash', 'google-admin', 'admin'),
      ('google@example.test', 'Google', null, 'google-only', 'student'),
      ('old@example.test', 'Old', 'old-hash', 'google-old', 'student')
  `);

  await migrateRest();

  expect(await accountRows()).toEqual([
    { email: "admin@example.test", password_hash: null, google_id: "google-admin", role: "admin" },
    { email: "google@example.test", password_hash: null, google_id: "google-only", role: "student" },
    { email: "old@example.test", password_hash: null, google_id: "google-old", role: "student" },
  ]);
});

it.each([
  { case: "a password and no Google ID", passwordHash: "old-hash" },
  { case: "no sign-in method", passwordHash: null },
])("stops with a clear error and changes nothing when an Account has $case", async ({ passwordHash }) => {
  await connection.db.execute(sql`
    insert into accounts (email, name, password_hash, google_id) values
      ('stuck@example.test', 'Stuck', ${passwordHash}, null),
      ('google@example.test', 'Google', 'old-hash', 'google-id')
  `);

  const refused = await exec(process.execPath, ["--import", "tsx", "scripts/migrate-postgres.mts"], {
    env: { ...process.env, DATABASE_URL: database.setting },
  }).then(() => null, (error: { code: number; stderr: string }) => error);
  expect(refused).toMatchObject({
    code: 1,
    stderr: "An Account has no Google ID. Each Account needs exactly one sign-in method, so the owner decides by hand"
      + " what happens to it. This migration deletes no Account. Stop.\n",
  });

  expect(await accountRows()).toEqual([
    { email: "google@example.test", password_hash: "old-hash", google_id: "google-id", role: "student" },
    { email: "stuck@example.test", password_hash: passwordHash, google_id: null, role: "student" },
  ]);
  expect((await connection.db.execute(sql`select to_regclass('public.pending_signups') as pending_signups`)).rows)
    .toEqual([{ pending_signups: null }]);
});
