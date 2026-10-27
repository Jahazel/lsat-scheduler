import { and, eq, gt, sql } from "drizzle-orm";
import { getPostgresDatabase } from "./postgres";
import { accounts, resetTokens } from "./postgresSchema";

export const RESET_LINK_MINUTES = 30;

const working = (tokenHash: string, realNow: Date) => and(eq(resetTokens.tokenHash, tokenHash), gt(resetTokens.expiresAt, realNow));

/** Replaces the reset link of the email's password Account. Returns false when the email has no password Account. */
export async function saveResetToken(email: string, tokenHash: string, realNow: Date) {
  const expiresAt = new Date(realNow.getTime() + RESET_LINK_MINUTES * 60 * 1000).toISOString();
  const saved = await getPostgresDatabase().execute(sql`
    insert into ${resetTokens} (account_id, token_hash, expires_at)
    select id, ${tokenHash}, ${expiresAt} from ${accounts}
    where email = normalized_email(${email}) and password_hash is not null
    on conflict (account_id) do update set token_hash = excluded.token_hash, expires_at = excluded.expires_at
  `);
  return saved.rowCount === 1;
}

/** Reads only, so opening a reset link does not use it. */
export async function findResetLinkEmail(tokenHash: string, realNow: Date) {
  const [link] = await getPostgresDatabase()
    .select({ email: accounts.email })
    .from(resetTokens)
    .innerJoin(accounts, eq(accounts.id, resetTokens.accountId))
    .where(working(tokenHash, realNow));
  return link?.email ?? null;
}

/** Uses the reset link: sets the password and signs out every device. Returns false for a link that doesn't work. */
export async function setPasswordWithResetLink(tokenHash: string, passwordHash: string, realNow: Date) {
  return getPostgresDatabase().transaction(async (tx) => {
    const [used] = await tx.delete(resetTokens).where(working(tokenHash, realNow)).returning({ accountId: resetTokens.accountId });
    if (!used) return false;
    await tx.update(accounts)
      .set({ passwordHash, sessionVersion: sql`${accounts.sessionVersion} + 1` })
      .where(eq(accounts.id, used.accountId));
    return true;
  });
}
