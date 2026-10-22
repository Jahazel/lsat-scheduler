import { sql } from "drizzle-orm";
import { encode, type JWT } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { z } from "zod";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { createAppTestDatabase } from "./appTestDatabase";
import { closePostgresDatabase } from "../../src/lib/postgres";
import { createAccount } from "../../src/lib/accountRepository";
import { accountSessionToken } from "../../src/lib/accountSession";
import { createGoogleAccountOnSignIn, DISABLED_SIGN_IN_PATH } from "../../src/lib/authAccounts";
import { handlers } from "../../src/auth";
import proxy from "../../src/proxy";
import { createStudentProfile } from "../../src/app/onboarding/actions";
import { confirmWeeklyUpload } from "../../src/app/dashboard/upload/actions";
import { POST as extractPracticeTest } from "../../src/app/api/practice-test/extract/route";
import AdminPage from "../../src/app/admin/page";
import { setSimulatedDate } from "../../src/app/admin/test/actions";
import type { Student } from "../../src/lib/types";

const COOKIE = "authjs.session-token";
const HOUR = 60 * 60;
const DAY = 24 * HOUR;

const { SECRET, originalSecret, request } = vi.hoisted(() => {
  // Auth.js reads its secret when src/auth loads, before any hook runs.
  const originalSecret = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "account-sessions-test-secret-0123456789";
  return { SECRET: process.env.AUTH_SECRET, originalSecret, request: { cookie: "", createMessage: vi.fn() } };
});
vi.mock("next/headers", () => ({
  headers: async () => new Headers({
    host: "localhost:3000", "x-forwarded-proto": "http", cookie: `authjs.session-token=${request.cookie}`,
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class { messages = { create: request.createMessage }; },
}));

let database: Awaited<ReturnType<typeof createAppTestDatabase>>;
beforeAll(async () => {
  await closePostgresDatabase();
  database = await createAppTestDatabase();
  vi.stubEnv("DATABASE_URL", database.setting);
  vi.stubEnv("SCREENSHOT_EXTRACTOR", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key-never-sent");
});
beforeEach(async () => {
  request.cookie = "";
  request.createMessage.mockReset().mockRejectedValue(new Error("no network in tests"));
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));
  await database.owner.execute(sql`truncate accounts cascade`);
});
afterEach(() => vi.useRealTimers());
afterAll(async () => {
  await closePostgresDatabase();
  vi.unstubAllEnvs();
  process.env.AUTH_SECRET = originalSecret;
  await database?.cleanup();
});

const nowSeconds = () => Math.floor(Date.now() / 1000);
const advance = (seconds: number) => vi.setSystemTime(Date.now() + seconds * 1000);
const ownerSql = (query: ReturnType<typeof sql>) => database.owner.execute(query);

async function account(email: string, role: "student" | "admin" = "student") {
  const created = await createAccount({ email, name: email, role, googleId: `google-${email}` });
  if (!created) throw new Error("Fixture Account already exists.");
  return created;
}

function mint(token: JWT) {
  return encode({ token, secret: SECRET, salt: COOKIE });
}

function signedIn(id: string, { signedInAt = nowSeconds(), sessionVersion = 0 } = {}) {
  return mint({ id, sessionVersion, signedInAt });
}

const SessionBody = z.object({ user: z.object({ id: z.string(), role: z.string() }) }).nullable();

async function readSession(cookie: string) {
  const response = await handlers.GET(new NextRequest("http://localhost:3000/api/auth/session", {
    headers: { cookie: `${COOKIE}=${cookie}` },
  }));
  const renewed = response.headers.getSetCookie().find((entry) => entry.startsWith(`${COOKIE}=`));
  const user = SessionBody.parse(await response.json())?.user;
  return {
    user: user ? { id: user.id, role: user.role } : null,
    cookie: renewed?.slice(COOKIE.length + 1).split(";")[0] ?? "",
  };
}

async function proxyResponse(path: string, cookie: string) {
  const response = await proxy(new NextRequest(`http://localhost:3000${path}`, {
    headers: { host: "localhost:3000", "x-forwarded-proto": "http", cookie: `${COOKIE}=${cookie}` },
  }), { params: Promise.resolve({}) });
  return { status: response?.status, location: response?.headers.get("location") ?? null };
}

it("a fresh session survives and carries the Account role from the database, not the cookie", async () => {
  const student = await account("student@example.test");
  const cookie = await mint({ id: student.id, role: "admin", sessionVersion: 0, signedInAt: nowSeconds() });
  const read = await readSession(cookie);
  expect(read.user).toEqual({ id: student.id, role: "student" });
  expect((await readSession(read.cookie)).user).toEqual({ id: student.id, role: "student" });
});

it("a deleted Account loses its session on the next read", async () => {
  const student = await account("student@example.test");
  const cookie = await signedIn(student.id);
  await ownerSql(sql`delete from accounts where id = ${student.id}`);
  expect(await readSession(cookie)).toEqual({ user: null, cookie: "" });
});

it("a Disabled Account loses its session even with the current session version", async () => {
  const student = await account("student@example.test");
  await ownerSql(sql`update accounts set disabled_at = now() where id = ${student.id}`);
  const [{ session_version }] = (await ownerSql(sql`select session_version from accounts`)).rows;
  expect((await readSession(await signedIn(student.id, { sessionVersion: Number(session_version) }))).user).toBeNull();
});

it("owner SQL that changes the role or the disabled time raises the session version and ends old sessions", async () => {
  const student = await account("student@example.test");
  const versions = async () => (await ownerSql(sql`select session_version from accounts`)).rows[0].session_version;
  const cookie = await signedIn(student.id);
  await ownerSql(sql`update accounts set name = 'Renamed' where id = ${student.id}`);
  expect(await versions()).toBe(0);
  expect((await readSession(cookie)).user).not.toBeNull();

  await ownerSql(sql`update accounts set role = 'admin' where id = ${student.id}`);
  expect(await versions()).toBe(1);
  expect((await readSession(cookie)).user).toBeNull();

  const adminCookie = await signedIn(student.id, { sessionVersion: 1 });
  expect((await readSession(adminCookie)).user).toEqual({ id: student.id, role: "admin" });
  await ownerSql(sql`update accounts set disabled_at = now() where id = ${student.id}`);
  await ownerSql(sql`update accounts set disabled_at = null where id = ${student.id}`);
  expect(await versions()).toBe(3);
  expect((await readSession(adminCookie)).user).toBeNull();
});

it("a raised session version ends every older session", async () => {
  const student = await account("student@example.test");
  const cookie = await signedIn(student.id);
  await ownerSql(sql`update accounts set session_version = session_version + 1 where id = ${student.id}`);
  expect((await readSession(cookie)).user).toBeNull();
  expect((await readSession(await signedIn(student.id, { sessionVersion: 1 }))).user).not.toBeNull();
});

it.each([
  ["a session from before this release", (id: string) => ({ id, role: "student" as const })],
  ["a token without a sign-in time", (id: string) => ({ id, sessionVersion: 0 })],
  ["a token without a session version", (id: string) => ({ id, signedInAt: nowSeconds() })],
  ["a token without an Account ID", () => ({ sessionVersion: 0, signedInAt: nowSeconds() })],
])("%s is refused", async (_name, token) => {
  const student = await account("student@example.test");
  expect((await readSession(await mint(token(student.id)))).user).toBeNull();
});

it("a student session ends 30 days after sign-in even while in use", async () => {
  const student = await account("student@example.test");
  let cookie = (await readSession(await signedIn(student.id))).cookie;
  for (let day = 0; day < 3; day++) {
    advance(10 * DAY - 1);
    const read = await readSession(cookie);
    expect(read.user).not.toBeNull();
    cookie = read.cookie;
  }
  advance(4);
  expect((await readSession(cookie)).user).toBeNull();
});

it("a student session ends after 14 days without use", async () => {
  const student = await account("student@example.test");
  const renewed = (await readSession(await signedIn(student.id))).cookie;
  advance(14 * DAY - 60);
  expect((await readSession(renewed)).user).not.toBeNull();
  advance(120);
  expect((await readSession(renewed)).user).toBeNull();
});

it("an Admin session ends 24 hours after sign-in", async () => {
  const admin = await account("admin@example.test", "admin");
  const cookie = await signedIn(admin.id);
  advance(DAY - 1);
  const read = await readSession(cookie);
  expect(read.user).toEqual({ id: admin.id, role: "admin" });
  advance(2);
  expect((await readSession(read.cookie)).user).toBeNull();
});

it("Google sign-in writes a session that survives, and a Disabled Account is sent to Login with a reason", async () => {
  const student = await account("student@example.test");
  const google = { provider: "google", providerAccountId: "google-student@example.test", type: "oidc" as const };
  const user = { email: "student@example.test" };
  const signIn = () => createGoogleAccountOnSignIn({ user, account: google, profile: { email_verified: true } });

  expect(await signIn()).toBe(true);
  const token = await accountSessionToken({ token: {}, user, account: google });
  if (!token) throw new Error("Google sign-in wrote no session.");
  expect((await readSession(await mint(token))).user).toEqual({ id: student.id, role: "student" });

  await ownerSql(sql`update accounts set disabled_at = now() where id = ${student.id}`);
  expect(await signIn()).toBe(DISABLED_SIGN_IN_PATH);
  expect(await accountSessionToken({ token: {}, user, account: google })).toBeNull();
});

const profile: Student = {
  currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
};
const profileInput = { ...profile, officialAttempts: [], analyticsRows: [], analyticsApproval: null };
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=",
  "base64",
);
function screenshotRequest(path: string, cookie: string) {
  const form = new FormData();
  form.set("image", new File([png], "section.png", { type: "image/png" }));
  form.set("section", "LR");
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST", body: form, headers: { cookie: `${COOKIE}=${cookie}` },
  });
}
const savedRows = async () => (await ownerSql(sql`select
  (select count(*) from students)::int as students,
  (select count(*) from analytics_snapshots)::int as snapshots,
  (select count(*) from practice_test_results)::int as practice_tests`)).rows[0];

