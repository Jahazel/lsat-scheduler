import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { resetYourPassword, verifyYourEmail, youAlreadyHaveAnAccount, youSignInWithGoogle } from "./accountEmails";
import { attemptAccountDeletion } from "./accountDeletion";
import {
  findAccountByEmail, findPasswordAccountByEmail, findPasswordAccountById, markGoogleAccountDeleting, markPasswordAccountDeleting, replacePasswordHash,
  signInMethodForEmail, type AccountId,
} from "./accountRepository";
import { signedInRecently } from "./accountSession";
import { countAll, giveBack, loginTryCounts, signupCounts } from "./actionLimits";
import { normalizeEmail, sendEmail } from "./email";
import { hashPassword, passwordMatches } from "./passwordHash";
import { findResetLinkEmail, saveResetToken, setPasswordWithResetLink } from "./passwordResetRepository";
import { newPasswordProblem, passwordTooLong, type PasswordProblem } from "./passwordRules";
import {
  createAccountFromPendingSignup, findPendingSignup, replaceVerificationToken, savePendingSignup, type VerificationResult,
} from "./pendingSignupRepository";
import { NOBODY, recordSecurityEvent, signInSubject, type SecurityLogRoute, type SecurityResult } from "./securityLog";

export type PasswordRequest = { route: SecurityLogRoute; ipAddress: string; realNow: Date };

export const EmailField = z.string().transform(normalizeEmail)
  .pipe(z.string().max(254, "Enter a valid email.").pipe(z.email("Enter a valid email.")));

function newEmailToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashEmailToken(token) };
}

function hashEmailToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function signUp(
  { name, email, password }: { name: string; email: string; password: string },
  request: PasswordRequest,
): Promise<"checkYourEmail" | PasswordProblem> {
  const { ipAddress, realNow } = request;
  const refusal = await countAll(signupCounts(email, ipAddress), request, () => newPasswordProblem(password, email));
  if (refusal === "overLimit") return "checkYourEmail";
  if (refusal) return refusal;

  const method = await signInMethodForEmail(email);
  if (method === "password") {
    await sendEmail(youAlreadyHaveAnAccount(email));
  } else if (method === "google") {
    await sendEmail(youSignInWithGoogle(email, "signup"));
  } else {
    const { token, tokenHash } = newEmailToken();
    await savePendingSignup({ email, name, passwordHash: await hashPassword(password), tokenHash }, realNow);
    await sendEmail(verifyYourEmail(email, name, token));
  }
  return "checkYourEmail";
}

export async function verifyEmail(token: string, request: PasswordRequest): Promise<VerificationResult> {
  const { result, accountId } = await createAccountFromPendingSignup(hashEmailToken(token), request.realNow);
  await recordSecurityEvent({
    event: "email_verification", result, route: request.route, who: accountId ? { account: accountId } : NOBODY, ipAddress: request.ipAddress,
  });
  return result;
}

export async function resendVerificationLink(
  email: string, pending: { name: string; passwordHash: string }, request: PasswordRequest,
) {
  const { ipAddress, realNow } = request;
  const counted = signupCounts(email, ipAddress);
  if (await countAll(counted, request)) return;
  const { token, tokenHash } = newEmailToken();
  if (await replaceVerificationToken({ email, passwordHash: pending.passwordHash, tokenHash }, realNow)) {
    await sendEmail(verifyYourEmail(email, pending.name, token));
  } else {
    await giveBack(counted, realNow);
  }
}

