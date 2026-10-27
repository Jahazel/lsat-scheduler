import { TransactionRollbackError } from "drizzle-orm";
import { countAction, type LimitedAction } from "./actionLimits";
import { getPostgresDatabase } from "./postgres";

/**
 * Counts one signup email against the signup limits, which verification resends share.
 * `problemAfterCounting` runs after the limits, so a request over a limit gets the same answer whatever it holds.
 * A refused request sends nothing, so it gives back every count it took.
 */
export async function signupLimitRefusal<Problem extends string>(
  email: string, ipAddress: string, realNow: Date, problemAfterCounting: () => Problem | null = () => null,
): Promise<Problem | "overLimit" | null> {
  const counted: [LimitedAction, string][] = [
    ["signupEmailInHour", email], ["signupEmailInDay", email], ["signupFromIpAddress", ipAddress],
  ];
  let refusal: Problem | "overLimit" | null = null;
  try {
    await getPostgresDatabase().transaction(async (tx) => {
      for (const [action, subject] of counted) {
        if (!(await countAction(action, subject, realNow, tx)).allowed) {
          refusal = "overLimit";
          tx.rollback();
        }
      }
      refusal = problemAfterCounting();
      if (refusal) tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
  return refusal;
}
