import { INACTIVE_WARNING_DAYS, INACTIVE_YEARS } from "./accountRepository";
import { emailLink, type Email } from "./email";
import { RESET_LINK_MINUTES } from "./passwordResetRepository";
import { VERIFICATION_LINK_HOURS } from "./pendingSignupRepository";

export function verifyYourEmail(to: string, name: string, token: string): Email {
  return {
    to,
    subject: "Verify your email for DrillMap",
    text: [
      `Hi ${name},`,
      "Open this link to finish signing up for DrillMap:",
      emailLink("/verify-email", { token }),
      `The link works once, for ${VERIFICATION_LINK_HOURS} hours. If you did not sign up for DrillMap, ignore this email.`,
    ].join("\n\n"),
  };
}

export function youAlreadyHaveAnAccount(to: string): Email {
  return {
    to,
    subject: "You already have a DrillMap Account",
    text: [
      "Someone tried to sign up for DrillMap with this email.",
      "You already have an Account. Log in, or reset your password:",
      emailLink("/login", {}),
      "If this was not you, ignore this email. Your Account did not change.",
    ].join("\n\n"),
  };
}

const GOOGLE_ACCOUNT_ATTEMPTS = {
  signup: "Someone tried to sign up for DrillMap with a password and this email.",
  reset: "Someone asked to reset the DrillMap password for this email.",
};

export function youSignInWithGoogle(to: string, attempt: keyof typeof GOOGLE_ACCOUNT_ATTEMPTS): Email {
  return {
    to,
    subject: "You sign in to DrillMap with Google",
    text: [
      GOOGLE_ACCOUNT_ATTEMPTS[attempt],
      "You sign in with Google. Log in with \"Continue with Google\":",
      emailLink("/login", {}),
      "If this was not you, ignore this email. Your Account did not change.",
    ].join("\n\n"),
  };
}

export function resetYourPassword(to: string, token: string): Email {
  return {
    to,
    subject: "Reset your DrillMap password",
    text: [
      "Someone asked to reset the password for your DrillMap Account.",
      "Open this link to set a new password:",
      emailLink("/reset-password", { token }),
      `The link works once, for ${RESET_LINK_MINUTES} minutes. If you did not ask for this, ignore this email. Your password did not change.`,
    ].join("\n\n"),
  };
}

export function signInToKeepYourAccount(to: string, name: string): Email {
  return {
    to,
    subject: "Sign in to keep your DrillMap Account",
    text: [
      `Hi ${name},`,
      `You have not signed in to DrillMap for ${INACTIVE_YEARS} years. Sign in within ${INACTIVE_WARNING_DAYS} days to keep your Account:`,
      emailLink("/login", {}),
      "If you do not sign in by then, we will delete your Account and your study information. You do not need to do anything else.",
    ].join("\n\n"),
  };
}
