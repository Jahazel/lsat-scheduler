import { createPostgresConnection, requirePostgresScriptTarget } from "../src/lib/postgres";
import { stripeSecretKey } from "../src/lib/stripeApi";
import { billingResyncReport, resyncBillingRecords } from "../src/lib/stripeMessages";

const connections: ReturnType<typeof createPostgresConnection>[] = [];
try {
  requirePostgresScriptTarget();
  const secretKey = stripeSecretKey();
  const restored = createPostgresConnection();
  connections.push(restored);
  const counts = await resyncBillingRecords(restored.db, secretKey);
  process.stdout.write(billingResyncReport(counts));
  if (counts.notInStripe > 0 || counts.unknownPrice.length > 0) process.exitCode = 1;
} catch (error) {
  const message = error instanceof Error && (error.message.startsWith("Refusing database host ")
    || error.message === "STRIPE_SECRET_KEY is not set."
    || error.message === "Remote Postgres requires sslmode=verify-full.")
    ? error.message
    : "Billing resync failed. Check the connection setting and the Stripe key, then run it again.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
} finally {
  for (const connection of connections) {
    try {
      await connection.close();
    } catch {
      process.stderr.write("Billing resync connection cleanup failed.\n");
      process.exitCode = 1;
    }
  }
}
