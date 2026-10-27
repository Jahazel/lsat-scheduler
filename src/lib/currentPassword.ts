import type { findPasswordAccountById } from "./accountRepository";
import { countAll, giveBack, loginTryCounts } from "./actionLimits";
import { clientIpAddress } from "./clientIpAddress";
import { passwordMatches } from "./passwordHash";
import { passwordTooLong } from "./passwordRules";

type PasswordAccount = NonNullable<Awaited<ReturnType<typeof findPasswordAccountById>>>;
declare const proven: unique symbol;

/** The current password was typed just now (rule 29). Only `proveCurrentPassword` makes one. */
export type CurrentPasswordProof = Pick<PasswordAccount, "id" | "passwordHash"> & { readonly [proven]: true };

/** A wrong try counts against the login limits of the Account's email, so the Account page gives no extra guesses. */
export async function proveCurrentPassword(
  account: PasswordAccount,
  typed: FormDataEntryValue | null,
): Promise<{ kind: "proven"; proof: CurrentPasswordProof } | { kind: "wrong" | "paused" }> {
  const realNow = new Date();
  const tries = loginTryCounts(account.email, await clientIpAddress());
  if (await countAll(tries, realNow)) return { kind: "paused" };
  // bcrypt reads only the first 72 bytes, so a longer try could match a password that starts the same way.
  const password = typeof typed === "string" && !passwordTooLong(typed) ? typed : null;
  if (password === null || !(await passwordMatches(password, account.passwordHash))) return { kind: "wrong" };
  await giveBack(tries, realNow);
  return { kind: "proven", proof: { id: account.id, passwordHash: account.passwordHash } as CurrentPasswordProof };
}
