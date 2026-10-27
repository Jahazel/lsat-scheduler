import { findPasswordAccountByEmail } from "./accountRepository";
import { passwordMatches } from "./passwordHash";
import { passwordTooLong } from "./passwordRules";

export async function passwordSignInAccount(credentials: Partial<Record<"email" | "password", unknown>>) {
  const { email, password } = credentials;
  if (typeof email !== "string" || typeof password !== "string" || passwordTooLong(password)) return null;
  const account = await findPasswordAccountByEmail(email.trim().toLowerCase());
  if (!(await passwordMatches(password, account?.passwordHash ?? null))) return null;
  if (!account || account.role === "admin" || account.disabledAt) return null;
  return { id: account.id, email: account.email, name: account.name };
}
