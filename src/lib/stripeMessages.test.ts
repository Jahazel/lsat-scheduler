import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";

const SQL_WRITE = /\b(insert\s+into|update|delete\s+from|truncate)\s+(table\s+)?(public\.)?billing_records\b/i;
const DRIZZLE_WRITE = /\.(insert|update|delete)\(\s*billingRecords\b/;

it("finds no writer of billing records but the Stripe message receiver, the verify seed, and the test helper", async () => {
  const writers = [];
  for (const root of ["src", "scripts", "tests", "sql", ".agents"]) {
    for (const file of await readdir(root, { recursive: true })) {
      if (!/\.(ts|tsx|mts|mjs|js|sql)$/.test(file) || /\.test\.[a-z]+$/.test(file)) continue;
      const source = await readFile(path.join(root, file), "utf8");
      if (SQL_WRITE.test(source) || DRIZZLE_WRITE.test(source)) writers.push(path.join(root, file));
    }
  }
  expect(writers.sort()).toEqual([
    ".agents/skills/verify/scripts/local.mjs",
    "src/lib/stripeMessages.ts",
    "tests/postgres/appTestDatabase.ts",
  ]);
});