it("a refused session reaches no onboarding, weekly upload, or extraction and saves nothing", async () => {
  const student = await account("student@example.test");
  const cookie = await signedIn(student.id);
  expect(await proxyResponse("/api/analytics/extract", cookie)).toEqual({ status: 200, location: null });

  await ownerSql(sql`update accounts set disabled_at = now() where id = ${student.id}`);
  request.cookie = cookie;
  await expect(createStudentProfile(profileInput)).rejects.toThrow("Not authenticated");
  expect(await confirmWeeklyUpload({ weekOf: "2026-10-19", analytics: {}, practiceTest: {} })).toEqual({ signedOut: true });
  expect((await extractPracticeTest(screenshotRequest("/api/practice-test/extract", cookie))).status).toBe(401);
  expect(await proxyResponse("/api/analytics/extract", cookie)).toEqual({ status: 401, location: null });
  expect(await proxyResponse("/onboarding", cookie)).toMatchObject({ status: 307, location: "http://localhost:3000/login" });
  expect(request.createMessage).not.toHaveBeenCalled();
  expect(await savedRows()).toEqual({ students: 0, snapshots: 0, practice_tests: 0 });
});

it("the same paths work for a fresh session, so the refusal is the session check", async () => {
  const student = await account("student@example.test");
  request.cookie = await signedIn(student.id);
  expect((await extractPracticeTest(screenshotRequest("/api/practice-test/extract", request.cookie))).status).toBe(502);
  expect(request.createMessage).toHaveBeenCalledOnce();
  await expect(createStudentProfile(profileInput)).rejects.toThrow("redirect:/dashboard");
  expect(await savedRows()).toMatchObject({ students: 1 });
});

it("a demoted Admin reaches no Admin page or Admin action on the next request", async () => {
  const admin = await account("admin@example.test", "admin");
  request.cookie = await signedIn(admin.id);
  await setSimulatedDate("2026-10-23");
  expect(await proxyResponse("/admin", request.cookie)).toEqual({ status: 200, location: null });

  await ownerSql(sql`update accounts set role = 'student' where id = ${admin.id}`);
  await expect(AdminPage()).rejects.toThrow("redirect:/dashboard");
  await expect(setSimulatedDate("2026-10-24")).rejects.toThrow("Admin access required");
  expect(await proxyResponse("/admin", request.cookie)).toMatchObject({ status: 307, location: "http://localhost:3000/login" });
  expect((await ownerSql(sql`select simulated_date::text from accounts`)).rows).toEqual([{ simulated_date: "2026-10-23" }]);
});
