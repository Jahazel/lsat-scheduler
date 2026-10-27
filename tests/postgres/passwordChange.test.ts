import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import { z } from "zod";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppTestDatabase } from "./appTestDatabase";
import { closePostgresDatabase } from "../../src/lib/postgres";
import { hashPassword } from "../../src/lib/passwordHash";
import { createStudent } from "../../src/lib/studentRepository";
import type { Student } from "../../src/lib/types";
import { logInWithPassword } from "../../src/app/login/actions";
import { changePassword, deleteAccount } from "../../src/app/account/actions";
import AccountPage from "../../src/app/account/page";
import { handlers } from "../../src/auth";
import { PASSWORD_LOGIN_NOTICES } from "../../src/lib/loginNotice";
import { changePassword as saveNewPassword, deletePasswordAccount, findPasswordAccountById, isAccountId } from "../../src/lib/accountRepository";
import { proveCurrentPassword } from "../../src/lib/currentPassword";

const COOKIE = "authjs.session-token";
const MINUTE_MS = 60 * 1000;
const OLD_PASSWORD = "correct horse battery staple";
const NEW_PASSWORD = "purple walrus dances at noon";
const MAYA = "maya.chen@fastmail.com";
const WRONG = "That's not your current password. Try again.";
const PAUSED = "Too many tries. Try again later.";

const { originalSecret, request } = vi.hoisted(() => {
  // Auth.js reads its secret when src/auth loads, before any hook runs.
  const originalSecret = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "password-change-test-secret-0123456789";
  return { originalSecret, request: { ip: "203.0.113.1", cookie: "", setCookie: vi.fn() } };
});
vi.mock("next/headers", () => ({
  headers: async () => new Headers({
    host: "localhost:3000",
    "x-forwarded-proto": "http",
    "x-vercel-forwarded-for": request.ip,
    ...(request.cookie && { cookie: `${COOKIE}=${request.cookie}` }),
  }),
  cookies: async () => ({ set: request.setCookie }),
}));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

let database: Awaited<ReturnType<typeof createAppTestDatabase>>;
let oldPasswordHash: string;
beforeAll(async () => {
  await closePostgresDatabase();
  database = await createAppTestDatabase();
  vi.stubEnv("DATABASE_URL", database.setting);
  oldPasswordHash = await hashPassword(OLD_PASSWORD);
});
beforeEach(async () => {
  request.ip = "203.0.113.1";
  request.cookie = "";
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-27T12:00:00Z"));
  await database.owner.execute(sql`truncate accounts, action_counters cascade`);
});
afterEach(() => vi.useRealTimers());
afterAll(async () => {
  await closePostgresDatabase();
  vi.unstubAllEnvs();
  process.env.AUTH_SECRET = originalSecret;
  await database?.cleanup();
});

const advance = (ms: number) => vi.setSystemTime(Date.now() + ms);
const ownerRows = async (query: ReturnType<typeof sql>) => (await database.owner.execute(query)).rows;
const profile: Student = {
  currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
};

async function passwordStudent(email = MAYA) {
  const [{ id }] = await ownerRows(sql`
    insert into accounts (email, name, password_hash) values (${email}, 'Maya Chen', ${oldPasswordHash}) returning id
  `);
  await createStudent(id as string, profile);
  return id as string;
}

async function logIn(email: string, password: string) {
  const form = new FormData();
  form.set("email", email);
  form.set("password", password);
  request.setCookie.mockReset();
  const refused = await logInWithPassword({ email: "", notice: null, passwordError: null }, form).catch(() => null);
  const cookie = request.setCookie.mock.calls.findLast(([name]) => name === COOKIE)?.[1] ?? "";
  return { refused, cookie: cookie as string };
}

const SessionBody = z.object({ user: z.object({ id: z.string() }) }).nullable();
async function sessionUserId(cookie: string) {
  const response = await handlers.GET(new NextRequest("http://localhost:3000/api/auth/session", {
    headers: { cookie: `${COOKIE}=${cookie}` },
  }));
  return SessionBody.parse(await response.json())?.user.id ?? null;
}

async function inBrowser<T>(cookie: string, action: () => Promise<T>) {
  request.cookie = cookie;
  request.setCookie.mockReset();
  return action().then(
    (state) => ({ state, redirectedTo: null }),
    (error: Error) => {
      if (!error.message.startsWith("redirect:")) throw error;
      const { pathname, search } = new URL(error.message.slice("redirect:".length), "http://localhost:3000");
      return { state: null, redirectedTo: pathname + search };
    },
  );
}

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}
const change = (cookie: string, currentPassword: string, newPassword = NEW_PASSWORD) =>
  inBrowser(cookie, () => changePassword(null, form({ currentPassword, newPassword })));
const remove = (cookie: string, currentPassword: string, confirmation = "DELETE") =>
  inBrowser(cookie, () => deleteAccount(null, form({ currentPassword, confirmation })));

