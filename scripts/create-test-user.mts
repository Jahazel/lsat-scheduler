import bcrypt from "bcryptjs";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { closePostgresDatabase, getPostgresDatabase, requirePostgresScriptTarget } from "../src/lib/postgres";
import { accounts } from "../src/lib/postgresSchema";

const TEST_PASSWORD = "DrillMapTest123";

type TestAccount = { email: string };

export function parseTestUserArgs(args: string[]): TestAccount {
  const { values } = parseArgs({
    args,
    options: { email: { type: "string" } },
  });
  const email = (values.email ?? "student@test.local").trim().toLowerCase();
  if (!z.email().safeParse(email).success) throw new Error("Enter a valid email with --email.");
  return { email };
}

export async function createTestUser({ email }: TestAccount) {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  await getPostgresDatabase()
    .insert(accounts)
    .values({ email, passwordHash, name: "Test Student" })
    .onConflictDoUpdate({ target: accounts.email, set: { passwordHash } });
  return { email, password: TEST_PASSWORD };
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to create a test Account with NODE_ENV=production.");
  }
  let account;
  try {
    account = parseTestUserArgs(process.argv.slice(2));
  } catch {
    throw new Error("Usage: npm run create-test-user -- [--email <address>]");
  }
  const host = requirePostgresScriptTarget();
  try {
    const result = await createTestUser(account);
    console.log(`Test Account ready on ${host}.`);
    console.log(`Email: ${result.email}`);
    console.log(`Password: ${result.password}`);
    console.log("Role: student");
  } catch {
    throw new Error("Test Account setup failed. Check the connection setting and database permissions.");
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(closePostgresDatabase);
}
