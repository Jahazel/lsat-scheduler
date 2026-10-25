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
  disabledAt: accounts.disabledAt,
  sessionVersion: accounts.sessionVersion,
};

export async function findAccountById(id: string | undefined) {
  if (!isAccountId(id)) return null;
  const [account] = await getPostgresDatabase().select(publicColumns).from(accounts).where(eq(accounts.id, id));
  return account ?? null;
}

export async function findAccountByEmail(email: string) {
  const [account] = await getPostgresDatabase()
    .select(publicColumns)
    .from(accounts)
    .where(eq(accounts.email, sql`normalized_email(${email})`));
  return account ?? null;
}

export async function findAccountByGoogleId(googleId: string) {
  const [account] = await getPostgresDatabase().select(publicColumns).from(accounts).where(eq(accounts.googleId, googleId));
  return account ?? null;
}

const createdAccount = z.object({ id: accountIdSchema, role: z.enum(accounts.role.enumValues) });

/** Returns null when another Account already has this email or Google ID. */
export async function createAccount({ email, name, googleId }: { email: string; name: string; googleId: string }) {
  const result = await getPostgresDatabase().execute(sql`
    insert into accounts (email, name, google_id) values (${email}, ${name}, ${googleId})
    on conflict do nothing returning id, role
  `);
  return result.rows[0] ? createdAccount.parse(result.rows[0]) : null;
}

export async function endAllSessions(id: AccountId) {
  await getPostgresDatabase()
    .update(accounts)
    .set({ sessionVersion: sql`${accounts.sessionVersion} + 1` })
    .where(eq(accounts.id, id));
}
