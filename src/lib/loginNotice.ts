import { failureText, isFailureCode } from "./unexpectedFailure";

export const DISABLED_SIGN_IN_PATH = "/login?error=AccountDisabled";
export const SESSION_ENDED_PATH = "/login?error=SessionEnded";
export const EMAIL_VERIFIED_PATH = "/login?notice=EmailVerified";
export const PASSWORD_CHANGED_PATH = "/login?notice=PasswordChanged";
export const EMAIL_USES_PASSWORD_PATH = "/login?error=EmailUsesPassword";

export type LoginNotice = {
  tone: "danger" | "warning" | "info" | "emailSent" | "success";
  text: string;
  place: "aboveGoogle" | "aboveEmail";
};

export const PASSWORD_LOGIN_NOTICES = {
  wrongEmailOrPassword: {
    tone: "danger",
    text: "That email and password don't match. Check both and try again, or reset your password.",
    place: "aboveEmail",
  },
  paused: {
    tone: "warning",
    text: "Too many tries. Login is paused for a while. Try again later, or reset your password.",
    place: "aboveEmail",
  },
  verifyYourEmail: {
    tone: "emailSent",
    text: "Verify your email first. We sent you a new link. Check your spam folder if you don't see it.",
    place: "aboveEmail",
  },
} as const satisfies Record<string, LoginNotice>;

type QueryValue = string | string[] | undefined;

export function loginNotice({ error, notice, code }: { error?: QueryValue; notice?: QueryValue; code?: QueryValue }): LoginNotice | null {
  if (notice === "EmailVerified") return { tone: "success", text: "Email verified. Log in.", place: "aboveEmail" };
  if (notice === "PasswordChanged") return { tone: "success", text: "Password changed. Log in with your new password.", place: "aboveEmail" };
  if (typeof error !== "string" || !error) return null;
  if (error === "SessionEnded") return { tone: "info", text: "Your session ended. Log in again.", place: "aboveGoogle" };
  if (error === "AccountDisabled") return { tone: "danger", text: "This Account can't log in.", place: "aboveGoogle" };
  if (error === "EmailUsesPassword") {
    return { tone: "danger", text: "This email uses a password. Log in with your password.", place: "aboveEmail" };
  }
  if (error === "AccessDenied" && isFailureCode(code)) {
    return { tone: "danger", text: failureText({ unexpectedFailure: code }), place: "aboveGoogle" };
  }
  if (error === "CredentialsSignin") return PASSWORD_LOGIN_NOTICES.wrongEmailOrPassword;
  return { tone: "danger", text: "Google sign-in didn't finish. Try again, or use a Google account with a verified email.", place: "aboveGoogle" };
}
