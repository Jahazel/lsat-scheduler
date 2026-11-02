import { finishDeletionOnSignIn, type DeletingLoginRefusal } from "./accountDeletion";
import { recordSignIn } from "./accountRepository";
import type { SecurityLogRoute } from "./securityLog";

export type SignInRefusal = "accountDisabled" | DeletingLoginRefusal;

type GatedAccount = { id: string; disabledAt: Date | null; deletingSince: Date | null };

export async function admitAccount(
  account: GatedAccount, { route, realNow }: { route: SecurityLogRoute; realNow: Date },
): Promise<"signedIn" | SignInRefusal> {
  if (account.deletingSince) return finishDeletionOnSignIn(account.id, route);
  if (account.disabledAt) return "accountDisabled";
  if (!(await recordSignIn(account.id, realNow))) return finishDeletionOnSignIn(account.id, route);
  return "signedIn";
}
