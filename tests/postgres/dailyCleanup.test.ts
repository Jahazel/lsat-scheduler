import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeEach, expect, it, vi } from "vitest";
import { GET } from "../../src/app/api/cron/daily-cleanup/route";
import { runDailyCleanup } from "../../src/lib/dailyCleanup";
import { getPostgresDatabase } from "../../src/lib/postgres";
import { setUpAppTestDatabase } from "./appTestDatabase";

vi.mock("../../src/lib/dailyCleanup", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/lib/dailyCleanup")>();
  return { ...actual, runDailyCleanup: vi.fn(actual.runDailyCleanup) };
});

const CRON_SECRET = "test-cron-secret-value";
const ROUTE = "http://localhost/api/cron/daily-cleanup";

const database = setUpAppTestDatabase();
const originalSecret = process.env.CRON_SECRET;

afterAll(() => {
  process.env.CRON_SECRET = originalSecret;
});

beforeEach(async () => {
  process.env.CRON_SECRET = CRON_SECRET;
  await database.owner.execute(sql`truncate accounts, pending_signups, security_log cascade`);
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
  await database.owner.execute(sql`
    insert into security_log (logged_at, event, route, error_code, error_type) values
      (now() - interval '91 days', 'unexpected_failure', '/api/cron/daily-cleanup', '00000091', 'Error'),
      (now() - interval '89 days', 'unexpected_failure', '/api/cron/daily-cleanup', '00000089', 'Error')
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
    securityLog: (await database.owner.execute<{ error_code: string }>(
      sql`select error_code from security_log order by error_code`,
    )).rows.map((row) => row.error_code),
  };
}

const everythingKept = {
  signups: ["fresh@example.test", "old@example.test"],
  resets: ["reset-expired", "reset-live"],
  securityLog: ["00000089", "00000091"],
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

it("removes pending signups older than 7 days, expired reset tokens, and security log entries older than 90 days", async () => {
  const response = await GET(cronRequest(`Bearer ${CRON_SECRET}`));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ securityLogRemoved: 1, pendingSignupsRemoved: 1, resetTokensRemoved: 1 });
  expect(await remainingRows()).toEqual({
    signups: ["fresh@example.test"],
    resets: ["reset-live"],
    securityLog: ["00000089"],
  });
});

it("gives the same result when the route runs twice", async () => {
  await GET(cronRequest(`Bearer ${CRON_SECRET}`));
  const second = await GET(cronRequest(`Bearer ${CRON_SECRET}`));
  expect(second.status).toBe(200);
  expect(await second.json()).toEqual({ securityLogRemoved: 0, pendingSignupsRemoved: 0, resetTokensRemoved: 0 });
  expect(await remainingRows()).toEqual({
    signups: ["fresh@example.test"],
    resets: ["reset-live"],
    securityLog: ["00000089"],
  });
});

it("answers a failed run with the plain message and a short code, and stores the same code in the security log", async () => {
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(runDailyCleanup).mockRejectedValueOnce(new TypeError("secret-token-value in the message"));
  const response = await GET(cronRequest(`Bearer ${CRON_SECRET}`));
  const body = await response.json();
  expect(response.status).toBe(500);
  expect(body).toEqual({ error: "Something went wrong. Try again.", code: expect.stringMatching(/^[0-9a-f]{8}$/) });
  const entries = await database.owner.execute(sql`
    select *, logged_at > now() - interval '1 minute' as recent from security_log where error_code = ${body.code}
  `);
  expect(entries.rows).toEqual([{
    id: expect.any(String),
    logged_at: expect.anything(),
    recent: true,
    event: "unexpected_failure",
    route: "/api/cron/daily-cleanup",
    error_code: body.code,
    error_type: "TypeError",
  }]);
  expect(logged).toHaveBeenCalledWith(expect.stringContaining(body.code));
  logged.mockRestore();
});

it("still answers with the code when the security log write fails", async () => {
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(runDailyCleanup).mockRejectedValueOnce(new Error("database down"));
  await database.owner.execute(sql`revoke insert on security_log from ${sql.identifier(database.role)}`);
  try {
    const response = await GET(cronRequest(`Bearer ${CRON_SECRET}`));
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Something went wrong. Try again.", code: expect.stringMatching(/^[0-9a-f]{8}$/) });
    expect(logged).toHaveBeenCalledWith(expect.stringContaining(`Security log write failed (${body.code})`));
  } finally {
    await database.owner.execute(sql`
      grant insert (event, route, error_code, error_type) on security_log to ${sql.identifier(database.role)}
    `);
    logged.mockRestore();
  }
});
