import { afterAll, expect, it } from "vitest";
import { pgTable, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { closePostgresDatabase, getPostgresDatabase } from "../../src/lib/postgres";

const writes = pgTable("transaction_probe", { value: integer("value").notNull() });
afterAll(closePostgresDatabase);

it("rolls back failed writes through the shared connection and commits successful writes", async () => {
  const db = getPostgresDatabase();
  expect(await db.select({ encrypted: sql<boolean>`(select ssl from pg_stat_ssl where pid = pg_backend_pid())` })
    .from(sql`(select 1) as probe`)).toEqual([{ encrypted: false }]);
  await db.execute(sql`create table transaction_probe (value integer not null)`);
  try {
    await expect(db.transaction(async (tx) => {
      await tx.insert(writes).values({ value: 7 });
      await tx.insert(writes).values({ value: 8 });
      throw new Error("stop this transaction");
    })).rejects.toThrow("stop this transaction");
    expect(await db.select().from(writes)).toEqual([]);
    await db.transaction(async (tx) => {
      await tx.insert(writes).values({ value: 9 });
    });
    expect(await db.select().from(writes)).toEqual([{ value: 9 }]);
  } finally {
    await db.execute(sql`drop table transaction_probe`);
  }
});
