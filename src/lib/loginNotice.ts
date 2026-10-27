export const DISABLED_SIGN_IN_PATH = "/login?error=AccountDisabled";
export const SESSION_ENDED_PATH = "/login?error=SessionEnded";
export const EMAIL_VERIFIED_PATH = "/login?notice=EmailVerified";
export const WRONG_PASSWORD_PATH = "/login?error=CredentialsSignin";

export type LoginNotice = { tone: "danger" | "info" | "success"; text: string };

export function loginNotice({ error, notice }: { error?: string | string[]; notice?: string | string[] }): LoginNotice | null {
  if (notice === "EmailVerified") return { tone: "success", text: "Email verified. Log in." };
  if (typeof error !== "string" || !error) return null;
  if (error === "SessionEnded") return { tone: "info", text: "Your session ended. Log in again." };
  if (error === "AccountDisabled") return { tone: "danger", text: "This Account can't sign in." };
  if (error === "CredentialsSignin") {
    return { tone: "danger", text: "That email and password don't match. Check both and try again, or reset your password." };
  }
  return { tone: "danger", text: "Google sign-in didn't finish. Try again, or use a Google account with a verified email." };
}
