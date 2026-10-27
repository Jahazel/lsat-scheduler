import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { renderToStaticMarkup } from "react-dom/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import type { Session } from "next-auth";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppTestDatabase } from "./appTestDatabase";
import { closePostgresDatabase, getPostgresDatabase } from "../../src/lib/postgres";
import { findAccountByEmail } from "../../src/lib/accountRepository";
import { createGoogleAccountOnSignIn } from "../../src/lib/authAccounts";
import { accountSessionToken } from "../../src/lib/accountSession";
import { findStudentByAccountId } from "../../src/lib/studentRepository";
import type { Student } from "../../src/lib/types";

interface RequestState {
  session: Session | null;
  signIn: ReturnType<typeof vi.fn<(provider: string, values: Record<string, unknown>) => Promise<void>>>;
}
const request = vi.hoisted((): RequestState => ({
  session: null,
  signIn: vi.fn(),
}));
vi.mock("@/auth", () => ({
  auth: async () => request.session,
  signIn: request.signIn,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

import { signInWithGoogle } from "../../src/app/login/actions";
import { createStudentProfile } from "../../src/app/onboarding/actions";
import { updateStudentProfile } from "../../src/app/account/actions";
import AccountPage from "../../src/app/account/page";
import OnboardingPage from "../../src/app/onboarding/page";
import { requireCurrentAdmin } from "../../src/lib/requireAdmin";
import { postgresAdminClock, studentSideClock } from "../../src/lib/studentClock";
import { loadStudentNavState } from "../../src/lib/studentNav";

let database: Awaited<ReturnType<typeof createAppTestDatabase>>;
const originalSetting = process.env.DATABASE_URL;
beforeAll(async () => {
  await closePostgresDatabase();
  database = await createAppTestDatabase();
  process.env.DATABASE_URL = database.setting;
});
beforeEach(async () => {
  request.session = null;
  request.signIn.mockClear();
  await database.owner.execute(sql`truncate accounts, leads cascade`);
});
afterAll(async () => {
  await closePostgresDatabase();
  process.env.DATABASE_URL = originalSetting;
  await database?.cleanup();
});

async function onboard() {
  await expect(createStudentProfile(profileInput)).rejects.toThrow("redirect:/dashboard");
}

async function studentRows() {
  return (await getPostgresDatabase().execute(sql`select * from students`)).rows;
}

function makeAdmin(email: string) {
  return promisify(execFile)("npm", ["run", "make-admin", "--", email], {
    env: { ...process.env, DATABASE_URL: database.ownerSetting }, timeout: 15000,
  });
}

async function leftoverPasswordAccount(email: string) {
  await database.owner.execute(sql`insert into accounts (email, name, password_hash)
    values (${email}, 'Password Person', '$2b$10$fixturefixturefixturefixturefixturefixturefixturefix')`);
}
const profile: Student = {
  currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 105, WEDNESDAY: 120, THURSDAY: 135, FRIDAY: 150, SATURDAY: 165, SUNDAY: 180 },
};
const profileInput = { ...profile, officialAttempts: [], analyticsRows: [], analyticsApproval: null };
async function account(email: string, role: "student" | "admin" = "student") {
  const created = await database.createAccountAsOwner({ email, name: email, role });
  if (!created) throw new Error("Fixture Account already exists.");
  return { ...created, email, name: email };
}
function session(user: NonNullable<Session["user"]>) {
  request.session = { user, expires: "2099-01-01T00:00:00.000Z" };
}

it("runs application queries as the SQL-created limited app role", async () => {
  expect((await getPostgresDatabase().execute(sql`select current_user, session_user`)).rows)
    .toEqual([{ current_user: database.role, session_user: database.role }]);
});

function googleSignIn(id: string, email: string, profile: Record<string, unknown> = { email_verified: true }) {
  return createGoogleAccountOnSignIn({
    user: { email, name: "Google Person" },
    account: { provider: "google", providerAccountId: id, type: "oidc" },
    profile: { sub: id, email, ...profile },
  });
}
function googleToken(id: string, email: string) {
  return accountSessionToken({
    token: {}, user: { email },
    account: { provider: "google", providerAccountId: id, type: "oidc" },
  });
}
async function accountRows() {
  return (await database.owner.execute(sql`select email, role, google_id, password_hash is not null as has_password
    from accounts order by email`)).rows;
}

it("Google first sign-in creates one student Account with a verified email and keeps it on repeat", async () => {
  expect(await googleSignIn("google-1", "GOOGLE@example.test")).toBe(true);
  expect(await googleSignIn("google-1", "GOOGLE@example.test")).toBe(true);
  expect(await accountRows()).toEqual([{ email: "google@example.test", role: "student", google_id: "google-1", has_password: false }]);
  const saved = await findAccountByEmail("google@example.test");
  expect(saved).toMatchObject({ name: "Google Person" });
  expect(await googleToken("google-1", "google@example.test")).toMatchObject({ id: saved?.id, role: "student" });
});

it.each([
  ["an unverified email", { email_verified: false }],
  ["a missing verification claim", {}],
  ["a string verification claim", { email_verified: "true" }],
])("Google sign-in refuses %s and creates no Account", async (_name, profile) => {
  expect(await googleSignIn("google-1", "google@example.test", profile)).toBe(false);
  expect(await accountRows()).toEqual([]);
});

it("Google sign-in refuses a missing email or stable ID", async () => {
  const account = { provider: "google", providerAccountId: "google-1", type: "oidc" as const };
  expect(await createGoogleAccountOnSignIn({ user: {}, account, profile: { email_verified: true } })).toBe(false);
  expect(await createGoogleAccountOnSignIn({
    user: { email: "google@example.test" }, account: { ...account, providerAccountId: "" }, profile: { email_verified: true },
  })).toBe(false);
  expect(await accountRows()).toEqual([]);
});

it("Google sign-in cannot take over a password Account or another Google Account by email", async () => {
  await leftoverPasswordAccount("password@example.test");
  expect(await googleSignIn("google-attacker", "Password@example.test")).toBe(false);
  expect(await googleSignIn("google-1", "owner@example.test")).toBe(true);
  expect(await googleSignIn("google-2", "OWNER@example.test")).toBe(false);
  expect(await accountRows()).toEqual([
    { email: "owner@example.test", role: "student", google_id: "google-1", has_password: false },
    { email: "password@example.test", role: "student", google_id: null, has_password: true },
  ]);
});

it("a password Account cannot sign in through Google or without a provider", async () => {
  await leftoverPasswordAccount("password@example.test");
  const saved = await findAccountByEmail("password@example.test");
  const user = { id: saved?.id, email: "password@example.test" };
  expect(await createGoogleAccountOnSignIn({ user, account: null })).toBe(false);
  expect(await accountSessionToken({ token: {}, user, account: null })).toBeNull();
  expect(await googleSignIn("google-1", "password@example.test")).toBe(false);
  expect(await accountRows()).toEqual([{ email: "password@example.test", role: "student", google_id: null, has_password: true }]);
});

it("a changed Google email opens the same Account and leaves its DrillMap email alone", async () => {
  expect(await googleSignIn("google-1", "old@example.test")).toBe(true);
  const saved = await findAccountByEmail("old@example.test");
  expect(await googleSignIn("google-1", "new@example.test")).toBe(true);
  expect(await googleToken("google-1", "new@example.test")).toMatchObject({ id: saved?.id, role: "student" });
  expect(await accountRows()).toEqual([{ email: "old@example.test", role: "student", google_id: "google-1", has_password: false }]);
});

it("a changed Google email cannot open a different Account that already has the new email", async () => {
  expect(await googleSignIn("google-1", "first@example.test")).toBe(true);
  expect(await googleSignIn("google-2", "second@example.test")).toBe(true);
  expect(await googleSignIn("google-1", "second@example.test")).toBe(true);
  const first = await findAccountByEmail("first@example.test");
  expect(await googleToken("google-1", "second@example.test")).toMatchObject({ id: first?.id });
});

it("concurrent first Google sign-ins create one Account and never join identities", async () => {
  expect(await Promise.all([googleSignIn("google-1", "same@example.test"), googleSignIn("google-1", "same@example.test")]))
    .toEqual([true, true]);
  const raced = await Promise.all([googleSignIn("google-a", "race@example.test"), googleSignIn("google-b", "race@example.test")]);
  expect(raced.filter(Boolean)).toHaveLength(1);
  const rows = await accountRows();
  expect(rows).toHaveLength(2);
  expect(rows.filter((row) => row.email === "race@example.test")).toHaveLength(1);
});

it("the Google callback never grants the Admin role", async () => {
  const account = { provider: "google", providerAccountId: "google-1", type: "oidc" as const };
  expect(await createGoogleAccountOnSignIn({
    user: { email: "claim@example.test", role: "admin" }, account, profile: { email_verified: true, role: "admin" },
  })).toBe(true);
  expect((await accountRows()).map((row) => row.role)).toEqual(["student"]);
});

it("owner Admin grant needs a Google identity, and a fresh Google sign-in opens Admin access", async () => {
  await leftoverPasswordAccount("admin@example.test");
  const refused = await makeAdmin("admin@example.test").then(() => null, (error: unknown) => error);
  expect(refused).toMatchObject({ code: 1, stderr: expect.stringContaining("has not signed in with Google") });
  expect((await accountRows())[0]).toMatchObject({ role: "student", has_password: true });

  await database.owner.execute(sql`
    update accounts set google_id = 'google-admin', password_hash = null where email = 'admin@example.test'
  `);
  const before = await findAccountByEmail("admin@example.test");
  expect(await googleToken("google-admin", "admin@example.test")).toMatchObject({ id: before?.id, role: "student" });
  expect((await makeAdmin(" ADMIN@example.test ")).stdout).toContain("Made admin@example.test an admin");

  expect(await googleSignIn("google-admin", "renamed@gmail.test")).toBe(true);
  expect(await googleToken("google-admin", "renamed@gmail.test")).toMatchObject({ id: before?.id, role: "admin" });
  expect(await accountRows()).toEqual([{ email: "admin@example.test", role: "admin", google_id: "google-admin", has_password: false }]);
  expect((await makeAdmin("admin@example.test")).stdout).toContain("already an admin");
});

describe.each(["student-a", "student-b", "admin", "no-session"] as const)("%s calls the same profile actions", (actor) => {
  it("creates and updates only the session owner's Study settings", async () => {
    const a = await account("a@example.test");
    const b = await account("b@example.test");
    const admin = await account("admin@example.test", "admin");
    const actors = { "student-a": a, "student-b": b, admin };
    if (actor === "no-session") {
      await expect(createStudentProfile(profileInput)).rejects.toThrow("Not authenticated");
      await expect(updateStudentProfile(profileInput)).rejects.toThrow("Not authenticated");
      expect((await getPostgresDatabase().execute(sql`select id from students`)).rows).toEqual([]);
      return;
    }
    const owner = actors[actor];
    session(owner);
    await onboard();
    await onboard();
    expect(await findStudentByAccountId(owner.id)).toMatchObject(profile);
    expect((await getPostgresDatabase().execute(sql`select account_id from students`)).rows).toEqual([{ account_id: owner.id }]);
    await expect(updateStudentProfile({ ...profileInput, goalScore: 170 })).rejects.toThrow("redirect:/dashboard");
    expect(await findStudentByAccountId(owner.id)).toMatchObject({ goalScore: 170, dailyCapacityMinutes: profile.dailyCapacityMinutes });
    for (const other of [a, b, admin].filter((entry) => entry.id !== owner.id)) {
      expect(await findStudentByAccountId(other.id)).toBeNull();
    }
  });
});

it("Study settings keep another student's profile and the saved Weekly schedule unchanged", async () => {
  const a = await account("a@example.test");
  const b = await account("b@example.test");
  for (const owner of [a, b]) {
    session(owner);
    await onboard();
  }
  const student = await findStudentByAccountId(a.id);
  if (!student) throw new Error("Onboarding did not create a student.");
  await getPostgresDatabase().execute(sql`insert into weekly_schedules
    (student_id, week_start_date, generated_at, schedule, source_snapshot_ids, generation_inputs, policy_version)
    values (${student.id}, '2026-10-12', now(), '{"preserved":true}', '{}', '{}', 'test-policy')`);
  const before = await getPostgresDatabase().execute(sql`select * from weekly_schedules`);
  session(a);
  await expect(updateStudentProfile({ ...profileInput, goalScore: 172 })).rejects.toThrow("redirect:/dashboard");
  expect(await findStudentByAccountId(b.id)).toMatchObject({ goalScore: 165 });
  expect((await getPostgresDatabase().execute(sql`select * from weekly_schedules`)).rows).toEqual(before.rows);
  expect(await loadStudentNavState(a.id, new Date("2026-10-15T12:00:00Z"))).toMatchObject({ hasCurrentWeek: true, uploadNeeded: false });
  expect(await loadStudentNavState(b.id, new Date("2026-10-15T12:00:00Z"))).toMatchObject({ hasCurrentWeek: false, uploadNeeded: true });
});

it("Admin checks and simulated dates use the current Account role", async () => {
  const admin = await account("admin@example.test", "admin");
  const student = await account("student@example.test");
  session(admin);
  expect(await requireCurrentAdmin()).toBe(admin.id);
  expect(await postgresAdminClock.moveDate(admin.id, null, "2026-10-19")).toBe(true);
  expect(await postgresAdminClock.moveDate(admin.id, null, "2026-10-20")).toBe(false);
  const real = new Date("2026-10-15T12:00:00Z");
  expect(await studentSideClock(admin, real)).toMatchObject({ simulated: true });
  expect(await studentSideClock(student, real)).toMatchObject({ simulated: false, now: real });
  await database.owner.execute(sql`update accounts set role = 'student' where id = ${admin.id}`);
  expect(await postgresAdminClock.moveDate(admin.id, "2026-10-19", "2026-10-20")).toBe(false);
  session(student);
  await expect(requireCurrentAdmin()).rejects.toThrow("Admin access required");
  request.session = null;
  await expect(requireCurrentAdmin()).rejects.toThrow("Admin access required");
});

it("onboarding saves approved analytics with its student and refuses a partial write", async () => {
  const a = await account("snapshot@example.test");
  session(a);
  const now = new Date().toISOString();
  const input = {
    ...profile,
    officialAttempts: [],
    analyticsRows: [
      { type: "Strengthen" as const, category: "regular" as const, accuracy: 0.6 },
      ...(["Law", "Comparative", "Science", "Humanities", "Art"] as const).map((type) => ({ type, category: "passage" as const, accuracy: 60 })),
    ],
    analyticsApproval: {
      extraction: { source: "7sage_screenshot" as const, extractedAt: now },
      confirmation: { extractedValuesMatch: true as const, isLatestAnalytics: true as const, confirmedAt: now },
    },
  };
  await expect(createStudentProfile(input)).rejects.toThrow("redirect:/dashboard");
  const student = await findStudentByAccountId(a.id);
  expect((await getPostgresDatabase().execute(sql`select student_id, extraction_source,
    extracted_values_match, is_latest_analytics, rc_accuracy_by_type from analytics_snapshots`)).rows).toEqual([{
    student_id: student?.id, extraction_source: "7sage_screenshot", extracted_values_match: true, is_latest_analytics: true,
    rc_accuracy_by_type: { Law: 0.6, Comparative: 0.6, Science: 0.6, Humanities: 0.6, Art: 0.6 },
  }]);
  await expect(createStudentProfile(input)).rejects.toThrow("redirect:/dashboard");
  expect((await getPostgresDatabase().execute(sql`select id from analytics_snapshots`)).rows).toHaveLength(1);
  const withoutRC = await account("snapshot-no-rc@example.test");
  session(withoutRC);
  await expect(createStudentProfile({ ...input, analyticsRows: input.analyticsRows.slice(0, 1) })).rejects.toThrow("redirect:/dashboard");
  const noRC = await findStudentByAccountId(withoutRC.id);
  expect((await getPostgresDatabase().execute(sql`select rc_accuracy_by_type from analytics_snapshots where student_id = ${noRC?.id}`)).rows)
    .toEqual([{ rc_accuracy_by_type: {} }]);
  const rcTypo = await account("snapshot-rc-typo@example.test");
  session(rcTypo);
  await expect(createStudentProfile({
    ...input,
    analyticsRows: [...input.analyticsRows.slice(0, 1), { type: "Law", category: "passage", accuracy: 150 }],
  })).rejects.toThrow("Enter each RC accuracy from 0 to 100.");
  expect(await findStudentByAccountId(rcTypo.id)).toBeNull();
  const b = await account("snapshot-fail@example.test");
  session(b);
  await database.owner.execute(sql`create function reject_snapshot_test() returns trigger language plpgsql as
    'BEGIN RAISE EXCEPTION ''forced snapshot failure''; END;'`);
  await database.owner.execute(sql`create trigger reject_snapshot_test before insert on analytics_snapshots
    for each row execute function reject_snapshot_test()`);
  try {
    await expect(createStudentProfile(input)).rejects.toThrow();
    expect(await findStudentByAccountId(b.id)).toBeNull();
    expect((await getPostgresDatabase().execute(sql`select id from analytics_snapshots`)).rows).toHaveLength(2);
  } finally {
    await database.owner.execute(sql`drop trigger reject_snapshot_test on analytics_snapshots`);
    await database.owner.execute(sql`drop function reject_snapshot_test()`);
  }
});

it("make-admin refuses a missing Account and leaves existing Accounts unchanged", async () => {
  await account("student@example.test");
  const result = await makeAdmin("missing@example.test").then(() => null, (error: unknown) => error);
  expect(result).toMatchObject({ code: 1, stderr: expect.stringContaining("No account found for missing@example.test") });
  expect(await findAccountByEmail("student@example.test")).toMatchObject({ role: "student" });
});

describe.each([
  { name: "onboarding", save: createStudentProfile, existingProfile: false },
  { name: "Study settings", save: updateStudentProfile, existingProfile: true },
])("$name input validation", ({ save, existingProfile }) => {
  beforeEach(async () => {
    const owner = await account("validation@example.test");
    session(owner);
    if (existingProfile) {
      await onboard();
    }
  });

  it.each([0, 100, 495])("rejects daily capacity %i without changing stored data", async (minutes) => {
    const before = await studentRows();
    const input = {
      ...profileInput,
      dailyCapacityMinutes: { ...profile.dailyCapacityMinutes, TUESDAY: minutes },
    };
    await expect(save(input)).rejects.toBeInstanceOf(z.ZodError);
    expect(await studentRows()).toEqual(before);
  });

  it("rejects a missing preferred practice-test day without changing stored data", async () => {
    const before = await studentRows();
    const input = { ...profileInput };
    Reflect.set(input, "preferredPracticeTestDay", "");
    await expect(save(input)).rejects.toBeInstanceOf(z.ZodError);
    expect(await studentRows()).toEqual(before);
  });

  it.each([165, 160])("rejects goal score %i at or below a current score of 165 without changing stored data", async (goalScore) => {
    const before = await studentRows();
    await expect(save({ ...profileInput, currentScore: 165, goalScore })).rejects.toThrow(
      "Your goal must be higher than your current score, 165."
    );
    expect(await studentRows()).toEqual(before);
  });

  it("rejects a goal test date that has passed without changing stored data", async () => {
    const before = await studentRows();
    await expect(save({ ...profileInput, goalTestDate: "2026-10-01" })).rejects.toThrow("Choose an upcoming LSAT test month.");
    expect(await studentRows()).toEqual(before);
  });

  it("rejects a platform other than 7Sage without changing stored data", async () => {
    const before = await studentRows();
    const input = { ...profileInput };
    Reflect.set(input, "platform", "LSAT Demon");
    await expect(save(input)).rejects.toBeInstanceOf(z.ZodError);
    expect(await studentRows()).toEqual(before);
  });
});

it("onboarding saves 7Sage for a profile sent without a platform", async () => {
  const owner = await account("no-platform@example.test");
  session(owner);
  await expect(createStudentProfile(profileInput)).rejects.toThrow("redirect:/dashboard");
  expect(await studentRows()).toMatchObject([{ platform: "7Sage" }]);
});

it("onboarding stores each day's capacity and a Sunday practice-test day", async () => {
  const owner = await account("sunday@example.test");
  session(owner);
  const dailyCapacityMinutes = { ...profile.dailyCapacityMinutes, MONDAY: 30, SATURDAY: 225 };
  await expect(createStudentProfile({
    ...profileInput, dailyCapacityMinutes, preferredPracticeTestDay: "SUNDAY",
  })).rejects.toThrow("redirect:/dashboard");
  expect(await findStudentByAccountId(owner.id)).toMatchObject({ dailyCapacityMinutes, preferredPracticeTestDay: "SUNDAY" });
});

it("onboarding stores official attempts, and Study settings keep them", async () => {
  const owner = await account("attempts@example.test");
  session(owner);
  const officialAttempts = [{ score: 152, month: "2025-06" }, { score: 149, month: "2026-01" }];
  await expect(createStudentProfile({ ...profileInput, officialAttempts })).rejects.toThrow("redirect:/dashboard");
  await expect(updateStudentProfile({ ...profile, goalScore: 170 })).rejects.toThrow("redirect:/dashboard");
  expect(await studentRows()).toMatchObject([{ goal_score: 170, official_attempts: officialAttempts }]);
});

it.each([
  { score: 181, month: "2025-06" },
  { score: 152, month: "2099-01" },
  { score: 152, month: "2000-01" },
  { score: 152, month: "" },
])("onboarding rejects official attempt %o without storing a student", async (attempt) => {
  session(await account("bad-attempt@example.test"));
  await expect(createStudentProfile({ ...profileInput, officialAttempts: [attempt] })).rejects.toBeInstanceOf(z.ZodError);
  expect(await studentRows()).toEqual([]);
});

it.each(["student", "admin"] as const)("Study settings store the %s's Wednesday capacity and practice-test day", async (role) => {
  const owner = await account("wednesday@example.test", role);
  session(owner);
  await onboard();
  const dailyCapacityMinutes = { ...profile.dailyCapacityMinutes, WEDNESDAY: 480 };
  await expect(updateStudentProfile({
    ...profile, dailyCapacityMinutes, preferredPracticeTestDay: "WEDNESDAY",
  })).rejects.toThrow("redirect:/dashboard");
  expect(await findStudentByAccountId(owner.id)).toMatchObject({ dailyCapacityMinutes, preferredPracticeTestDay: "WEDNESDAY" });
});

it("onboarding works for an Account that signed in before and has no Student (D4)", async () => {
  expect(await googleSignIn("google-returning", "returning@example.test")).toBe(true);
  const existing = await findAccountByEmail("returning@example.test");
  if (!existing) throw new Error("Google sign-in made no Account.");
  session({ id: existing.id, role: "student", email: existing.email, name: existing.name });
  expect(await findStudentByAccountId(existing.id)).toBeNull();

  const page = renderToStaticMarkup(await OnboardingPage());
  expect(page).toContain("Google");
  await onboard();

  expect(await findStudentByAccountId(existing.id)).toMatchObject({ currentScore: 150, goalScore: 165 });
  expect(await accountRows()).toHaveLength(1);
  await expect(OnboardingPage()).rejects.toThrow("redirect:/dashboard");
});

it("Study settings send an Account without a Student to onboarding", async () => {
  const owner = await account("new@example.test");
  session(owner);
  await expect(updateStudentProfile(profile)).rejects.toThrow("redirect:/onboarding");
  expect(await findStudentByAccountId(owner.id)).toBeNull();
});

it("Google sign-in returns through the role-aware login route", async () => {
  await signInWithGoogle();
  expect(request.signIn).toHaveBeenCalledWith("google", { redirectTo: "/login" });
});

it.each(["student", "admin"] as const)("Account shows the %s's email and offers deletion only to students", async (role) => {
  const owner = await account("owner@example.test", role);
  session(owner);
  request.session!.signedInAt = Math.floor(Date.now() / 1000);
  await onboard();
  const markup = renderToStaticMarkup(await AccountPage());
  expect(markup).toContain("owner@example.test");
  expect(markup.includes('name="confirmation"')).toBe(role === "student");
  expect(markup.includes("This action is not available for admin accounts.")).toBe(role === "admin");
});
