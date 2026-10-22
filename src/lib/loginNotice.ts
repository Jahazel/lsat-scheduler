export const DISABLED_SIGN_IN_PATH = "/login?error=AccountDisabled";
export const SESSION_ENDED_PATH = "/login?error=SessionEnded";

export type LoginNotice = { tone: "danger" | "info"; text: string };

export function loginNotice(error: string | string[] | undefined): LoginNotice | null {
  if (typeof error !== "string" || !error) return null;
  if (error === "SessionEnded") return { tone: "info", text: "Your session ended. Sign in again." };
  if (error === "AccountDisabled") return { tone: "danger", text: "This Account can't sign in." };
  return { tone: "danger", text: "Google sign-in didn't finish. Try again, or use a Google account with a verified email." };
}
