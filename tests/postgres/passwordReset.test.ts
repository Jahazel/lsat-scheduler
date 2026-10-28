import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import { z } from "zod";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setUpAppTestDatabase } from "./appTestDatabase";
import { clearFakeEmails, fakeEmails } from "../../src/lib/email";
import { hashPassword } from "../../src/lib/passwordHash";
import { requestPasswordReset, type ForgotPasswordState } from "../../src/app/forgot-password/actions";
import { resetPassword } from "../../src/app/reset-password/actions";
import ResetPasswordPage from "../../src/app/reset-password/page";
import { signUpWithPassword } from "../../src/app/signup/actions";
import { verifyEmail } from "../../src/app/verify-email/actions";
import { logInWithPassword } from "../../src/app/login/actions";
import { PASSWORD_LOGIN_NOTICES } from "../../src/lib/loginNotice";
import { accountSessionToken } from "../../src/lib/accountSession";
import { findPendingSignup } from "../../src/lib/pendingSignupRepository";
import { resendVerificationLink } from "../../src/lib/passwordAccount";
import { handlers, passwordSignInAccount } from "../../src/auth";

const COOKIE = "authjs.session-token";
const MINUTE_MS = 60 * 1000;
const OLD_PASSWORD = "correct horse battery staple";
const NEW_PASSWORD = "purple walrus dances at noon";
const MAYA = "maya.chen@fastmail.com";

const { originalSecret, request } = vi.hoisted(() => {
  // Auth.js reads its secret when src/auth loads, before any hook runs.
  const originalSecret = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "password-reset-test-secret-0123456789";
  return { originalSecret, request: { ip: "203.0.113.1", setCookie: vi.fn() } };
});
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "localhost:3000", "x-forwarded-proto": "http", "x-vercel-forwarded-for": request.ip }),
  cookies: async () => ({ set: request.setCookie }),
}));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

const database = setUpAppTestDatabase();
let oldPasswordHash: string;
beforeAll(async () => {
  for (const name of ["RESEND_API_KEY", "EMAIL_FROM", "SITE_URL", "VERCEL"]) vi.stubEnv(name, "");
  oldPasswordHash = await hashPassword(OLD_PASSWORD);
});
beforeEach(async () => {
  request.ip = "203.0.113.1";
  request.setCookie.mockReset();
  clearFakeEmails();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-27T12:00:00Z"));
  await database.owner.execute(sql`truncate accounts, pending_signups, reset_tokens, action_counters cascade`);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
afterAll(() => {
  vi.unstubAllEnvs();
  process.env.AUTH_SECRET = originalSecret;
});

const advance = (ms: number) => vi.setSystemTime(Date.now() + ms);
const ownerRows = async (query: ReturnType<typeof sql>) => (await database.owner.execute(query)).rows;
const resetTokenRows = () => ownerRows(sql`
  select account_id, token_hash, extract(epoch from expires_at)::float * 1000 as expires_at_ms from reset_tokens
`);

async function passwordAccount(email = MAYA) {
  const [{ id }] = await ownerRows(sql`
    insert into accounts (email, name, password_hash) values (${email}, 'Maya Chen', ${oldPasswordHash}) returning id
  `);
  return id as string;
}

async function googleAccount(email: string) {
  await ownerRows(sql`insert into accounts (email, name, google_id) values (${email}, 'Gil Ortiz', ${`google-${email}`})`);
}

function emailForm(email: string) {
  const form = new FormData();
  form.set("email", email);
  return form;
}
function patSignupForm() {
  const form = emailForm("pat.lee@fastmail.com");
  form.set("name", "Pat Lee");
  form.set("password", OLD_PASSWORD);
  form.set("agreedToTerms", "on");
  return form;
}
const signUpPat = () => signUpWithPassword({ kind: "form", errors: {} }, patSignupForm());
const forgot = (email: string) => requestPasswordReset({ kind: "form" }, emailForm(email));
const sent = (email: string): ForgotPasswordState => ({ kind: "sent", email });

function linkTokenIn(text: string, path: "/reset-password" | "/verify-email") {
  const token = new RegExp(`${path}\\?token=([\\w-]+)`).exec(text)?.[1];
  if (!token) throw new Error(`The email has no ${path} link.`);
  return token;
}
const lastResetToken = () => linkTokenIn(fakeEmails().at(-1)!.text, "/reset-password");

async function pressSave(token: string, password = NEW_PASSWORD) {
  const form = new FormData();
  form.set("token", token);
  form.set("password", password);
  return resetPassword({ kind: "form" }, form).then(
    (state) => ({ state, redirectedTo: null }),
    (error: Error) => {
      if (!error.message.startsWith("redirect:")) throw error;
      return { state: null, redirectedTo: error.message.slice("redirect:".length) };
    },
  );
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

const openResetPage = async (token: string) =>
  renderToStaticMarkup(await ResetPasswordPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ token }) }));

