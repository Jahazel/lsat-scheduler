import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(tsx?|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe("motion durations", () => {
  it("come from the motion tokens, not hand-typed Tailwind numbers", () => {
    const offenders = sourceFiles(SRC).flatMap((file) =>
      (readFileSync(file, "utf8").match(/\bduration-\d+\b/g) ?? []).map((match) => `${path.relative(SRC, file)}: ${match}`),
    );
    expect(offenders).toEqual([]);
  });
});