const passwordHashOf = async (id: string) => (await ownerRows(sql`select password_hash from accounts where id = ${id}`))[0]?.password_hash;
const accountCount = async (id: string) =>
  (await ownerRows(sql`select (select count(*) from accounts where id = ${id})::int as accounts, (select count(*) from students where account_id = ${id})::int as students`))[0];
const counterRows = () => ownerRows(sql`select action, subject, count from action_counters order by action`);

const openAccountPage = async (cookie: string) => {
  request.cookie = cookie;
  return renderToStaticMarkup(await AccountPage());
};

describe("the Account page", () => {
  it("shows Change password and a current-password deletion field only for a password Account", async () => {
    await passwordStudent();
    const page = await openAccountPage((await logIn(MAYA, OLD_PASSWORD)).cookie);
    expect(page).toContain("Password sign-in");
    expect(page).toContain("Change password");
    expect(page).toContain('name="currentPassword"');
    expect(page).not.toContain("Sign in again to delete");
  });

  it("keeps a Google Account's page without Change password", async () => {
    const [{ id }] = await ownerRows(sql`
      insert into accounts (email, name, google_id) values ('gil.ortiz@gmail.com', 'Gil Ortiz', 'google-gil') returning id
    `);
    await createStudent(id as string, profile);
    const { encode } = await import("next-auth/jwt");
    const cookie = await encode({
      token: { id: id as string, sessionVersion: 0, signedInAt: Math.floor(Date.now() / 1000) - 11 * 60 },
      secret: process.env.AUTH_SECRET!, salt: COOKIE,
    });
    const page = await openAccountPage(cookie);
    expect(page).toContain("Google sign-in");
    expect(page).not.toContain("Change password");
    expect(page).not.toContain('name="currentPassword"');
    expect(page).toContain("Sign in again to delete");
    await expect(inBrowser(cookie, () => changePassword(null, form({ currentPassword: "x", newPassword: NEW_PASSWORD }))))
      .rejects.toThrow("This Account signs in with Google and has no password.");
  });
});

describe("change password", () => {
  it("sets the new password, signs out every browser, this one too, and sends this browser to Login", async () => {
    const id = await passwordStudent();
    const thisBrowser = await logIn(MAYA, OLD_PASSWORD);
    const otherBrowser = await logIn(MAYA, OLD_PASSWORD);

    const result = await change(thisBrowser.cookie, OLD_PASSWORD);
    expect(result).toEqual({ state: null, redirectedTo: "/login?notice=PasswordChanged" });
    expect(request.setCookie.mock.calls.some(([name, value]) => name === COOKIE && value === "")).toBe(true);

    expect(await sessionUserId(thisBrowser.cookie)).toBeNull();
    expect(await sessionUserId(otherBrowser.cookie)).toBeNull();
    expect((await logIn(MAYA, OLD_PASSWORD)).refused?.notice).toEqual(PASSWORD_LOGIN_NOTICES.wrongEmailOrPassword);
    expect(await sessionUserId((await logIn(MAYA, NEW_PASSWORD)).cookie)).toBe(id);
  });

  it("does not need a recent sign-in: the current password counts as one", async () => {
    await passwordStudent();
    const { cookie } = await logIn(MAYA, OLD_PASSWORD);
    advance(9 * 24 * 60 * MINUTE_MS);
    expect((await change(cookie, OLD_PASSWORD)).redirectedTo).toBe("/login?notice=PasswordChanged");
  });

  it("refuses a wrong current password, keeps the password, and keeps every browser signed in", async () => {
    const id = await passwordStudent();
    const { cookie } = await logIn(MAYA, OLD_PASSWORD);
    expect(await change(cookie, "not my password")).toEqual({
      state: { field: "currentPassword", message: WRONG }, redirectedTo: null,
    });
    expect(await sessionUserId(cookie)).toBe(id);
    expect(await sessionUserId((await logIn(MAYA, OLD_PASSWORD)).cookie)).toBe(id);
  });

  it("refuses a try longer than 72 bytes that starts with the current password", async () => {
    const id = await passwordStudent();
    const { cookie } = await logIn(MAYA, OLD_PASSWORD);
    const sharesFirst72Bytes = OLD_PASSWORD + "x".repeat(72 - OLD_PASSWORD.length) + "more";
    await database.owner.execute(sql`
      update accounts set password_hash = ${await hashPassword(sharesFirst72Bytes.slice(0, 72))} where id = ${id}
    `);
    expect((await change(cookie, sharesFirst72Bytes)).state).toEqual({ field: "currentPassword", message: WRONG });
  });

  it.each([
    ["too short", "seven77", "That password is too short. Use at least 8 characters."],
    ["over 72 bytes with multibyte letters", "é".repeat(37), "That password is too long. Try a shorter one."],
    ["too common", "password123", "This password is too common. Choose a password that's harder to guess."],
    ["the Account's own email", MAYA.toUpperCase(), "This password is too common. Choose a password that's harder to guess."],
    ["drillmap", "DrillMap", "This password is too common. Choose a password that's harder to guess."],
  ])("refuses a new password that is %s and keeps the old one", async (_case, newPassword, message) => {
    const id = await passwordStudent();
    const { cookie } = await logIn(MAYA, OLD_PASSWORD);
    expect(await change(cookie, OLD_PASSWORD, newPassword)).toEqual({ state: { field: "newPassword", message }, redirectedTo: null });
    expect(await sessionUserId(cookie)).toBe(id);
    expect(await sessionUserId((await logIn(MAYA, OLD_PASSWORD)).cookie)).toBe(id);
  });

  it("accepts a new password of exactly 72 bytes", async () => {
    await passwordStudent();
    const { cookie } = await logIn(MAYA, OLD_PASSWORD);
    const seventyTwoBytes = "é".repeat(36);
    expect((await change(cookie, OLD_PASSWORD, seventyTwoBytes)).redirectedTo).toBe("/login?notice=PasswordChanged");
    expect((await logIn(MAYA, seventyTwoBytes)).cookie).not.toBe("");
  });

  it("counts wrong current passwords with failed logins, pauses both after 10, and works again when the window ends", async () => {
    await passwordStudent();
    const { cookie } = await logIn(MAYA, OLD_PASSWORD);
    for (let i = 0; i < 9; i++) expect((await change(cookie, `wrong ${i}`)).state?.message).toBe(WRONG);
    expect((await logIn(MAYA, "one more wrong")).refused?.notice).toEqual(PASSWORD_LOGIN_NOTICES.wrongEmailOrPassword);

    expect((await change(cookie, OLD_PASSWORD)).state).toEqual({ field: "currentPassword", message: PAUSED });
    expect((await logIn(MAYA, OLD_PASSWORD)).refused?.notice).toEqual(PASSWORD_LOGIN_NOTICES.paused);

    advance(15 * MINUTE_MS);
    expect((await change(cookie, OLD_PASSWORD)).redirectedTo).toBe("/login?notice=PasswordChanged");
  });

  it("gives back the count for a right current password, even when the new password is refused", async () => {
    await passwordStudent();
    const { cookie } = await logIn(MAYA, OLD_PASSWORD);
    await change(cookie, OLD_PASSWORD, "short");
    expect(await counterRows()).toEqual([]);
  });
});

