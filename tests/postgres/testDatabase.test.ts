import { afterEach, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { createPostgresTestDatabase } from "./testDatabase";
import { createPostgresConnection } from "../../src/lib/postgres";

afterEach(() => vi.unstubAllEnvs());

it("refuses non-local test databases before connecting", async () => {
  vi.stubEnv("DATABASE_URL", "postgresql://private-user:private-password@remote.example.net/drillmap?sslmode=verify-full");
  await expect(createPostgresTestDatabase()).rejects.toThrow("Postgres tests only run against loopback hosts.");
});

it("creates separate empty databases from migrations and removes them after use", async () => {
  const first = await createPostgresTestDatabase();
  const firstConnection = createPostgresConnection({ database: first.name });
  try {
    expect(await firstConnection.db.select({ count: sql<number>`(select count(*)::integer from drillmap_migrations.applied)` }).from(sql`(select 1) as probe`)).toEqual([{ count: 20 }]);
    await firstConnection.db.execute(sql`create table leftover_probe (value integer)`);
    const second = await createPostgresTestDatabase();
    const secondConnection = createPostgresConnection({ database: second.name });
    try {
      expect(second.name).not.toBe(first.name);
      expect(await secondConnection.db.select({
        leftover: sql<string | null>`to_regclass('public.leftover_probe')::text`,
        count: sql<number>`(select count(*)::integer from drillmap_migrations.applied)`,
      }).from(sql`(select 1) as probe`)).toEqual([{ leftover: null, count: 20 }]);
    } finally {
      await secondConnection.close();
      await second.cleanup();
    }
  } finally {
    await firstConnection.close();
    await first.cleanup();
  }
  const admin = createPostgresConnection({ database: "postgres" });
  try {
    expect(await admin.db.select({ exists: sql<boolean>`exists(select 1 from pg_database where datname = ${first.name})` }).from(sql`(select 1) as probe`)).toEqual([{ exists: false }]);
  } finally {
    await admin.close();
  }
});
