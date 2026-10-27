import { emailLink, type Email } from "./email";
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

export function youSignInWithGoogle(to: string): Email {
  return {
    to,
    subject: "You sign in to DrillMap with Google",
    text: [
      "Someone tried to sign up for DrillMap with a password and this email.",
      "You sign in with Google. Log in with \"Continue with Google\":",
      emailLink("/login", {}),
      "If this was not you, ignore this email. Your Account did not change.",
    ].join("\n\n"),
  };
}
