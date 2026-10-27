export const DISABLED_SIGN_IN_PATH = "/login?error=AccountDisabled";
export const SESSION_ENDED_PATH = "/login?error=SessionEnded";
export const EMAIL_VERIFIED_PATH = "/login?notice=EmailVerified";
export const WRONG_PASSWORD_PATH = "/login?error=CredentialsSignin";
export const EMAIL_USES_PASSWORD_PATH = "/login?error=EmailUsesPassword";

export type LoginNotice = { tone: "danger" | "info" | "success"; text: string; place: "aboveGoogle" | "aboveEmail" };

export function loginNotice({ error, notice }: { error?: string | string[]; notice?: string | string[] }): LoginNotice | null {
  if (notice === "EmailVerified") return { tone: "success", text: "Email verified. Log in.", place: "aboveEmail" };
  if (typeof error !== "string" || !error) return null;
  if (error === "SessionEnded") return { tone: "info", text: "Your session ended. Log in again.", place: "aboveGoogle" };
  if (error === "AccountDisabled") return { tone: "danger", text: "This Account can't sign in.", place: "aboveGoogle" };
  if (error === "EmailUsesPassword") {
    return { tone: "danger", text: "This email uses a password. Log in with your password.", place: "aboveEmail" };
  }
  if (error === "CredentialsSignin") {
    return { tone: "danger", text: "That email and password don't match. Check both and try again, or reset your password.", place: "aboveGoogle" };
  }
  return { tone: "danger", text: "Google sign-in didn't finish. Try again, or use a Google account with a verified email.", place: "aboveGoogle" };
}