describe("password Account deletion", () => {
  it("deletes the Account with the current password and DELETE, with no recent sign-in", async () => {
    const id = await passwordStudent();
    const { cookie } = await logIn(MAYA, OLD_PASSWORD);
    advance(9 * 24 * 60 * MINUTE_MS);
    expect(await remove(cookie, OLD_PASSWORD)).toEqual({ state: null, redirectedTo: "/" });
    expect(await accountCount(id)).toEqual({ accounts: 0, students: 0 });
    expect(await sessionUserId(cookie)).toBeNull();
  });

  it("refuses a wrong password and keeps the Account", async () => {
    const id = await passwordStudent();
    const { cookie } = await logIn(MAYA, OLD_PASSWORD);
    expect(await remove(cookie, "not my password")).toEqual({ state: "wrong-password", redirectedTo: null });
    expect(await accountCount(id)).toEqual({ accounts: 1, students: 1 });
  });

  it("checks the DELETE text first, so a wrong-text try counts no password try", async () => {
    const id = await passwordStudent();
    const { cookie } = await logIn(MAYA, OLD_PASSWORD);
    expect((await remove(cookie, "not my password", "delete")).state).toBe("wrong-text");
    expect(await counterRows()).toEqual([]);
    expect(await accountCount(id)).toEqual({ accounts: 1, students: 1 });
  });

  it("shares the wrong-password limit with Change password and login", async () => {
    const id = await passwordStudent();
    const { cookie } = await logIn(MAYA, OLD_PASSWORD);
    for (let i = 0; i < 5; i++) await change(cookie, `wrong ${i}`);
    for (let i = 0; i < 5; i++) expect((await remove(cookie, `wrong ${i}`)).state).toBe("wrong-password");
    expect((await remove(cookie, OLD_PASSWORD)).state).toBe("paused");
    expect(await accountCount(id)).toEqual({ accounts: 1, students: 1 });
  });
});

describe("a reset between the password check and the write", () => {
  it("stops both the change and the deletion, so the reset's password stays", async () => {
    const id = await passwordStudent();
    if (!isAccountId(id)) throw new Error("The fixture should make an Account ID.");
    const account = await findPasswordAccountById(id);
    const check = await proveCurrentPassword(account!, OLD_PASSWORD);
    if (check.kind !== "proven") throw new Error("The old password should match.");
    const resetHash = await hashPassword("a password set by a reset link");
    await database.owner.execute(sql`update accounts set password_hash = ${resetHash} where id = ${id}`);

    expect(await saveNewPassword(check.proof, await hashPassword(NEW_PASSWORD))).toBe(false);
    expect(await deletePasswordAccount(check.proof)).toBe(false);
    expect(await passwordHashOf(id)).toBe(resetHash);
    expect(await accountCount(id)).toEqual({ accounts: 1, students: 1 });
  });
});
