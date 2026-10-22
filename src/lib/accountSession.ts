import type { Account, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { findAccountByGoogleId, findAccountById } from "./accountRepository";

const DAY_SECONDS = 24 * 60 * 60;
// Auth.js re-signs the cookie with this lifetime on every read, so it is the idle limit.
export const SESSION_IDLE_SECONDS = 14 * DAY_SECONDS;
const SIGN_IN_LIMIT_SECONDS = { student: 30 * DAY_SECONDS, admin: DAY_SECONDS } as const;
const RECENT_SIGN_IN_SECONDS = 10 * 60;

export function signedInRecently(signedInAt: number | undefined) {
  return signedInAt !== undefined && Math.floor(Date.now() / 1000) - signedInAt <= RECENT_SIGN_IN_SECONDS;
}

type SessionAccount = NonNullable<Awaited<ReturnType<typeof findAccountById>>>;

/**
 * The Auth.js `jwt` callback. It runs on sign-in and on every session read,
 * and returns null to end the session.
 */
export async function accountSessionToken({ token, user, account }: {
  token: JWT;
  user?: User;
  account?: Account | null;
}): Promise<JWT | null> {
  const now = Math.floor(Date.now() / 1000);
  if (!user) return checkedToken(token, await findAccountById(token.id), now);
  if (account?.provider !== "google") return null;

  const current = await findAccountByGoogleId(account.providerAccountId);
  if (!current) return null;
  return checkedToken({ ...token, id: current.id, sessionVersion: current.sessionVersion, signedInAt: now }, current, now);
}

function checkedToken(token: JWT, current: SessionAccount | null, now: number): JWT | null {
  if (!current || current.disabledAt || token.sessionVersion !== current.sessionVersion) return null;
  if (typeof token.signedInAt !== "number" || now - token.signedInAt >= SIGN_IN_LIMIT_SECONDS[current.role]) return null;
  return { ...token, role: current.role };
}
