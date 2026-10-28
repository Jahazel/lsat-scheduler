import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { resetYourPassword, verifyYourEmail, youAlreadyHaveAnAccount, youSignInWithGoogle } from "./accountEmails";
import {
  deleteGoogleAccount, deletePasswordAccount, findPasswordAccountByEmail, findPasswordAccountById, replacePasswordHash,
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

export type PasswordRequest = { ipAddress: string; realNow: Date };

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
  { ipAddress, realNow }: PasswordRequest,
): Promise<"checkYourEmail" | PasswordProblem> {
  const refusal = await countAll(signupCounts(email, ipAddress), realNow, () => newPasswordProblem(password, email));
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

export function verifyEmail(token: string, realNow: Date): Promise<VerificationResult> {
  return createAccountFromPendingSignup(hashEmailToken(token), realNow);
}

export async function resendVerificationLink(
  email: string, pending: { name: string; passwordHash: string }, { ipAddress, realNow }: PasswordRequest,
) {
  const counted = signupCounts(email, ipAddress);
  if (await countAll(counted, realNow)) return;
  const { token, tokenHash } = newEmailToken();
  if (await replaceVerificationToken({ email, passwordHash: pending.passwordHash, tokenHash }, realNow)) {
    await sendEmail(verifyYourEmail(email, pending.name, token));
  } else {
    await giveBack(counted, realNow);
  }
}

export async function requestPasswordReset(email: string, request: PasswordRequest) {
  const { ipAddress, realNow } = request;
  if (await countAll([["resetEmailInHour", email], ["resetFromIpAddress", ipAddress]], realNow)) return;

  const { token, tokenHash } = newEmailToken();
  if (await saveResetToken(email, tokenHash, realNow)) {
    await sendEmail(resetYourPassword(email, token));
  } else if ((await signInMethodForEmail(email)) === "google") {
    await sendEmail(youSignInWithGoogle(email, "reset"));
  } else {
    const pending = await findPendingSignup(email, realNow);
    if (pending) await resendVerificationLink(email, pending, request);
  }
}

export async function resetLinkWorks(token: string, realNow: Date) {
  return (await findResetLinkEmail(hashEmailToken(token), realNow)) !== null;
}

/** Reads the clock again after hashing, so a link that expires during the hash does not work. */
export async function resetPassword(
  token: string, password: string, clock: () => Date,
): Promise<"changed" | "linkDoesNotWork" | PasswordProblem> {
  const tokenHash = hashEmailToken(token);
  const email = await findResetLinkEmail(tokenHash, clock());
  if (!email) return "linkDoesNotWork";
  const problem = newPasswordProblem(password, email);
  if (problem) return problem;
  const passwordHash = await hashPassword(password);
  return (await setPasswordWithResetLink(tokenHash, passwordHash, clock())) ? "changed" : "linkDoesNotWork";
}

export type LoginRefusal = "wrongEmailOrPassword" | "paused" | "tooLong" | "verifyYourEmail" | "accountDisabled";

export async function logIn(
  credentials: Partial<Record<"email" | "password", unknown>>, request: PasswordRequest,
) {
  const refused = (code: LoginRefusal) => ({ kind: "refused", code }) as const;
  const { email: typedEmail, password } = credentials;
  if (typeof typedEmail !== "string" || typeof password !== "string") return refused("wrongEmailOrPassword");
  if (passwordTooLong(password)) return refused("tooLong");

  const email = normalizeEmail(typedEmail);
  const { realNow } = request;
  const tries = loginTryCounts(email, request.ipAddress);
  if (await countAll(tries, realNow)) return refused("paused");

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
  if (account.disabledAt) return refused("accountDisabled");
  const user = { id: account.id, email: account.email, name: account.name, sessionVersion: account.sessionVersion };
  return { kind: "signedIn", user } as const;
}

type PasswordAccount = NonNullable<Awaited<ReturnType<typeof findPasswordAccountById>>>;
declare const proven: unique symbol;

export type CurrentPasswordProof = Pick<PasswordAccount, "id" | "passwordHash"> & { readonly [proven]: true };

export async function proveCurrentPassword(
  account: PasswordAccount, typed: unknown, { ipAddress, realNow }: PasswordRequest,
): Promise<{ kind: "proven"; proof: CurrentPasswordProof } | { kind: "wrong-password" | "paused" }> {
  const tries = loginTryCounts(account.email, ipAddress);
  if (await countAll(tries, realNow)) return { kind: "paused" };
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
  const check = await proveCurrentPassword(account, currentPassword, request);
  if (check.kind !== "proven") return check.kind;
  const typed = typeof newPassword === "string" ? newPassword : "";
  const problem = newPasswordProblem(typed, account.email);
  if (problem) return problem;
  return (await replacePasswordHash(check.proof, await hashPassword(typed))) ? "changed" : "wrong-password";
}

export type DeletionRefusal = "sign-in-too-old" | "wrong-text" | "wrong-password" | "paused";

export async function deleteAccount(
  id: AccountId,
  { confirmation, currentPassword, signedInAt }: { confirmation: unknown; currentPassword: unknown; signedInAt: number | undefined },
  request: PasswordRequest,
): Promise<"deleted" | DeletionRefusal> {
  const passwordAccount = await findPasswordAccountById(id);
  if (!passwordAccount && !signedInRecently(signedInAt)) return "sign-in-too-old";
  if (confirmation !== "DELETE") return "wrong-text";
  if (!passwordAccount) {
    await deleteGoogleAccount(id);
    return "deleted";
  }
  const check = await proveCurrentPassword(passwordAccount, currentPassword, request);
  if (check.kind !== "proven") return check.kind;
  return (await deletePasswordAccount(check.proof)) ? "deleted" : "wrong-password";
}
