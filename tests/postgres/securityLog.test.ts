import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { setUpAppTestDatabase } from "./appTestDatabase";
import { isAccountId } from "../../src/lib/accountRepository";
import { hashPassword } from "../../src/lib/passwordHash";
import { deleteAccount, logIn, requestPasswordReset, type PasswordRequest } from "../../src/lib/passwordAccount";
import { recordSecurityEvent, type SecurityEntry, type SecurityEvent } from "../../src/lib/securityLog";

const MAYA = "maya.chen@fastmail.com";
const PASSWORD = "correct horse battery staple";

const { originalSecret } = vi.hoisted(() => {
  const originalSecret = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "security-log-test-secret-0123456789";
  return { originalSecret };
});

const database = setUpAppTestDatabase();
let passwordHash: string;
beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});
beforeEach(async () => {
  await database.owner.execute(sql`truncate accounts, action_counters, security_log cascade`);
  await database.owner.execute(sql`update scan_settings set scanning_off = false`);
  await database.owner.execute(sql`truncate security_log`);
});
afterAll(() => {
  process.env.AUTH_SECRET = originalSecret;
});

const request: PasswordRequest = { route: "/login", ipAddress: "203.0.113.9", realNow: new Date() };
const entries = async () => (await database.owner.execute(sql`
  select event, result, route, account_id, ip_address, email_hash, error_code from security_log order by logged_at, event
`)).rows;

async function passwordAccount() {
  const [row] = (await database.owner.execute<{ id: string }>(sql`
    insert into accounts (email, name, password_hash) values (${MAYA}, 'Maya Chen', ${passwordHash}) returning id
  `)).rows;
  if (!isAccountId(row?.id)) throw new Error("The fixture should make an Account ID.");
  return row.id;
}

it("records a sign-in with the Account ID and IP address, and an unknown email only as a hash", async () => {
  const id = await passwordAccount();
  expect((await logIn({ email: MAYA, password: PASSWORD }, request)).kind).toBe("signedIn");
  expect((await logIn({ email: "nobody@fastmail.com", password: PASSWORD }, request)).kind).toBe("refused");

  const [signedIn, unknown] = await entries();
  expect(signedIn).toEqual({
    event: "sign_in", result: "signedIn", route: "/login", account_id: id, ip_address: "203.0.113.9", email_hash: null, error_code: null,
  });
  expect(unknown).toMatchObject({ event: "sign_in", result: "wrongEmailOrPassword", account_id: null });
  expect(unknown.email_hash).toMatch(/^[0-9a-f]{64}$/);
  const everything = JSON.stringify(await entries());
  expect(everything).not.toContain("fastmail.com");
  expect(everything).not.toContain(PASSWORD);
});

it("records the limit that paused a sign-in beside the paused sign-in", async () => {
  const id = await passwordAccount();
  for (let i = 0; i < 11; i++) await logIn({ email: MAYA, password: "a wrong password" }, request);

  const rows = await entries();
  expect(rows.filter((row) => row.event === "limit_refused")).toEqual([
    expect.objectContaining({ result: "failedLoginForEmail", account_id: id, email_hash: null }),
  ]);
  expect(rows.filter((row) => row.event === "sign_in").map((row) => row.result)).toEqual([...Array(10).fill("wrongEmailOrPassword"), "paused"]);
});

it("keeps a deleted Account's entries for 90 days but empties their Account ID", async () => {
  const id = await passwordAccount();
  await logIn({ email: MAYA, password: PASSWORD }, request);
  const deletion = { ...request, route: "/account" as const };
  expect(await deleteAccount(id, { confirmation: "DELETE", currentPassword: PASSWORD, signedInAt: undefined }, deletion)).toBe("deleted");

  expect(await entries()).toEqual([
    expect.objectContaining({ event: "sign_in", result: "signedIn", account_id: null }),
    expect.objectContaining({ event: "account_deletion", result: "deleted", route: "/account", account_id: null, ip_address: "203.0.113.9" }),
  ]);
});

it("records each Admin role change and emergency switch change from any path, and nothing for a change to the same value", async () => {
  const account = await database.createAccountAsOwner({ email: "admin@example.test", name: "Admin" });
  const id = account?.id;
  await database.owner.execute(sql`update accounts set role = 'admin' where id = ${id}`);
  await database.owner.execute(sql`update accounts set role = 'admin' where id = ${id}`);
  await database.owner.execute(sql`update scan_settings set scanning_off = true`);
  await database.owner.execute(sql`update scan_settings set scanning_off = true`);
  await database.owner.execute(sql`update scan_settings set scanning_off = false`);

  expect((await entries()).map(({ event, result, account_id, route }) => ({ event, result, account_id, route }))).toEqual([
    { event: "admin_role_change", result: "promoted", account_id: id, route: null },
    { event: "emergency_switch", result: "turnedOn", account_id: null, route: null },
    { event: "emergency_switch", result: "turnedOff", account_id: null, route: null },
  ]);
});

it("does not break the action when an entry cannot be written, and keeps an odd IP address or route out of the table", async () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  await recordSecurityEvent({
    event: "admin_action_refused", result: "refused", route: "/admin/test", who: { account: "not-an-id" }, ipAddress: "1.2.3.4, 5.6.7.8",
  });
  await recordSecurityEvent({
    event: "admin_action_refused", result: "refused", route: "/admin/test?token=abc", who: { nobody: true }, ipAddress: "unknown",
  });

  expect(await entries()).toEqual([
    expect.objectContaining({ route: "/admin/test", account_id: null, ip_address: "unknown" }),
  ]);
  expect(error).toHaveBeenCalledWith(expect.stringMatching(/^Security log write failed \(admin_action_refused\): /));
  error.mockRestore();
});

it("accepts every event the app can record, and refuses an event name it does not know", async () => {
  const sample: { [E in SecurityEvent]: Extract<SecurityEntry, { event: E }>["result"] } = {
    sign_in: "signedIn", sign_out_all_devices: "done", email_verification: "verified", password_reset_request: "sent",
    password_reset: "changed", password_change: "changed", account_deletion: "deleted", student_data_refused: "refused",
    admin_action_refused: "refused", limit_refused: "scanInDay", budget_cutoff: "limitReached",
  };
  for (const [event, result] of Object.entries(sample)) {
    await recordSecurityEvent({ event, result, route: "/admin/students/[id]", who: { nobody: true } } as SecurityEntry);
  }
  expect((await entries()).map((row) => row.event).sort()).toEqual(Object.keys(sample).sort());
  await expect(database.owner.execute(sql`insert into security_log (event, result, route) values ('sign_inn', 'signedIn', '/login')`))
    .rejects.toMatchObject({ cause: { code: "23514" } });
});

it("keeps the Account ID on a too-long or paused sign-in for a known email", async () => {
  const id = await passwordAccount();
  await logIn({ email: MAYA, password: "x".repeat(80) }, request);
  expect(await entries()).toEqual([expect.objectContaining({ event: "sign_in", result: "tooLong", account_id: id, email_hash: null })]);
});

it("records every password reset request, with the Account ID when the email has an Account", async () => {
  vi.stubEnv("RESEND_API_KEY", "");
  const id = await passwordAccount();
  const reset = { ...request, route: "/forgot-password" as const };
  await requestPasswordReset(MAYA, reset);
  await requestPasswordReset("nobody@fastmail.com", reset);

  expect((await entries()).map(({ event, result, account_id }) => ({ event, result, account_id }))).toEqual([
    { event: "password_reset_request", result: "sent", account_id: id },
    { event: "password_reset_request", result: "noAccount", account_id: null },
  ]);
  vi.unstubAllEnvs();
});