describe("forgot password", () => {
  it("shows one screen for an unknown email, a password Account, a Google Account, and a pending signup", async () => {
    await passwordAccount();
    await googleAccount("gil.ortiz@gmail.com");
    await signUpPat();
    clearFakeEmails();

    for (const email of ["nobody@fastmail.com", MAYA, "gil.ortiz@gmail.com", "pat.lee@fastmail.com"]) {
      expect(await forgot(email)).toEqual(sent(email));
    }

    expect(fakeEmails().map(({ to, subject }) => ({ to, subject }))).toEqual([
      { to: MAYA, subject: "Reset your DrillMap password" },
      { to: "gil.ortiz@gmail.com", subject: "You sign in to DrillMap with Google" },
      { to: "pat.lee@fastmail.com", subject: "Verify your email for DrillMap" },
    ]);
    expect(fakeEmails()[0].text).toContain("works once, for 30 minutes");
    expect(fakeEmails()[1].text).toContain("asked to reset the DrillMap password");
    expect(fakeEmails()[1].text).not.toContain("/reset-password");
  });

  it("matches the email without regard to case or spaces, and shows it as typed after trimming", async () => {
    await passwordAccount();
    expect(await forgot("  Maya.Chen@Fastmail.com ")).toEqual(sent("maya.chen@fastmail.com"));
    expect(fakeEmails()).toHaveLength(1);
  });

  it("asks again for an email that is not valid, and counts and sends nothing", async () => {
    expect(await forgot("not-an-email")).toEqual({ kind: "form", error: "Enter a valid email." });
    expect(fakeEmails()).toEqual([]);
    expect(await ownerRows(sql`select * from action_counters`)).toEqual([]);
  });

  it("stores only the SHA-256 hash of the reset token, with a 30-minute expiry", async () => {
    const id = await passwordAccount();
    await forgot(MAYA);
    const token = lastResetToken();
    expect(await resetTokenRows()).toEqual([{
      account_id: id,
      token_hash: createHash("sha256").update(token).digest("hex"),
      expires_at_ms: Date.now() + 30 * MINUTE_MS,
    }]);
  });

  it("for a pending signup, sends a new verification link that works, and the older link stops working", async () => {
    await signUpPat();
    const older = linkTokenIn(fakeEmails()[0].text, "/verify-email");

    await forgot("pat.lee@fastmail.com");
    const newer = linkTokenIn(fakeEmails()[1].text, "/verify-email");
    expect(fakeEmails()[1].text).toContain("Hi Pat Lee,");

    const press = async (token: string) => {
      const form = new FormData();
      form.set("token", token);
      return verifyEmail({ linkDoesNotWork: false }, form).catch((error: Error) => error.message);
    };
    expect(await press(older)).toEqual({ linkDoesNotWork: true });
    expect(await press(newer)).toBe("redirect:/login?notice=EmailVerified");
    expect((await logIn("pat.lee@fastmail.com", OLD_PASSWORD)).cookie).not.toBe("");
  });
});

