import { execFileSync } from "node:child_process";

const pattern = "eslint-disable|@ts-expect-error|@ts-ignore|@ts-nocheck";
const pathspecs = ["*.ts", "*.tsx", "*.mts", "*.cts", "*.js", "*.jsx", "*.mjs", "*.cjs", ":!scripts/check-suppressions*"];

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function countByFile(revision) {
  let output;
  try {
    output = git("grep", "--count", "-E", pattern, revision, "--", ...pathspecs);
  } catch (error) {
    if (error.status === 1) return new Map();
    throw error;
  }
  return new Map(output.split("\n").map((line) => {
    const [, file, count] = line.match(/^[^:]+:(.+):(\d+)$/);
    return [file, Number(count)];
  }));
}

const sum = (counts) => [...counts.values()].reduce((total, count) => total + count, 0);

const base = git("merge-base", "HEAD", process.argv[2] ?? "origin/main");
const before = countByFile(base);
const after = countByFile("HEAD");

if (sum(after) <= sum(before)) {
  console.log(`Suppressions: ${sum(after)} (the base has ${sum(before)}).`);
} else {
  console.error(`Suppressions went up from ${sum(before)} to ${sum(after)}. Fix the code so the lint or type rule passes instead of silencing it.`);
  for (const [file, count] of after) {
    const old = before.get(file) ?? 0;
    if (count > old) console.error(`  ${file}: ${old} -> ${count}`);
  }
  process.exit(1);
}
