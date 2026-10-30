import { sql } from "drizzle-orm";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createGoogleAccountOnSignIn } from "../../src/lib/authAccounts";
import { runDailyCleanup } from "../../src/lib/dailyCleanup";
import { clearFakeEmails, fakeEmails } from "../../src/lib/email";
import { emailHash } from "../../src/lib/emailHash";
import { logIn } from "../../src/lib/passwordAccount";
import { hashPassword } from "../../src/lib/passwordHash";
import { createStudent } from "../../src/lib/studentRepository";
import type { Student } from "../../src/lib/types";
import { setUpAppTestDatabase } from "./appTestDatabase";

const database = setUpAppTestDatabase();
const PASSWORD = "a long enough password";
const SIGNED_IN = new Date("2026-11-02T12:00:00Z");
const TWO_YEARS_LATER = new Date("2028-11-02T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const after = (from: Date, days: number) => new Date(from.getTime() + days * DAY);

const profile: Student = {
  currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
};

beforeEach(async () => {
  vi.stubEnv("AUTH_SECRET", "inactive-accounts-test-secret-0123456789");
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("VERCEL", "");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(SIGNED_IN);
  clearFakeEmails();
  await database.owner.execute(sql`truncate accounts, deletion_list, security_log cascade`);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

async function passwordStudent(email: string) {
  const account = await database.createAccountAsOwner({ email, name: "Pat", googleId: null, passwordHash: await hashPassword(PASSWORD) });
  if (!account) throw new Error("Account fixture already exists");
  const student = await createStudent(account.id, profile);
  if (!student) throw new Error("Student fixture already exists");
  return { accountId: account.id, studentId: student.id };
}

async function googleStudent(email: string) {
  const account = await database.createAccountAsOwner({ email, name: "Gale" });
  if (!account) throw new Error("Account fixture already exists");
  return account.id;
}

const passwordLogIn = (email: string) =>
  logIn({ email, password: PASSWORD }, { route: "/login", ipAddress: "203.0.113.1", realNow: new Date() });

const googleSignIn = (email: string) => createGoogleAccountOnSignIn({
  user: { email, name: email },
  account: { provider: "google", providerAccountId: `google-${email}`, type: "oidc" },
  profile: { sub: `google-${email}`, email, email_verified: true },
});

async function retention(accountId: string) {
  const { rows: [row] } = await database.owner.execute<{ last_signed_in_at: string; inactive_warning_sent_at: string | null }>(sql`
    select last_signed_in_at, inactive_warning_sent_at from accounts where id = ${accountId}::uuid
  `);
  return row ? {
    last_signed_in_at: new Date(row.last_signed_in_at),
    inactive_warning_sent_at: row.inactive_warning_sent_at === null ? null : new Date(row.inactive_warning_sent_at),
  } : null;
}

async function runAt(when: Date) {
  vi.setSystemTime(when);
  return runDailyCleanup();
}

const sentTo = () => fakeEmails().map((email) => email.to);

it("records the time of each Google and password sign-in", async () => {
  const pat = await passwordStudent("pat@example.test");
  const galeId = await googleStudent("gale@example.test");

  expect(await passwordLogIn("pat@example.test")).toMatchObject({ kind: "signedIn" });
  vi.setSystemTime(after(SIGNED_IN, 1));
  expect(await googleSignIn("gale@example.test")).toBe(true);

  expect((await retention(pat.accountId))?.last_signed_in_at).toEqual(SIGNED_IN);
  expect((await retention(galeId))?.last_signed_in_at).toEqual(after(SIGNED_IN, 1));
});

it("does not count a refused sign-in", async () => {
  const pat = await passwordStudent("pat@example.test");
  const galeId = await googleStudent("gale@example.test");
  await database.owner.execute(sql`update accounts set last_signed_in_at = ${SIGNED_IN}`);
  await database.owner.execute(sql`update accounts set disabled_at = now() where id = ${galeId}::uuid`);
  vi.setSystemTime(after(SIGNED_IN, 1));

  expect(await logIn({ email: "pat@example.test", password: "a wrong password here" }, {
    route: "/login", ipAddress: "203.0.113.1", realNow: new Date(),
  })).toMatchObject({ kind: "refused" });
  expect(await googleSignIn("gale@example.test")).not.toBe(true);

  expect((await retention(pat.accountId))?.last_signed_in_at).toEqual(SIGNED_IN);
  expect((await retention(galeId))?.last_signed_in_at).toEqual(SIGNED_IN);
});

it("sends one warning to an Account with no sign-in for 2 years, and only once", async () => {
  const pat = await passwordStudent("pat@example.test");
  await passwordLogIn("pat@example.test");

  expect(await runAt(after(TWO_YEARS_LATER, -1))).toMatchObject({ inactiveWarningsSent: 0 });
  expect(fakeEmails()).toEqual([]);

  expect(await runAt(TWO_YEARS_LATER)).toMatchObject({ inactiveWarningsSent: 1, inactiveWarningsNotSent: 0 });
  expect(await runAt(after(TWO_YEARS_LATER, 1))).toMatchObject({ inactiveWarningsSent: 0 });
  expect(await runAt(after(TWO_YEARS_LATER, 29))).toMatchObject({ inactiveWarningsSent: 0, inactiveAccountsMarked: 0 });

  expect(sentTo()).toEqual(["pat@example.test"]);
  expect(await retention(pat.accountId)).toEqual({ last_signed_in_at: SIGNED_IN, inactive_warning_sent_at: TWO_YEARS_LATER });
});

it("uses the email layout and links to Login", async () => {
  await passwordStudent("pat@example.test");
  await database.owner.execute(sql`update accounts set last_signed_in_at = ${SIGNED_IN}`);
  await runAt(TWO_YEARS_LATER);

  expect(fakeEmails()).toEqual([{
    to: "pat@example.test",
    subject: "Sign in to keep your DrillMap Account",
    text: [
      "Hi Pat,",
      "You have not signed in to DrillMap for 2 years. Sign in within 30 days to keep your Account:",
      "http://localhost:3000/login",
      "If you do not sign in by then, we will delete your Account and your study information. You do not need to do anything else.",
    ].join("\n\n"),
  }]);
});

it("tries the warning again on the next run when the email was not sent", async () => {
  const pat = await passwordStudent("pat@example.test");
  await database.owner.execute(sql`update accounts set last_signed_in_at = ${SIGNED_IN}`);
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("SITE_URL", "http://localhost:3000");

  expect(await runAt(TWO_YEARS_LATER)).toMatchObject({ inactiveWarningsSent: 0, inactiveWarningsNotSent: 1 });
  expect((await retention(pat.accountId))?.inactive_warning_sent_at).toBeNull();

  vi.stubEnv("VERCEL", "");
  vi.stubEnv("SITE_URL", "");
  logged.mockRestore();
  expect(await runAt(after(TWO_YEARS_LATER, 1))).toMatchObject({ inactiveWarningsSent: 1 });
  expect(sentTo()).toEqual(["pat@example.test"]);
  expect((await retention(pat.accountId))?.inactive_warning_sent_at).toEqual(after(TWO_YEARS_LATER, 1));
});

it("claims no warning when the place cannot build the email's link, after the rest of the cleanup", async () => {
  const pat = await passwordStudent("pat@example.test");
  await database.owner.execute(sql`update accounts set last_signed_in_at = ${SIGNED_IN}`);
  await database.owner.execute(sql`
    insert into deletion_list (account_id, email_hash, deleted_on) values ('00000000-0000-4000-8000-000000000031', repeat('a', 64), current_date - 31)
  `);
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("SITE_URL", "");

  await expect(runAt(TWO_YEARS_LATER)).rejects.toThrow("SITE_URL is not set");

  expect((await retention(pat.accountId))?.inactive_warning_sent_at).toBeNull();
  expect((await database.owner.execute(sql`select account_id from deletion_list`)).rows).toEqual([]);
  expect(fakeEmails()).toEqual([]);
});

it("deletes the Account 30 days after the warning with no sign-in, with its deletion list row", async () => {
  const pat = await passwordStudent("pat@example.test");
  const keptId = await googleStudent("kept@example.test");
  await database.owner.execute(sql`update accounts set last_signed_in_at = ${SIGNED_IN}`);
  await database.owner.execute(sql`update accounts set last_signed_in_at = ${after(SIGNED_IN, 10)} where id = ${keptId}::uuid`);
  await runAt(TWO_YEARS_LATER);

  expect(await runAt(after(TWO_YEARS_LATER, 30))).toMatchObject({
    inactiveAccountsMarked: 1, accountDeletionsFinished: 1, accountDeletionsLeft: 0,
  });

  expect(await retention(pat.accountId)).toBeNull();
  const { rows: students } = await database.owner.execute(sql`select id from students where id = ${pat.studentId}::uuid`);
  expect(students).toEqual([]);
  const { rows: listed } = await database.owner.execute(sql`select account_id, email_hash from deletion_list`);
  expect(listed).toEqual([{ account_id: pat.accountId, email_hash: emailHash("pat@example.test") }]);
  expect(await retention(keptId)).toEqual({
    last_signed_in_at: after(SIGNED_IN, 10), inactive_warning_sent_at: after(TWO_YEARS_LATER, 30),
  });
  expect(sentTo()).toEqual(["pat@example.test", "kept@example.test"]);
});

it("keeps an Account that signs in after the warning", async () => {
  const pat = await passwordStudent("pat@example.test");
  const galeId = await googleStudent("gale@example.test");
  await database.owner.execute(sql`update accounts set last_signed_in_at = ${SIGNED_IN}`);
  await runAt(TWO_YEARS_LATER);

  vi.setSystemTime(after(TWO_YEARS_LATER, 29));
  expect(await passwordLogIn("pat@example.test")).toMatchObject({ kind: "signedIn" });
  expect(await googleSignIn("gale@example.test")).toBe(true);

  expect(await runAt(after(TWO_YEARS_LATER, 30))).toMatchObject({
    inactiveAccountsMarked: 0, accountDeletionsFinished: 0, inactiveWarningsSent: 0,
  });
  for (const id of [pat.accountId, galeId]) {
    expect(await retention(id)).toEqual({ last_signed_in_at: after(TWO_YEARS_LATER, 29), inactive_warning_sent_at: null });
  }
  const { rows: listed } = await database.owner.execute(sql`select account_id from deletion_list`);
  expect(listed).toEqual([]);
  expect(sentTo()).toEqual(["pat@example.test", "gale@example.test"]);
});
