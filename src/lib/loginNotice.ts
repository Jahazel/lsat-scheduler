import type { SignInRefusal } from "./signInGate";
import { isFailureCode, type FailureCode } from "./unexpectedFailure";

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

type LoginPageMessage = { query: "error" | "notice"; value: string; notice: LoginNotice };

const SIGN_IN_REFUSAL_MESSAGES: Record<SignInRefusal, LoginPageMessage> = {
  accountDisabled: { query: "error", value: "AccountDisabled", notice: { tone: "danger", text: "This Account can't log in.", place: "aboveGoogle" } },
  accountDeleted: { query: "notice", value: "AccountDeleted", notice: { tone: "info", text: "Your Account is deleted.", place: "aboveGoogle" } },
  deletionWillFinish: {
    query: "notice", value: "DeletionWillFinish", notice: { tone: "info", text: "Your Account is being deleted.", place: "aboveGoogle" },
  },
};

const OTHER_MESSAGES = {
  emailVerified: { query: "notice", value: "EmailVerified", notice: { tone: "success", text: "Email verified. Log in.", place: "aboveEmail" } },
  passwordChanged: {
    query: "notice", value: "PasswordChanged",
    notice: { tone: "success", text: "Password changed. Log in with your new password.", place: "aboveEmail" },
  },
  sessionEnded: { query: "error", value: "SessionEnded", notice: { tone: "info", text: "Your session ended. Log in again.", place: "aboveGoogle" } },
  emailUsesPassword: {
    query: "error", value: "EmailUsesPassword",
    notice: { tone: "danger", text: "This email uses a password. Log in with your password.", place: "aboveEmail" },
  },
} satisfies Record<string, LoginPageMessage>;

const LOGIN_PAGE_MESSAGES = Object.values<LoginPageMessage>({ ...SIGN_IN_REFUSAL_MESSAGES, ...OTHER_MESSAGES });

const loginPath = ({ query, value }: LoginPageMessage) => `/login?${query}=${value}` as const;

export const SESSION_ENDED_PATH = loginPath(OTHER_MESSAGES.sessionEnded);
export const EMAIL_VERIFIED_PATH = loginPath(OTHER_MESSAGES.emailVerified);
export const PASSWORD_CHANGED_PATH = loginPath(OTHER_MESSAGES.passwordChanged);
export const EMAIL_USES_PASSWORD_PATH = loginPath(OTHER_MESSAGES.emailUsesPassword);

export function isSignInRefusal(code: string): code is SignInRefusal {
  return Object.hasOwn(SIGN_IN_REFUSAL_MESSAGES, code);
}

export function loginRefusalPath(refusal: SignInRefusal) {
  return loginPath(SIGN_IN_REFUSAL_MESSAGES[refusal]);
}

type QueryValue = string | string[] | undefined;

export function googleSignInFailure({ error, code }: { error?: QueryValue; code?: QueryValue }): FailureCode | null {
  return error === "AccessDenied" && isFailureCode(code) ? code : null;
}

export function loginNotice({ error, notice, code }: { error?: QueryValue; notice?: QueryValue; code?: QueryValue }): LoginNotice | null {
  const shown = (query: LoginPageMessage["query"]) =>
    LOGIN_PAGE_MESSAGES.find((message) => message.query === query && { error, notice }[query] === message.value)?.notice;
  const fixed = shown("notice") ?? shown("error");
  if (fixed) return fixed;
  if (typeof error !== "string" || !error) return null;
  if (googleSignInFailure({ error, code })) return null;
  if (error === "CredentialsSignin") return PASSWORD_LOGIN_NOTICES.wrongEmailOrPassword;
  return { tone: "danger", text: "Google sign-in didn't finish. Try again, or use a Google account with a verified email.", place: "aboveGoogle" };
}
