import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("runs make-admin without a preset environment file", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

  expect(packageJson.scripts["make-admin"]).toBe("node --import tsx scripts/make-admin.mts");
});
