import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizeEmail } from "./email";

const MIN_PASSWORD_CHARACTERS = 8;
// bcrypt reads only the first 72 bytes, so a longer password would share its hash with its own prefix.
const MAX_PASSWORD_BYTES = 72;

export const PASSWORD_MESSAGES = {
  tooShort: "That password is too short. Use at least 8 characters.",
  tooLong: "That password is too long. Try a shorter one.",
  tooCommon: "This password is too common. Choose a password that's harder to guess.",
} as const;

export type PasswordProblem = keyof typeof PASSWORD_MESSAGES;

export const passwordTooLong = (password: string) => Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES;

// next.config.ts traces this file into every server function.
let commonPasswords: Set<string> | undefined;
function isCommon(lowercased: string) {
  commonPasswords ??= new Set(
    readFileSync(path.join(process.cwd(), "src/lib/commonPasswords.txt"), "utf8").split("\n").filter(Boolean),
  );
  return commonPasswords.has(lowercased);
}

export function newPasswordProblem(password: string, email: string): PasswordProblem | null {
  if ([...password].length < MIN_PASSWORD_CHARACTERS) return "tooShort";
  if (passwordTooLong(password)) return "tooLong";
  const lowercased = password.toLowerCase();
  if (lowercased === "drillmap" || lowercased === normalizeEmail(email) || isCommon(lowercased)) return "tooCommon";
  return null;
}
