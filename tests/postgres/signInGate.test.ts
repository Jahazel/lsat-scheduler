import { sql } from "drizzle-orm";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { accountIdSchema, findAccountByGoogleId, markGoogleAccountDeleting } from "../../src/lib/accountRepository";
import { admitAccount } from "../../src/lib/signInGate";
import { setUpAppTestDatabase } from "./appTestDatabase";

const database = setUpAppTestDatabase();
const ROUTE = "/login";
const NOW = new Date("2026-11-02T12:00:00Z");

beforeEach(async () => {
  vi.stubEnv("AUTH_SECRET", "x".repeat(32));
  await database.owner.execute(sql`truncate accounts, deletion_list, security_log cascade`);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

async function account(email: string, { disabled = false, deleting = false } = {}) {
  const created = await database.createAccountAsOwner({ email, name: email });
  if (!created) throw new Error("Account fixture already exists");
  if (disabled) await database.owner.execute(sql`update accounts set disabled_at = now() where id = ${created.id}::uuid`);
  if (deleting && !(await markGoogleAccountDeleting(accountIdSchema.parse(created.id)))) throw new Error("Could not mark the Account");
  const found = await findAccountByGoogleId(`google-${email}`);
  if (!found) throw new Error("Account fixture is missing");
  return found;
}

async function stored(id: string) {
  const { rows } = await database.owner.execute<{ last_signed_in_at: string }>(
    sql`select last_signed_in_at from accounts where id = ${id}::uuid`,
  );
  return rows[0] ? new Date(rows[0].last_signed_in_at) : null;
}

async function whileAccountDeleteFails(work: () => Promise<void>) {
  await database.owner.execute(sql`create function reject_account_delete_test() returns trigger language plpgsql as
    'BEGIN RAISE EXCEPTION ''forced account delete failure''; END;'`);
  await database.owner.execute(sql`create trigger reject_account_delete_test before delete on accounts
    for each row execute function reject_account_delete_test()`);
  try {
    await work();
  } finally {
    await database.owner.execute(sql`drop trigger reject_account_delete_test on accounts`);
    await database.owner.execute(sql`drop function reject_account_delete_test()`);
  }
}

it("signs in an active Account and records the sign-in time", async () => {
  const active = await account("active@example.test");
  expect(await admitAccount(active, { route: ROUTE, realNow: NOW })).toBe("signedIn");
  expect(await stored(active.id)).toEqual(NOW);
});

it("refuses a Disabled Account and records no sign-in", async () => {
  const disabled = await account("disabled@example.test", { disabled: true });
  const before = await stored(disabled.id);
  expect(await admitAccount(disabled, { route: ROUTE, realNow: NOW })).toBe("accountDisabled");
  expect(await stored(disabled.id)).toEqual(before);
});

it("finishes a Deleting Account's deletion, also when it is Disabled", async () => {
  for (const disabled of [false, true]) {
    const deleting = await account(`deleting-${disabled}@example.test`, { disabled, deleting: true });
    expect(await admitAccount(deleting, { route: ROUTE, realNow: NOW })).toBe("accountDeleted");
    expect(await stored(deleting.id)).toBeNull();
  }
});

it("finishes the deletion when the mark lands after the Account was read", async () => {
  const read = await account("race@example.test");
  expect(await markGoogleAccountDeleting(read.id)).toBe(true);
  expect(await admitAccount(read, { route: ROUTE, realNow: NOW })).toBe("accountDeleted");
  expect(await stored(read.id)).toBeNull();
});

it("says deletion will finish when the deletion cannot finish now", async () => {
  const deleting = await account("stuck@example.test", { deleting: true });
  await whileAccountDeleteFails(async () => {
    expect(await admitAccount(deleting, { route: ROUTE, realNow: NOW })).toBe("deletionWillFinish");
  });
  expect(await stored(deleting.id)).not.toBeNull();
});
