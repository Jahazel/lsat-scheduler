import { finishDeletionOnSignIn, type DeletingLoginRefusal } from "./accountDeletion";
import { recordSignIn } from "./accountRepository";
import type { SecurityLogRoute } from "./securityLog";

export type SignInRefusal = "accountDisabled" | DeletingLoginRefusal;

type GatedAccount = { id: string; disabledAt: Date | null; deletingSince: Date | null };

/**
 * Decides whether an existing Account may sign in, the same way for Google and password.
 * A Deleting Account finishes its deletion, even when it is also Disabled.
 * A deletion mark that lands after the caller read the Account makes `recordSignIn` miss, and is treated the same.
 */
export async function admitAccount(
  account: GatedAccount, { route, realNow }: { route: SecurityLogRoute; realNow: Date },
): Promise<"signedIn" | SignInRefusal> {
  if (account.deletingSince) return finishDeletionOnSignIn(account.id, route);
  if (account.disabledAt) return "accountDisabled";
  if (!(await recordSignIn(account.id, realNow))) return finishDeletionOnSignIn(account.id, route);
  return "signedIn";
}