describe("reset link", () => {
  it("opening the reset page uses nothing; it shows the form for a working link and the message for a bad one", async () => {
    await passwordAccount();
    await forgot(MAYA);
    const token = lastResetToken();

    const page = await openResetPage(token);
    expect(page).toContain("Set a new password");
    expect(page).toContain(`value="${token}"`);
    expect(await resetTokenRows()).toHaveLength(1);

    expect(await openResetPage("not-a-real-token")).toContain("This link doesn&#x27;t work");
    expect(await openResetPage("")).toContain("This link doesn&#x27;t work");
  });

  it("saving sets the password, removes the token, signs out every device, and sends the browser to Login", async () => {
    const id = await passwordAccount();
    const firstDevice = await logIn(MAYA, OLD_PASSWORD);
    const secondDevice = await logIn(MAYA, OLD_PASSWORD);
    expect(await sessionUserId(firstDevice.cookie)).toBe(id);
    expect(await sessionUserId(secondDevice.cookie)).toBe(id);

    await forgot(MAYA);
    expect(await pressSave(lastResetToken())).toEqual({ state: null, redirectedTo: "/login?notice=PasswordChanged" });

    expect(await resetTokenRows()).toEqual([]);
    expect(await sessionUserId(firstDevice.cookie)).toBeNull();
    expect(await sessionUserId(secondDevice.cookie)).toBeNull();
    expect((await logIn(MAYA, OLD_PASSWORD)).refused?.notice).toEqual(PASSWORD_LOGIN_NOTICES.wrongEmailOrPassword);
    const newSignIn = await logIn(MAYA, NEW_PASSWORD);
    expect(await sessionUserId(newSignIn.cookie)).toBe(id);
  });

  it("a login that checked the old password just before the save gets no session", async () => {
    await passwordAccount();
    await forgot(MAYA);
    const checkedUser = await passwordSignInAccount({ email: MAYA, password: OLD_PASSWORD });
    expect(checkedUser).not.toBeNull();
    expect((await pressSave(lastResetToken())).redirectedTo).toBe("/login?notice=PasswordChanged");

    const token = await accountSessionToken({
      token: {}, user: checkedUser!, account: { provider: "credentials", type: "credentials", providerAccountId: checkedUser!.id },
    });
    expect(token).toBeNull();
  });

  it("works once", async () => {
    await passwordAccount();
    await forgot(MAYA);
    const token = lastResetToken();
    expect((await pressSave(token)).redirectedTo).toBe("/login?notice=PasswordChanged");
    expect(await pressSave(token, "a different long passphrase")).toEqual({ state: { kind: "linkDoesNotWork" }, redirectedTo: null });
    expect((await logIn(MAYA, NEW_PASSWORD)).cookie).not.toBe("");
  });

  it("works just before 30 minutes and not at 30 minutes", async () => {
    await passwordAccount();
    await forgot(MAYA);
    const token = lastResetToken();
    advance(30 * MINUTE_MS);
    expect(await pressSave(token)).toEqual({ state: { kind: "linkDoesNotWork" }, redirectedTo: null });
    expect(await openResetPage(token)).toContain("This link doesn&#x27;t work");

    await forgot(MAYA);
    const fresh = lastResetToken();
    advance(30 * MINUTE_MS - 1000);
    expect((await pressSave(fresh)).redirectedTo).toBe("/login?notice=PasswordChanged");
  });

  it("stops working when a newer link is requested", async () => {
    await passwordAccount();
    await forgot(MAYA);
    const older = lastResetToken();
    await forgot(MAYA);
    const newer = lastResetToken();
    expect(await pressSave(older)).toEqual({ state: { kind: "linkDoesNotWork" }, redirectedTo: null });
    expect((await pressSave(newer)).redirectedTo).toBe("/login?notice=PasswordChanged");
  });

  it("refuses a password that breaks the password rules, and keeps the link and the old password", async () => {
    await passwordAccount();
    await forgot(MAYA);
    const token = lastResetToken();

    expect(await pressSave(token, "short")).toEqual({
      state: { kind: "form", error: "That password is too short. Use at least 8 characters." }, redirectedTo: null,
    });
    expect(await pressSave(token, "a".repeat(73))).toEqual({
      state: { kind: "form", error: "That password is too long. Try a shorter one." }, redirectedTo: null,
    });
    for (const common of ["password123", "DrillMap", MAYA.toUpperCase()]) {
      expect(await pressSave(token, common)).toEqual({
        state: { kind: "form", error: "This password is too common. Choose a password that's harder to guess." }, redirectedTo: null,
      });
    }
    expect(await resetTokenRows()).toHaveLength(1);
    expect((await logIn(MAYA, OLD_PASSWORD)).cookie).not.toBe("");
    expect((await pressSave(token)).redirectedTo).toBe("/login?notice=PasswordChanged");
  });

  it("two saves at the same time change the password once", async () => {
    const id = await passwordAccount();
    await forgot(MAYA);
    const token = lastResetToken();
    const results = await Promise.all([pressSave(token), pressSave(token, "another long passphrase here")]);
    expect(results.filter((result) => result.redirectedTo === "/login?notice=PasswordChanged")).toHaveLength(1);
    expect(results.filter((result) => result.state?.kind === "linkDoesNotWork")).toHaveLength(1);
    expect(await ownerRows(sql`select session_version from accounts where id = ${id}`)).toEqual([{ session_version: 1 }]);
  });
});

