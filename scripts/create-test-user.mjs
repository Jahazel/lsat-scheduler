import bcrypt from "bcryptjs";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { z } from "zod";
import { requireLocalDatabase } from "./localDatabaseGuard.mjs";

const TEST_PASSWORD = "DrillMapTest123";

export function parseTestUserArgs(args) {
  const { values } = parseArgs({
    args,
    options: { admin: { type: "boolean" }, email: { type: "string" } },
  });
  const role = values.admin ? "admin" : "student";
  const email = (values.email ?? `${role}@test.local`).trim().toLowerCase();
  if (!z.email().safeParse(email).success) throw new Error("Enter a valid email with --email.");
  return { email, role };
}

export async function createTestUser(collection, { email, role }) {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const result = await collection.updateOne(
    { email },
    {
      $set: { passwordHash, role },
      $setOnInsert: { name: role === "admin" ? "Test Admin" : "Test Student" },
    },
    { upsert: true },
  );
  if (!result.acknowledged || (result.matchedCount !== 1 && result.upsertedCount !== 1)) {
    throw new Error(`No Account saved for ${email}.`);
  }
  return { email, password: TEST_PASSWORD, role };
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to create a test Account with NODE_ENV=production.");
  }
  let account;
  try {
    account = parseTestUserArgs(process.argv.slice(2));
  } catch {
    throw new Error("Usage: npm run create-test-user -- [--admin] [--email <address>]");
  }
  const uri = process.env.MONGODB_URI;
  const host = requireLocalDatabase(uri);
  if (!/^mongodb:\/\//i.test(uri)) throw new Error("This command only supports MongoDB.");

  await mongoose.connect(uri, { dbName: "lsat-scheduler" });
  try {
    const result = await createTestUser(mongoose.connection.collection("users"), account);
    console.log(`Test Account ready on ${host}.`);
    console.log(`Email: ${result.email}`);
    console.log(`Password: ${result.password}`);
    console.log(`Role: ${result.role}`);
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