export async function requestPasswordReset(email: string, request: PasswordRequest) {
  const { ipAddress, realNow } = request;
  const known = await findAccountByEmail(email);
  const who = known ? { account: known.id } : NOBODY;
  const log = (result: SecurityResult<"password_reset_request">) =>
    recordSecurityEvent({ event: "password_reset_request", result, route: request.route, who, ipAddress });
  if (await countAll([["resetEmailInHour", email], ["resetFromIpAddress", ipAddress]], request, undefined, who)) {
    await log("paused");
    return;
  }

  const { token, tokenHash } = newEmailToken();
  if (await saveResetToken(email, tokenHash, realNow)) {
    await log("passwordAccount");
    await sendEmail(resetYourPassword(email, token));
  } else if ((await signInMethodForEmail(email)) === "google") {
    await log("googleAccount");
    await sendEmail(youSignInWithGoogle(email, "reset"));
  } else {
    const pending = await findPendingSignup(email, realNow);
    await log(pending ? "pendingSignup" : "noAccount");
    if (pending) await resendVerificationLink(email, pending, request);
  }
}

export async function resetLinkWorks(token: string, realNow: Date) {
  return (await findResetLinkEmail(hashEmailToken(token), realNow)) !== null;
}

/** Reads the clock again after hashing, so a link that expires during the hash does not work. */
export async function resetPassword(
  token: string, password: string, route: SecurityLogRoute, clock: () => Date,
): Promise<"changed" | "linkDoesNotWork" | PasswordProblem> {
  const log = (result: "changed" | "linkDoesNotWork", accountId: AccountId | null) => recordSecurityEvent({
    event: "password_reset", result, route, who: accountId ? { account: accountId } : NOBODY,
  });
  const tokenHash = hashEmailToken(token);
  const email = await findResetLinkEmail(tokenHash, clock());
  if (!email) {
    await log("linkDoesNotWork", null);
    return "linkDoesNotWork";
  }
  const problem = newPasswordProblem(password, email);
  if (problem) return problem;
  const passwordHash = await hashPassword(password);
  const accountId = await setPasswordWithResetLink(tokenHash, passwordHash, clock());
  const result = accountId ? "changed" : "linkDoesNotWork";
  await log(result, accountId);
  return result;
}

export type LoginRefusal = "wrongEmailOrPassword" | "paused" | "tooLong" | "verifyYourEmail" | "accountDisabled" | "deletionWillFinish";

export async function logIn(
  credentials: Partial<Record<"email" | "password", unknown>>, request: PasswordRequest,
) {
  const { email: typedEmail, password } = credentials;
  const email = typeof typedEmail === "string" ? normalizeEmail(typedEmail) : null;
  const who = await signInSubject(email);
  const refused = async (code: LoginRefusal) => {
    await recordSecurityEvent({ event: "sign_in", result: code, route: request.route, who, ipAddress: request.ipAddress });
    return { kind: "refused", code } as const;
  };
  if (email === null || typeof password !== "string") return refused("wrongEmailOrPassword");
  const { realNow } = request;
  const tries = loginTryCounts(email, request.ipAddress);
  if (passwordTooLong(password)) return refused("tooLong");
  if (await countAll(tries, request, undefined, "account" in who ? who : NOBODY)) return refused("paused");

  const account = await findPasswordAccountByEmail(email);
  const pending = account ? null : await findPendingSignup(email, realNow);
  if (!(await passwordMatches(password, account?.passwordHash ?? pending?.passwordHash ?? null))) {
    return refused("wrongEmailOrPassword");
  }
  await giveBack(tries, realNow);
  if (pending) {
    await resendVerificationLink(email, pending, request);
    return refused("verifyYourEmail");
  }
  if (!account || account.role === "admin") return refused("wrongEmailOrPassword");
  if (account.deletingSince) {
    return refused((await attemptAccountDeletion(account.id, request.route, request.ipAddress)) === "will-finish" ? "deletionWillFinish" : "accountDisabled");
  }
  if (account.disabledAt) return refused("accountDisabled");
  await recordSecurityEvent({ event: "sign_in", result: "signedIn", route: request.route, who: { account: account.id }, ipAddress: request.ipAddress });
  const user = { id: account.id, email: account.email, name: account.name, sessionVersion: account.sessionVersion };
  return { kind: "signedIn", user } as const;
}

