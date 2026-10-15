import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { renderToStaticMarkup } from "react-dom/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import type { Session } from "next-auth";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppTestDatabase } from "./appTestDatabase";
import { closePostgresDatabase, getPostgresDatabase } from "../../src/lib/postgres";
import { findAccountByEmail, createAccount } from "../../src/lib/accountRepository";
import { authorizeCredentials, createGoogleAccountOnSignIn, accountToken } from "../../src/lib/authAccounts";
import { findStudentByAccountId } from "../../src/lib/studentRepository";
import type { Student } from "../../src/lib/types";

interface RequestState {
  session: Session | null;
  signInError: Error | null;
  signIn: ReturnType<typeof vi.fn<(provider: string, values: Record<string, unknown>) => Promise<void>>>;
}
const request = vi.hoisted((): RequestState => ({
  session: null,
  signInError: null,
  signIn: vi.fn(),
}));
vi.mock("@/auth", () => ({
  auth: async () => request.session,
  signIn: request.signIn.mockImplementation(async (provider, values) => {
    if (request.signInError) throw request.signInError;
    if (provider !== "credentials") return;
    const { authorizeCredentials } = await import("../../src/lib/authAccounts");
    const user = await authorizeCredentials(values);
    if (!user) {
      const { CredentialsSignin } = await import("next-auth");
      throw new CredentialsSignin();
    }
    request.session = { user, expires: "2099-01-01T00:00:00.000Z" };
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

import { signup } from "../../src/app/signup/actions";
import { login, signInWithGoogle } from "../../src/app/login/actions";
import { createStudentProfile } from "../../src/app/onboarding/actions";
import { updateStudentProfile } from "../../src/app/account/actions";
import AccountPage from "../../src/app/account/page";
import { captureLead } from "../../src/app/actions";
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
  request.signInError = null;
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
    env: { ...process.env, DATABASE_URL: database.setting }, timeout: 15000,
  });
}

function signupForm(email = "Student@Example.test") {
  const form = new FormData();
  form.set("name", "Student One");
  form.set("email", email);
  form.set("password", "throwawayPassword123");
  form.set("agreedToTerms", "on");
  return form;
}
const profile: Student = {
  platform: "7Sage", currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 105, WEDNESDAY: 120, THURSDAY: 135, FRIDAY: 150, SATURDAY: 165, SUNDAY: 180 },
};
const profileInput = { ...profile, analyticsRows: [], analyticsApproval: null };
async function account(email: string, role: "student" | "admin" = "student") {
  const created = await createAccount({ email, name: email, role });
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

it("signup normalizes email, refuses duplicates, and signs in with the stored password", async () => {
  expect(await signup({}, signupForm())).toEqual({});
  const signedUp = request.session;
  expect(signedUp?.user).toMatchObject({ email: "student@example.test", role: "student" });
  expect(await signup({}, signupForm("student@example.test")))
    .toEqual({ message: "An account with that email already exists." });
  expect((await getPostgresDatabase().execute(sql`select email from accounts`)).rows)
    .toEqual([{ email: "student@example.test" }]);
  expect(await authorizeCredentials({ email: " STUDENT@example.test ", password: "throwawayPassword123" }))
    .toEqual(signedUp?.user);
  expect(await authorizeCredentials({ email: "student@example.test", password: "wrongPassword123" })).toBeNull();
});

it("concurrent signup creates one Account and returns one duplicate refusal", async () => {
  const results = await Promise.all([signup({}, signupForm()), signup({}, signupForm())]);
  expect(results).toContainEqual({});
  expect(results).toContainEqual({ message: "An account with that email already exists." });
  expect((await getPostgresDatabase().execute(sql`select email from accounts`)).rows).toHaveLength(1);
});

it("signup refuses missing consent and invalid input before saving an Account", async () => {
  const noConsent = signupForm();
  noConsent.delete("agreedToTerms");
  expect(await signup({}, noConsent)).toHaveProperty("message");
  expect(await signup({}, signupForm("invalid"))).toHaveProperty("errors.email");
  expect((await getPostgresDatabase().execute(sql`select id from accounts`)).rows).toEqual([]);
});

it("Google first sign-in creates one Account and retains an existing Admin role", async () => {
  const google = { provider: "google", providerAccountId: "throwaway-google", type: "oauth" as const };
  const user = { email: "GOOGLE@example.test", name: "Google Student" };
  expect(await createGoogleAccountOnSignIn({ user, account: google })).toBe(true);
  expect(await createGoogleAccountOnSignIn({ user, account: google })).toBe(true);
  const saved = await findAccountByEmail(user.email);
  expect(saved).toMatchObject({ email: "google@example.test", name: "Google Student", role: "student", passwordHash: null });
  await getPostgresDatabase().execute(sql`update accounts set role = 'admin' where id = ${saved?.id}`);
  expect(await createGoogleAccountOnSignIn({ user, account: google })).toBe(true);
  expect(await accountToken({ token: {}, user, account: google })).toMatchObject({ id: saved?.id, role: "admin" });
  expect(await createGoogleAccountOnSignIn({ user: {}, account: google })).toBe(false);
});

it("login sends students and promoted Admins to their existing destinations", async () => {
  await signup({}, signupForm());
  const loginForm = signupForm(" STUDENT@example.test ");
  await expect(login({}, loginForm)).rejects.toThrow("redirect:/dashboard");
  const { stdout } = await makeAdmin(" STUDENT@example.test ");
  expect(stdout).toContain("Made student@example.test an admin");
  await expect(login({}, loginForm)).rejects.toThrow("redirect:/admin");
  const again = await makeAdmin("student@example.test");
  expect(again.stdout).toContain("already an admin");
  loginForm.set("password", "badPassword123");
  expect(await login({}, loginForm)).toEqual({ error: "Invalid email or password." });
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
  await getPostgresDatabase().execute(sql`update accounts set role = 'student' where id = ${admin.id}`);
  await expect(requireCurrentAdmin()).rejects.toThrow("Admin access required");
  expect(await postgresAdminClock.moveDate(admin.id, "2026-10-19", "2026-10-20")).toBe(false);
  session({ ...student, role: "admin" });
  await expect(requireCurrentAdmin()).rejects.toThrow("Admin access required");
  request.session = null;
  await expect(requireCurrentAdmin()).rejects.toThrow("Admin access required");
});

it("lead capture normalizes and accepts repeated submissions without a second row", async () => {
  const form = new FormData();
  form.set("email", "LEAD@example.test");
  expect(await captureLead({}, form)).toEqual({ success: true });
  expect(await captureLead({}, form)).toEqual({ success: true });
  expect((await getPostgresDatabase().execute(sql`select email from leads`)).rows).toEqual([{ email: "lead@example.test" }]);
});

it("onboarding saves approved analytics with its student and refuses a partial write", async () => {
  const a = await account("snapshot@example.test");
  session(a);
  const now = new Date().toISOString();
  const input = {
    ...profile,
    analyticsRows: [{ type: "Strengthen" as const, category: "regular" as const, accuracy: 0.6 }],
    analyticsApproval: {
      extraction: { source: "7sage_screenshot" as const, extractedAt: now },
      confirmation: { extractedValuesMatch: true as const, isLatestAnalytics: true as const, confirmedAt: now },
    },
  };
  await expect(createStudentProfile(input)).rejects.toThrow("redirect:/dashboard");
  const student = await findStudentByAccountId(a.id);
  expect((await getPostgresDatabase().execute(sql`select student_id, extraction_source,
    extracted_values_match, is_latest_analytics from analytics_snapshots`)).rows).toEqual([{
    student_id: student?.id, extraction_source: "7sage_screenshot", extracted_values_match: true, is_latest_analytics: true,
  }]);
  await expect(createStudentProfile(input)).rejects.toThrow("redirect:/dashboard");
  expect((await getPostgresDatabase().execute(sql`select id from analytics_snapshots`)).rows).toHaveLength(1);
  const b = await account("snapshot-fail@example.test");
  session(b);
  await database.owner.execute(sql`create function reject_snapshot_test() returns trigger language plpgsql as
    'BEGIN RAISE EXCEPTION ''forced snapshot failure''; END;'`);
  await database.owner.execute(sql`create trigger reject_snapshot_test before insert on analytics_snapshots
    for each row execute function reject_snapshot_test()`);
  try {
    await expect(createStudentProfile(input)).rejects.toThrow();
    expect(await findStudentByAccountId(b.id)).toBeNull();
    expect((await getPostgresDatabase().execute(sql`select id from analytics_snapshots`)).rows).toHaveLength(1);
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

it("login propagates an unexpected authentication failure", async () => {
  request.signInError = new Error("Authentication unavailable");
  await expect(login({}, signupForm())).rejects.toThrow("Authentication unavailable");
  expect(request.session).toBeNull();
});

it.each(["student", "admin"] as const)("Account shows the %s's email and offers deletion only to students", async (role) => {
  const owner = await account("owner@example.test", role);
  session(owner);
  await onboard();
  const markup = renderToStaticMarkup(await AccountPage());
  expect(markup).toContain("owner@example.test");
  expect(markup.includes("Delete account")).toBe(role === "student");
});
