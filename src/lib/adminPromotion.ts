import { eq, sql } from "drizzle-orm";
import { endPlanNow } from "./billingRepository";
import { getPostgresDatabase } from "./postgres";
import { StripeKeyProblem } from "./stripeApi";
import { accounts } from "./postgresSchema";

export type AdminPromotion =
  | "promoted" | "already-admin" | "no-account" | "no-google" | "plan-not-ended" | "stripe-key-missing" | "stripe-key-refused";

export async function endPlanAndMakeAdmin(email: string, db = getPostgresDatabase()): Promise<AdminPromotion> {
  return db.transaction(async (tx) => {
    const [account] = await tx.select({ id: accounts.id, role: accounts.role, googleId: accounts.googleId })
      .from(accounts).where(eq(accounts.email, sql`normalized_email(${email})`)).for("update");
    if (!account) return "no-account";
    if (!account.googleId) return "no-google";
    if (account.role === "admin") return "already-admin";
    try {
      await endPlanNow(account.id, tx);
    } catch (error) {
      if (error instanceof StripeKeyProblem) return error.problem === "missing" ? "stripe-key-missing" : "stripe-key-refused";
      return "plan-not-ended";
    }
    await tx.update(accounts).set({ role: "admin" }).where(eq(accounts.id, account.id));
    return "promoted";
  });
}