type PasswordAccount = NonNullable<Awaited<ReturnType<typeof findPasswordAccountById>>>;
declare const proven: unique symbol;

export type CurrentPasswordProof = Pick<PasswordAccount, "id" | "passwordHash"> & { readonly [proven]: true };

export async function proveCurrentPassword(
  account: PasswordAccount, typed: unknown, request: PasswordRequest,
): Promise<{ kind: "proven"; proof: CurrentPasswordProof } | { kind: "wrong-password" | "paused" }> {
  const { ipAddress, realNow } = request;
  const tries = loginTryCounts(account.email, ipAddress);
  if (await countAll(tries, request, undefined, { account: account.id })) return { kind: "paused" };
  // bcrypt reads only the first 72 bytes, so a longer try could match a password that starts the same way.
  const password = typeof typed === "string" && !passwordTooLong(typed) ? typed : null;
  if (password === null || !(await passwordMatches(password, account.passwordHash))) return { kind: "wrong-password" };
  await giveBack(tries, realNow);
  return { kind: "proven", proof: { id: account.id, passwordHash: account.passwordHash } as CurrentPasswordProof };
}

export async function changePassword(
  id: AccountId, { currentPassword, newPassword }: { currentPassword: unknown; newPassword: unknown }, request: PasswordRequest,
): Promise<"changed" | "noPassword" | "wrong-password" | "paused" | PasswordProblem> {
  const account = await findPasswordAccountById(id);
  if (!account) return "noPassword";
  const log = (result: "changed" | "wrong-password" | "paused") =>
    recordSecurityEvent({ event: "password_change", result, route: request.route, who: { account: id }, ipAddress: request.ipAddress });
  const check = await proveCurrentPassword(account, currentPassword, request);
  if (check.kind !== "proven") {
    await log(check.kind);
    return check.kind;
  }
  const typed = typeof newPassword === "string" ? newPassword : "";
  const problem = newPasswordProblem(typed, account.email);
  if (problem) return problem;
  const result = (await replacePasswordHash(check.proof, await hashPassword(typed))) ? "changed" : "wrong-password";
  await log(result);
  return result;
}

export type DeletionRefusal = "sign-in-too-old" | "wrong-text" | "wrong-password" | "paused";
export type DeletionResult = "deleted" | "will-finish" | DeletionRefusal;

export async function deleteAccount(
  id: AccountId,
  { confirmation, currentPassword, signedInAt }: { confirmation: unknown; currentPassword: unknown; signedInAt: number | undefined },
  request: PasswordRequest,
): Promise<DeletionResult> {
  const marked = await markAccountDeleting(id, { confirmation, currentPassword, signedInAt }, request);
  if (marked !== "marked") {
    await recordSecurityEvent({ event: "account_deletion", result: marked, route: request.route, who: { account: id }, ipAddress: request.ipAddress });
    return marked;
  }
  const result = await attemptAccountDeletion(id, request.route, request.ipAddress);
  return result === "nothingMarked" ? "deleted" : result;
}

async function markAccountDeleting(
  id: AccountId,
  { confirmation, currentPassword, signedInAt }: { confirmation: unknown; currentPassword: unknown; signedInAt: number | undefined },
  request: PasswordRequest,
): Promise<"marked" | DeletionRefusal> {
  const passwordAccount = await findPasswordAccountById(id);
  if (!passwordAccount && !signedInRecently(signedInAt)) return "sign-in-too-old";
  if (confirmation !== "DELETE") return "wrong-text";
  if (!passwordAccount) {
    if (!(await markGoogleAccountDeleting(id))) throw new Error("Google Account not found");
    return "marked";
  }
  const check = await proveCurrentPassword(passwordAccount, currentPassword, request);
  if (check.kind !== "proven") return check.kind;
  return (await markPasswordAccountDeleting(check.proof)) ? "marked" : "wrong-password";
}
