import { createHmac, randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { CredentialsSignin } from "next-auth";
import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { findAccountByEmail, isAccountId } from "./accountRepository";
import { clientIpAddress } from "./clientIpAddress";
import type { LimitedAction } from "./actionLimits";
import type { DeletionRefusal, LoginRefusal } from "./passwordAccount";
import type { VerificationResult } from "./pendingSignupRepository";
import { getPostgresDatabase } from "./postgres";
import type { ForgedRequestRefusal } from "./requestPolicy";
import type { ScanRefusal } from "./scanPlaces";
import { UNEXPECTED_FAILURE_MESSAGE, type Answer, type FailureCode } from "./unexpectedFailure";

export type SecurityLogRoute = `/${string}`;

type AppEvents = {
  sign_in: "signedIn" | LoginRefusal | "usesPassword" | "googleRefused";
  sign_out_all_devices: "done";
  email_verification: VerificationResult;
  password_reset_request: "passwordAccount" | "googleAccount" | "pendingSignup" | "noAccount" | "paused";
  password_reset: "changed" | "linkDoesNotWork";
  password_change: "changed" | "wrong-password" | "paused";
  account_deletion: "deleted" | DeletionRefusal;
  student_data_refused: "refused";
  admin_action_refused: "refused";
  limit_refused: LimitedAction | ScanRefusal["refused"];
  budget_cutoff: "limitReached";
  forged_request_refused: ForgedRequestRefusal["result"];
};

export type Subject = { account: string } | { nobody: true };
export const NOBODY: Subject = { nobody: true };

export type SecurityEntry = {
  [E in keyof AppEvents]: {
    event: E;
    result: AppEvents[E];
    route: SecurityLogRoute;
    who: E extends "sign_in" ? SignInSubject : Subject;
    /** Read from the request when not given. */
    ipAddress?: string;
  };
}[keyof AppEvents];

export type SecurityEvent = SecurityEntry["event"];
export type SecurityResult<E extends SecurityEvent> = Extract<SecurityEntry, { event: E }>["result"];
export type SignInSubject = Subject | { unknownEmail: string };

/** Who a sign-in names: its Account when the email has one, or else the email itself, which the log stores only as a hash. */
export async function signInSubject(email: string | null): Promise<SignInSubject> {
  if (email === null) return NOBODY;
  const account = await findAccountByEmail(email);
  return account ? { account: account.id } : { unknownEmail: email };
}

const SAFE_ERROR_TYPE = /^[A-Za-z0-9_.:]{1,80}$/;
const SAFE_IP_ADDRESS = /^[0-9A-Fa-f:.]{2,45}$/;

export function errorTypeOf(error: unknown) {
  if (!(error instanceof Error)) return "unknown";
  const cause = error.cause instanceof Error ? error.cause : error;
  const code = "code" in cause && typeof cause.code === "string" && /^([0-9A-Z]{5}|E[A-Z]+)$/.test(cause.code)
    ? `:${cause.code}` : "";
  const type = `${error.name}${code}`;
  return SAFE_ERROR_TYPE.test(type) ? type : "unknown";
}

function emailHash(email: string) {
  const key = process.env.AUTH_SECRET;
  if (!key) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", key).update(email).digest("hex");
}

/**
 * Writes one entry after the action's own change is saved. Never throws: a failed write goes to the server log.
 * An Account deleted a moment before, as in account deletion itself, leaves the Account ID empty.
 */
export async function recordSecurityEvent({ event, result, route, who, ipAddress }: SecurityEntry) {
  try {
    const accountId = "account" in who && isAccountId(who.account) ? who.account : null;
    const ip = ipAddress ?? await clientIpAddress().catch(() => "unknown");
    await getPostgresDatabase().execute(sql`
      insert into security_log (event, result, route, account_id, ip_address, email_hash) values (
        ${event}, ${result}, ${route}, (select id from accounts where id = ${accountId}::uuid),
        ${SAFE_IP_ADDRESS.test(ip) ? ip : "unknown"},
        ${"unknownEmail" in who ? emailHash(who.unknownEmail) : null}
      )
    `);
  } catch (logError) {
    console.error(`Security log write failed (${event}): ${errorTypeOf(logError)}`);
  }
}

/** Runs a Server Action's work. Redirects and other Next.js control flow pass through; any other error is logged and answered with its code. */
export async function answerAction<T>(route: SecurityLogRoute, work: () => Promise<T>): Promise<Answer<T>> {
  try {
    return await work();
  } catch (error) {
    unstable_rethrow(error);
    return { unexpectedFailure: (await recordUnexpectedFailure(route, error)).code };
  }
}

/** Runs a Route Handler's work. Any error is logged and answered with HTTP 500 and its code. */
export async function answerRequest(route: SecurityLogRoute, work: () => Promise<Response>): Promise<Response> {
  try {
    return await work();
  } catch (error) {
    unstable_rethrow(error);
    return NextResponse.json(await recordUnexpectedFailure(route, error), { status: 500 });
  }
}

/** Auth.js copies `code` into the Login URL only for a CredentialsSignin; the type keeps it off the wrong-password notice. */
class GoogleSignInFailed extends CredentialsSignin {
  static type = "AccessDenied" as const;

  constructor(readonly code: FailureCode) {
    super();
  }
}

/** Runs the Google work of an Auth.js callback. Auth.js hides thrown errors, so a failure is logged here and Login gets its code. */
export async function answerGoogleSignIn<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    unstable_rethrow(error);
    throw new GoogleSignInFailed((await recordUnexpectedFailure("/api/auth/callback/google", error)).code);
  }
}

async function recordUnexpectedFailure(route: SecurityLogRoute, error: unknown) {
  const code = randomBytes(4).toString("hex") as FailureCode;
  const errorType = errorTypeOf(error);
  console.error(`Unexpected failure on ${route} (${code}): ${errorType}`);
  try {
    await getPostgresDatabase().execute(sql`
      insert into security_log (event, result, route, error_code, error_type) values ('unexpected_failure', 'failed', ${route}, ${code}, ${errorType})
    `);
  } catch (logError) {
    console.error(`Security log write failed (${code}): ${errorTypeOf(logError)}`);
  }
  return { error: UNEXPECTED_FAILURE_MESSAGE, code };
}
