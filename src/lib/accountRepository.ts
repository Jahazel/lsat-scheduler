import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getPostgresDatabase } from "./postgres";
import { accounts } from "./postgresSchema";

const accountIdSchema = z.guid().brand<"AccountId">();
type AccountId = z.infer<typeof accountIdSchema>;

export function isAccountId(id: string | null | undefined): id is AccountId {
  return accountIdSchema.safeParse(id).success;
}

const publicColumns = {
  id: accounts.id,
  email: accounts.email,
  name: accounts.name,
  role: accounts.role,
  simulatedDate: accounts.simulatedDate,
};

export async function findAccountById(id: string | undefined) {
  if (!isAccountId(id)) return null;
  const [account] = await getPostgresDatabase().select(publicColumns).from(accounts).where(eq(accounts.id, id));
  return account ?? null;
}

export async function findAccountByEmail(email: string) {
  const [account] = await getPostgresDatabase()
    .select({ ...publicColumns, passwordHash: accounts.passwordHash })
    .from(accounts)
    .where(eq(accounts.email, sql`normalized_email(${email})`));
  return account ?? null;
}

/** Returns null when another Account already has this email. */
export async function createAccount(values: typeof accounts.$inferInsert) {
  const [account] = await getPostgresDatabase()
    .insert(accounts)
    .values(values)
    .onConflictDoNothing({ target: accounts.email })
    .returning({ id: accounts.id, role: accounts.role });
  return account ?? null;
}