describe("reset limits", () => {
  it("the 4th request for one email in an hour shows the same screen and sends nothing, until the hour ends", async () => {
    await passwordAccount();
    for (let request = 0; request < 3; request++) await forgot(MAYA);
    const [tokenBefore] = await resetTokenRows();
    expect(await forgot(MAYA)).toEqual(sent(MAYA));
    expect(fakeEmails()).toHaveLength(3);
    expect(await resetTokenRows()).toEqual([tokenBefore]);

    vi.setSystemTime(new Date("2026-10-27T13:00:00Z"));
    await forgot(MAYA);
    expect(fakeEmails()).toHaveLength(4);
  });

  it("the 11th request from one IP address in an hour sends nothing, for any email", async () => {
    await passwordAccount();
    for (let request = 0; request < 10; request++) await forgot(`someone-${request}@fastmail.com`);
    expect(await forgot(MAYA)).toEqual(sent(MAYA));
    expect(fakeEmails()).toEqual([]);
    expect(await resetTokenRows()).toEqual([]);

    request.ip = "203.0.113.2";
    await forgot(MAYA);
    expect(fakeEmails()).toHaveLength(1);
  });

  it("a pending signup's new link counts against the signup email limits", async () => {
    await signUpPat();
    await signUpPat();
    await forgot("pat.lee@fastmail.com");
    expect(fakeEmails()).toHaveLength(3);
    const [pendingBefore] = await ownerRows(sql`select token_hash from pending_signups`);

    expect(await forgot("pat.lee@fastmail.com")).toEqual(sent("pat.lee@fastmail.com"));
    expect(fakeEmails()).toHaveLength(3);
    expect(await ownerRows(sql`select token_hash from pending_signups`)).toEqual([pendingBefore]);
    expect(await signUpPat()).toEqual({ kind: "checkYourEmail", email: "pat.lee@fastmail.com" });
    expect(fakeEmails()).toHaveLength(3);
  });

  it("a pending signup's new link counts against the signup limit for the IP address", async () => {
    await signUpPat();
    for (let signup = 0; signup < 9; signup++) {
      const form = patSignupForm();
      form.set("email", `someone-${signup}@fastmail.com`);
      await signUpWithPassword({ kind: "form", errors: {} }, form);
    }
    clearFakeEmails();
    const [pendingBefore] = await ownerRows(sql`select token_hash from pending_signups where email = 'pat.lee@fastmail.com'`);

    expect(await forgot("pat.lee@fastmail.com")).toEqual(sent("pat.lee@fastmail.com"));
    expect(fakeEmails()).toEqual([]);
    expect(await ownerRows(sql`select token_hash from pending_signups where email = 'pat.lee@fastmail.com'`)).toEqual([pendingBefore]);
  });

  it("a new link that loses to a newer signup gives back its signup counts", async () => {
    await signUpPat();
    const pending = await findPendingSignup("pat.lee@fastmail.com", new Date());
    await signUpPat();
    const countsBefore = await ownerRows(sql`select action, count from action_counters where action like 'signup%' order by action`);

    await resendVerificationLink("pat.lee@fastmail.com", pending!, { ipAddress: request.ip, realNow: new Date() });
    expect(fakeEmails()).toHaveLength(2);
    expect(await ownerRows(sql`select action, count from action_counters where action like 'signup%' order by action`)).toEqual(countsBefore);
  });
});
