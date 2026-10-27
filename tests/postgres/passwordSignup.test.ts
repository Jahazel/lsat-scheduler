import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppTestDatabase } from "./appTestDatabase";
import { closePostgresDatabase } from "../../src/lib/postgres";
import { clearFakeEmails, fakeEmails } from "../../src/lib/email";
import { signUpWithPassword, type SignupState } from "../../src/app/signup/actions";
import { verifyEmail } from "../../src/app/verify-email/actions";
import VerifyEmailPage from "../../src/app/verify-email/page";
import { logInWithPassword } from "../../src/app/login/actions";
import { handlers } from "../../src/auth";
import proxy from "../../src/proxy";

const COOKIE = "authjs.session-token";
const HOUR_MS = 60 * 60 * 1000;
const PASSWORD = "correct horse battery staple";

const { originalSecret, request } = vi.hoisted(() => {
  // Auth.js reads its secret when src/auth loads, before any hook runs.
  const originalSecret = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "password-signup-test-secret-0123456789";
  return { originalSecret, request: { ip: "203.0.113.1", setCookie: vi.fn() } };
});
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "localhost:3000", "x-forwarded-proto": "http", "x-vercel-forwarded-for": request.ip }),
  cookies: async () => ({ set: request.setCookie }),
}));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

let database: Awaited<ReturnType<typeof createAppTestDatabase>>;
beforeAll(async () => {
  await closePostgresDatabase();
  database = await createAppTestDatabase();
  vi.stubEnv("DATABASE_URL", database.setting);
  for (const name of ["RESEND_API_KEY", "EMAIL_FROM", "SITE_URL", "VERCEL"]) vi.stubEnv(name, "");
});
beforeEach(async () => {
  request.ip = "203.0.113.1";
  request.setCookie.mockReset();
  clearFakeEmails();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-27T12:00:00Z"));
  await database.owner.execute(sql`truncate accounts, pending_signups, action_counters cascade`);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
afterAll(async () => {
  await closePostgresDatabase();
  vi.unstubAllEnvs();
  process.env.AUTH_SECRET = originalSecret;
  await database?.cleanup();
});

const advance = (ms: number) => vi.setSystemTime(Date.now() + ms);
const ownerRows = async (query: ReturnType<typeof sql>) => (await database.owner.execute(query)).rows;
const accountsNow = () => ownerRows(sql`
  select email, name, role, google_id is not null as has_google, password_hash is not null as has_password from accounts order by email
`);
const pendingEmails = async () => (await ownerRows(sql`select email from pending_signups order by email`)).map((row) => row.email);

function signupForm({ name = "Maya Chen", email = "maya.chen@fastmail.com", password = PASSWORD, agreed = true } = {}) {
  const form = new FormData();
  form.set("name", name);
  form.set("email", email);
  form.set("password", password);
  if (agreed) form.set("agreedToTerms", "on");
  return form;
}

const signUp = (fields?: Parameters<typeof signupForm>[0]) => signUpWithPassword({ kind: "form", errors: {} }, signupForm(fields));
const checkYourEmail = (email: string): SignupState => ({ kind: "checkYourEmail", email });

function linkTokenIn(text: string) {
  const token = /\/verify-email\?token=([\w-]+)/.exec(text)?.[1];
  if (!token) throw new Error("The email has no verification link.");
  return token;
}

async function pressVerify(token: string) {
  const form = new FormData();
  form.set("token", token);
  try {
    return await verifyEmail({ linkDoesNotWork: false }, form);
  } catch (error) {
    return { redirectedTo: (error as Error).message.replace(/^redirect:/, "") };
  }
}

async function logIn(email: string, password: string) {
  const form = new FormData();
  form.set("email", email);
  form.set("password", password);
  const redirectedTo = await logInWithPassword(form).then(() => null, (error: Error) => error.message.replace(/^redirect:/, ""));
  const cookie = request.setCookie.mock.calls.findLast(([name]) => name === COOKIE)?.[1] ?? "";
  request.setCookie.mockReset();
  return { redirectedTo, cookie: cookie as string };
}

const SessionBody = z.object({ user: z.object({ id: z.string(), role: z.string() }) }).nullable();
async function readSession(cookie: string) {
  const response = await handlers.GET(new NextRequest("http://localhost:3000/api/auth/session", {
    headers: { cookie: `${COOKIE}=${cookie}` },
  }));
  const renewed = response.headers.getSetCookie().find((entry) => entry.startsWith(`${COOKIE}=`));
  const user = SessionBody.parse(await response.json())?.user;
  return { user: user ? { id: user.id, role: user.role } : null, cookie: renewed?.slice(COOKIE.length + 1).split(";")[0] ?? "" };
}
const sessionUser = async (cookie: string) => (await readSession(cookie)).user;

async function landingAfterLogin(cookie: string) {
  const response = await proxy(new NextRequest("http://localhost:3000/login", {
    headers: { host: "localhost:3000", "x-forwarded-proto": "http", cookie: `${COOKIE}=${cookie}` },
  }), { params: Promise.resolve({}) });
  return response?.headers.get("location") ?? null;
}

describe("signup", () => {
  it("refuses an unticked Terms box with the message beside the box, and saves, counts, and sends nothing", async () => {
    expect(await signUp({ agreed: false })).toEqual({ kind: "form", errors: { terms: "Tick the box to continue." } });
    expect(await pendingEmails()).toEqual([]);
    expect(await ownerRows(sql`select * from action_counters`)).toEqual([]);
    expect(fakeEmails()).toEqual([]);
  });

  it.each([
    ["too short", "short1", "That password is too short. Use at least 8 characters."],
    ["too long", "a".repeat(73), "That password is too long. Try a shorter one."],
    ["too common", "Password123", "This password is too common. Choose a password that's harder to guess."],
    ["the email", "Maya.Chen@fastmail.com", "This password is too common. Choose a password that's harder to guess."],
    ["drillmap", "DRILLMAP", "This password is too common. Choose a password that's harder to guess."],
  ])("refuses a password that is %s beside the password, and saves and sends nothing", async (_case, password, message) => {
    expect(await signUp({ password })).toEqual({ kind: "form", errors: { password: message } });
    expect(await pendingEmails()).toEqual([]);
    expect(fakeEmails()).toEqual([]);
  });

  it("accepts a multibyte password of exactly 72 bytes, and that password signs in", async () => {
    const password = "日本語のパスワード".repeat(3).slice(0, 24);
    expect(new TextEncoder().encode(password).length).toBe(72);
    expect(await signUp({ password })).toEqual(checkYourEmail("maya.chen@fastmail.com"));
    await pressVerify(linkTokenIn(fakeEmails()[0].text));
    expect((await logIn("maya.chen@fastmail.com", password)).redirectedTo).toBe("http://localhost:3000/login");
  });

  it("for a new email, saves a pending signup, makes no Account, and sends the verification link", async () => {
    expect(await signUp({ email: " Maya.Chen@Fastmail.com " })).toEqual(checkYourEmail("maya.chen@fastmail.com"));
    expect(await pendingEmails()).toEqual(["maya.chen@fastmail.com"]);
    expect(await accountsNow()).toEqual([]);
    expect(fakeEmails()).toEqual([{
      to: "maya.chen@fastmail.com",
      subject: "Verify your email for DrillMap",
      text: expect.stringMatching(/^Hi Maya Chen,[\s\S]*http:\/\/localhost:3000\/verify-email\?token=[\w-]{43}\n/),
    }]);
  });

  it("for a pending signup, replaces it with a new link, and the older link stops working", async () => {
    await signUp({ name: "Maya Typo" });
    advance(HOUR_MS / 2);
    expect(await signUp()).toEqual(checkYourEmail("maya.chen@fastmail.com"));
    const [older, newer] = fakeEmails().map((email) => linkTokenIn(email.text));
    expect(older).not.toBe(newer);
    expect(await pendingEmails()).toEqual(["maya.chen@fastmail.com"]);

    expect(await pressVerify(older)).toEqual({ linkDoesNotWork: true });
    expect(await pressVerify(newer)).toEqual({ redirectedTo: "/login?notice=EmailVerified" });
    expect(await accountsNow()).toEqual([
      { email: "maya.chen@fastmail.com", name: "Maya Chen", role: "student", has_google: false, has_password: true },
    ]);
  });

  it("for a password Account, sends \"You already have an Account\" and changes nothing", async () => {
    await signUp();
    await pressVerify(linkTokenIn(fakeEmails()[0].text));
    clearFakeEmails();
    const before = await ownerRows(sql`select * from accounts`);

    expect(await signUp({ name: "Someone Else", password: "another long phrase" })).toEqual(checkYourEmail("maya.chen@fastmail.com"));
    expect(fakeEmails()).toEqual([{
      to: "maya.chen@fastmail.com",
      subject: "You already have a DrillMap Account",
      text: expect.stringContaining("You already have an Account. Log in, or reset your password:\n\nhttp://localhost:3000/login\n"),
    }]);
    expect(await pendingEmails()).toEqual([]);
    expect(await ownerRows(sql`select * from accounts`)).toEqual(before);
    expect((await logIn("maya.chen@fastmail.com", "another long phrase")).cookie).toBe("");
  });

  it("for a Google Account, sends only \"You sign in with Google\" and makes nothing", async () => {
    await database.createAccountAsOwner({ email: "maya.chen@fastmail.com", name: "Maya" });
    const before = await accountsNow();

    expect(await signUp()).toEqual(checkYourEmail("maya.chen@fastmail.com"));
    expect(fakeEmails()).toEqual([{
      to: "maya.chen@fastmail.com",
      subject: "You sign in to DrillMap with Google",
      text: expect.stringContaining("You sign in with Google."),
    }]);
    expect(fakeEmails()[0].text).not.toMatch(/token|password:/i);
    expect(await pendingEmails()).toEqual([]);
    expect(await accountsNow()).toEqual(before);
  });
});

describe("signup limits", () => {
  it("the 4th signup for one email in an hour shows the same screen, and saves and sends nothing", async () => {
    for (let count = 0; count < 3; count++) await signUp();
    const savedLink = linkTokenIn(fakeEmails()[2].text);
    const [pendingBefore] = await ownerRows(sql`select * from pending_signups`);

    expect(await signUp({ name: "Fourth", password: "a".repeat(80) })).toEqual(checkYourEmail("maya.chen@fastmail.com"));
    expect(fakeEmails()).toHaveLength(3);
    expect(await ownerRows(sql`select * from pending_signups`)).toEqual([pendingBefore]);

    advance(HOUR_MS);
    expect(await signUp()).toEqual(checkYourEmail("maya.chen@fastmail.com"));
    expect(fakeEmails()).toHaveLength(4);
    expect(await pressVerify(savedLink)).toEqual({ linkDoesNotWork: true });
  });

  it("the 6th signup for one email in a day is refused, with the hourly limit never reached", async () => {
    for (let count = 0; count < 5; count++) {
      await signUp();
      advance(HOUR_MS);
    }
    expect(fakeEmails()).toHaveLength(5);
    expect(await signUp()).toEqual(checkYourEmail("maya.chen@fastmail.com"));
    expect(fakeEmails()).toHaveLength(5);
  });

  it("the 11th signup from one IP address in an hour is refused, for any email", async () => {
    for (let count = 0; count < 10; count++) await signUp({ email: `student${count}@example.test` });
    expect(await signUp({ email: "eleventh@example.test" })).toEqual(checkYourEmail("eleventh@example.test"));
    expect(await pendingEmails()).not.toContain("eleventh@example.test");
    expect(fakeEmails()).toHaveLength(10);

    request.ip = "198.51.100.7";
    await signUp({ email: "eleventh@example.test" });
    expect(await pendingEmails()).toContain("eleventh@example.test");
  });

  it("a refused signup for a Google Account's email sends nothing either", async () => {
    await database.createAccountAsOwner({ email: "maya.chen@fastmail.com", name: "Maya" });
    for (let count = 0; count < 4; count++) await signUp();
    expect(fakeEmails()).toHaveLength(3);
  });
});

describe("verification", () => {
  it("opening the link page uses nothing; only the button press makes the Account", async () => {
    await signUp();
    const token = linkTokenIn(fakeEmails()[0].text);
    for (let count = 0; count < 2; count++) await VerifyEmailPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ token }) });
    expect(await pendingEmails()).toEqual(["maya.chen@fastmail.com"]);
    expect(await accountsNow()).toEqual([]);

    expect(await pressVerify(token)).toEqual({ redirectedTo: "/login?notice=EmailVerified" });
    expect(await pendingEmails()).toEqual([]);
    expect(await accountsNow()).toHaveLength(1);
  });

  it("a used, expired, or unknown link shows the one link-doesn't-work message and makes nothing", async () => {
    await signUp({ email: "used@example.test" });
    const used = linkTokenIn(fakeEmails()[0].text);
    await pressVerify(used);
    expect(await pressVerify(used)).toEqual({ linkDoesNotWork: true });

    await signUp({ email: "expired@example.test" });
    const expired = linkTokenIn(fakeEmails()[1].text);
    advance(24 * HOUR_MS);
    expect(await pressVerify(expired)).toEqual({ linkDoesNotWork: true });

    expect(await pressVerify("not-a-real-token")).toEqual({ linkDoesNotWork: true });
    expect(await pressVerify("")).toEqual({ linkDoesNotWork: true });
    expect((await accountsNow()).map((account) => account.email)).toEqual(["used@example.test"]);
  });

  it("a link still works just before 24 hours", async () => {
    await signUp();
    advance(24 * HOUR_MS - 1000);
    expect(await pressVerify(linkTokenIn(fakeEmails()[0].text))).toEqual({ redirectedTo: "/login?notice=EmailVerified" });
  });

  it("when an Account with the email exists by then, removes the pending signup and makes nothing", async () => {
    await signUp();
    await database.createAccountAsOwner({ email: "maya.chen@fastmail.com", name: "Maya on Google" });
    const before = await accountsNow();

    expect(await pressVerify(linkTokenIn(fakeEmails()[0].text))).toEqual({ redirectedTo: "/login" });
    expect(await accountsNow()).toEqual(before);
    expect(await pendingEmails()).toEqual([]);
  });

  it("two presses at the same time make one Account", async () => {
    await signUp();
    const token = linkTokenIn(fakeEmails()[0].text);
    const results = await Promise.all([pressVerify(token), pressVerify(token)]);
    expect(results).toContainEqual({ linkDoesNotWork: true });
    expect(results).toContainEqual({ redirectedTo: "/login?notice=EmailVerified" });
    expect(await accountsNow()).toHaveLength(1);
  });
});

