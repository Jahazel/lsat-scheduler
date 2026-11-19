import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createAppTestDatabase } from "./appTestDatabase";

let database: Awaited<ReturnType<typeof createAppTestDatabase>> | undefined;
let checkSql: string;

beforeAll(async () => {
  database = await createAppTestDatabase();
  checkSql = await readFile("sql/production-grant-check.sql", "utf8");
});

afterAll(async () => {
  await database?.cleanup();
});

function ready() {
  if (!database) throw new Error("App test database setup did not finish.");
  return database;
}

async function runCheck() {
  const { owner, role } = ready();
  return owner.transaction(async (tx) => {
    await tx.execute(sql`set transaction read only`);
    await tx.execute(sql`select set_config('drillmap.app_role', ${role}, true)`);
    const result = await tx.execute(sql.raw(checkSql));
    return Object.fromEntries(result.rows.map((row) => [row.check_name, row.refused]));
  });
}

const everyPowerRefused = {
  "set the role of an Account": true,
  "insert an Account with a role": true,
  "set the disabled time": true,
  "insert an Account with a disabled time": true,
  "change the Google ID": true,
  "act as another role": true,
  "administration rights": true,
};

it("shows that the app login can give no Admin role and change no disabled time or Google ID, inside a read-only transaction", async () => {
  expect(await runCheck()).toEqual(everyPowerRefused);
});

it("names each power the app login wrongly holds", async () => {
  const { owner, role, restoreGrants } = ready();
  try {
    await owner.execute(sql`grant update on table public.accounts to ${sql.identifier(role)}`);
    await owner.execute(sql`grant insert (role) on table public.accounts to ${sql.identifier(role)}`);
    await owner.execute(sql`grant pg_read_all_data to ${sql.identifier(role)}`);
    expect(await runCheck()).toEqual({
      ...everyPowerRefused,
      "set the role of an Account": false,
      "insert an Account with a role": false,
      "set the disabled time": false,
      "change the Google ID": false,
      "act as another role": false,
    });
  } finally {
    await owner.execute(sql`revoke pg_read_all_data from ${sql.identifier(role)}`);
    await restoreGrants();
  }
  expect(await runCheck()).toEqual(everyPowerRefused);
});
