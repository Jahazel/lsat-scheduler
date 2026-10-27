export const DISABLED_SIGN_IN_PATH = "/login?error=AccountDisabled";
export const SESSION_ENDED_PATH = "/login?error=SessionEnded";
export const EMAIL_VERIFIED_PATH = "/login?notice=EmailVerified";

export type LoginNotice = { tone: "danger" | "warning" | "info" | "emailSent" | "success"; text: string };

export const PASSWORD_LOGIN_NOTICES = {
  wrongEmailOrPassword: {
    tone: "danger",
    text: "That email and password don't match. Check both and try again, or reset your password.",
  },
  paused: { tone: "warning", text: "Too many tries. Login is paused for a while. Try again later, or reset your password." },
  verifyYourEmail: {
    tone: "emailSent",
    text: "Verify your email first. We sent you a new link. Check your spam folder if you don't see it.",
  },
} as const satisfies Record<string, LoginNotice>;

export function loginNotice({ error, notice }: { error?: string | string[]; notice?: string | string[] }): LoginNotice | null {
  if (notice === "EmailVerified") return { tone: "success", text: "Email verified. Log in." };
  if (typeof error !== "string" || !error) return null;
  if (error === "SessionEnded") return { tone: "info", text: "Your session ended. Log in again." };
  if (error === "AccountDisabled") return { tone: "danger", text: "This Account can't log in." };
  if (error === "CredentialsSignin") return PASSWORD_LOGIN_NOTICES.wrongEmailOrPassword;
  return { tone: "danger", text: "Google sign-in didn't finish. Try again, or use a Google account with a verified email." };
}
