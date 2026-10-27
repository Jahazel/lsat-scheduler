import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { GET } from "../../src/app/api/cron/daily-cleanup/route";
import { runDailyCleanup } from "../../src/lib/dailyCleanup";
import { closePostgresDatabase, getPostgresDatabase } from "../../src/lib/postgres";
import { createAppTestDatabase } from "./appTestDatabase";

vi.mock("../../src/lib/dailyCleanup", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/lib/dailyCleanup")>();
  return { ...actual, runDailyCleanup: vi.fn(actual.runDailyCleanup) };
});

const CRON_SECRET = "test-cron-secret-value";
const ROUTE = "http://localhost/api/cron/daily-cleanup";

let database: Awaited<ReturnType<typeof createAppTestDatabase>>;
const originalSetting = process.env.DATABASE_URL;
const originalSecret = process.env.CRON_SECRET;

beforeAll(async () => {
  await closePostgresDatabase();
  database = await createAppTestDatabase();
  process.env.DATABASE_URL = database.setting;
});

afterAll(async () => {
  await closePostgresDatabase();
  process.env.DATABASE_URL = originalSetting;
  process.env.CRON_SECRET = originalSecret;
  await database?.cleanup();
});

beforeEach(async () => {
  process.env.CRON_SECRET = CRON_SECRET;
  await database.owner.execute(sql`truncate accounts, pending_signups cascade`);
  await database.owner.execute(sql`
    insert into pending_signups (email, name, password_hash, token_hash, token_expires_at, created_at) values
      ('old@example.test', 'Old', 'hash', 'token-old', now() + interval '1 day', now() - interval '8 days'),
      ('fresh@example.test', 'Fresh', 'hash', 'token-fresh', now() + interval '1 day', now() - interval '6 days')
  `);
  const account = await database.createAccountAsOwner({ email: "reset@example.test", name: "Reset" });
  const second = await database.createAccountAsOwner({ email: "live@example.test", name: "Live" });
  if (!account || !second) throw new Error("Account fixture already exists");
  await database.owner.execute(sql`
    insert into reset_tokens (account_id, token_hash, expires_at) values
      (${account.id}, 'reset-expired', now() - interval '1 hour'),
      (${second.id}, 'reset-live', now() + interval '1 hour')
  `);
});

function cronRequest(authorization?: string) {
  return new NextRequest(ROUTE, { headers: authorization ? { authorization } : {} });
}

async function remainingRows() {
  const db = getPostgresDatabase();
  const signups = await db.execute<{ email: string }>(sql`select email from pending_signups order by email`);
  const resets = await db.execute<{ token_hash: string }>(sql`select token_hash from reset_tokens order by token_hash`);
  return {
    signups: signups.rows.map((row) => row.email),
    resets: resets.rows.map((row) => row.token_hash),
  };
}

const everythingKept = {
  signups: ["fresh@example.test", "old@example.test"],
  resets: ["reset-expired", "reset-live"],
};

it("refuses a call without the cron secret and changes nothing", async () => {
  for (const authorization of [undefined, "Bearer wrong-secret", `Basic ${CRON_SECRET}`, `Bearer ${CRON_SECRET}x`]) {
    const response = await GET(cronRequest(authorization));
    expect(response.status).toBe(401);
  }
  expect(await remainingRows()).toEqual(everythingKept);
});

it("refuses every call when the place has no cron secret set", async () => {
  delete process.env.CRON_SECRET;
  const response = await GET(cronRequest("Bearer "));
  expect(response.status).toBe(401);
  expect(await remainingRows()).toEqual(everythingKept);
});

it("removes pending signups older than 7 days and expired reset tokens, and keeps newer ones", async () => {
  const response = await GET(cronRequest(`Bearer ${CRON_SECRET}`));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ pendingSignupsRemoved: 1, resetTokensRemoved: 1 });
  expect(await remainingRows()).toEqual({
    signups: ["fresh@example.test"],
    resets: ["reset-live"],
  });
});

it("gives the same result when the route runs twice", async () => {
  await GET(cronRequest(`Bearer ${CRON_SECRET}`));
  const second = await GET(cronRequest(`Bearer ${CRON_SECRET}`));
  expect(second.status).toBe(200);
  expect(await second.json()).toEqual({ pendingSignupsRemoved: 0, resetTokensRemoved: 0 });
  expect(await remainingRows()).toEqual({
    signups: ["fresh@example.test"],
    resets: ["reset-live"],
  });
});

it("answers a failed run with the plain message and a short code, and logs the same code", async () => {
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(runDailyCleanup).mockRejectedValueOnce(new Error("database down"));
  const response = await GET(cronRequest(`Bearer ${CRON_SECRET}`));
  const body = await response.json();
  expect(response.status).toBe(500);
  expect(body).toEqual({ error: "Something went wrong. Try again.", code: expect.stringMatching(/^[0-9a-f]{8}$/) });
  expect(logged).toHaveBeenCalledWith(expect.stringContaining(`Daily cleanup failed (${body.code}): Error`));
  logged.mockRestore();
});