describe("first password sign-in", () => {
  async function verifiedStudent(email = "maya.chen@fastmail.com") {
    await signUp({ email });
    await pressVerify(linkTokenIn(fakeEmails().at(-1)!.text));
    return (await ownerRows(sql`select id from accounts where email = ${email}`))[0].id as string;
  }

  it("signs the new student in and sends them to the student landing page", async () => {
    const id = await verifiedStudent();
    const { redirectedTo, cookie } = await logIn("Maya.Chen@Fastmail.com", PASSWORD);
    expect(redirectedTo).toBe("http://localhost:3000/login");
    expect(await sessionUser(cookie)).toEqual({ id, role: "student" });
    expect(await landingAfterLogin(cookie)).toBe("http://localhost:3000/dashboard");
  });

  it.each([
    ["a wrong password", "maya.chen@fastmail.com", "wrong horse battery staple"],
    ["an unknown email", "nobody@example.test", PASSWORD],
    ["a password over 72 bytes", "maya.chen@fastmail.com", PASSWORD.padEnd(73, "x")],
  ])("refuses %s with the wrong-email-or-password notice and no session", async (_case, email, password) => {
    await verifiedStudent();
    expect(await logIn(email, password)).toEqual({ redirectedTo: "/login?error=CredentialsSignin", cookie: "" });
  });

  it("refuses a pending signup that has not been verified", async () => {
    await signUp();
    expect((await logIn("maya.chen@fastmail.com", PASSWORD)).cookie).toBe("");
  });

  it("refuses an Admin and a disabled Account even with the right password", async () => {
    const id = await verifiedStudent();
    await database.owner.execute(sql`update accounts set disabled_at = now() where id = ${id}`);
    expect((await logIn("maya.chen@fastmail.com", PASSWORD)).cookie).toBe("");

    const [{ password_hash: hash }] = await ownerRows(sql`select password_hash from accounts where id = ${id}`);
    await database.owner.execute(sql`delete from accounts`);
    await expect(database.owner.execute(sql`
      insert into accounts (email, name, password_hash, role) values ('admin@example.test', 'Admin', ${hash}, 'admin')
    `)).rejects.toMatchObject({ cause: { constraint: "accounts_admin_without_password" } });
  });

  it.each([
    ["a raised session version", sql`update accounts set session_version = session_version + 1`],
    ["a disabled Account", sql`update accounts set disabled_at = now()`],
  ])("follows the Stage 4 session rules: %s ends the session", async (_case, change) => {
    const id = await verifiedStudent();
    const { cookie } = await logIn("maya.chen@fastmail.com", PASSWORD);
    expect(await sessionUser(cookie)).toEqual({ id, role: "student" });
    await database.owner.execute(change);
    expect(await sessionUser(cookie)).toBeNull();
  });

  it("follows the Stage 4 session rules: a session in daily use still ends 30 days after sign-in", async () => {
    await verifiedStudent();
    let { cookie } = await logIn("maya.chen@fastmail.com", PASSWORD);
    for (let day = 1; day < 30; day++) {
      advance(24 * HOUR_MS);
      ({ cookie } = await readSession(cookie));
      expect(cookie).not.toBe("");
    }
    advance(24 * HOUR_MS);
    expect((await readSession(cookie)).user).toBeNull();
  });
});
