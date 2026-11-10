import { endPlanAndMakeAdmin } from "../src/lib/adminPromotion";
import { closePostgresDatabase, requirePostgresScriptTarget } from "../src/lib/postgres";

class UserRefusalError extends Error {}

try {
  const email = process.argv[2];
  if (process.argv.length !== 3 || !email?.trim()) {
    throw new UserRefusalError("Usage: npm run make-admin -- <email>");
  }

  const host = requirePostgresScriptTarget();
  const displayEmail = email.trim().toLowerCase();
  const status = await endPlanAndMakeAdmin(email);
  if (status === "no-account") throw new UserRefusalError(`No account found for ${displayEmail} on ${host}`);
  if (status === "no-google") {
    throw new UserRefusalError(`${displayEmail} has not signed in with Google. Admins sign in only through Google.`);
  }
  if (status === "plan-not-ended") {
    throw new UserRefusalError(`Stripe did not cancel the plan of ${displayEmail}, so the Account is still a student. Try again.`);
  }

  process.stdout.write(status === "already-admin"
    ? `${displayEmail} is already an admin on ${host}.\n`
    : `Made ${displayEmail} an admin on ${host}.\n`);
  process.stdout.write("Sign out and back in before the admin controls appear.\n");
} catch (error) {
  const message = error instanceof UserRefusalError
    || (error instanceof Error && error.message.startsWith("Refusing database host "))
    ? error.message
    : "Admin promotion failed. Check the connection setting and database permissions.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
} finally {
  await closePostgresDatabase();
}
