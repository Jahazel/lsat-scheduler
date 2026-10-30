import { execFileSync } from "node:child_process";

const suppression = /eslint-disable|@ts-expect-error|@ts-ignore|@ts-nocheck|\/\*\s*eslint\s/;
const pathspecs = ["*.ts", "*.tsx", "*.mts", "*.cts", "*.js", "*.jsx", "*.mjs", "*.cjs", ":!scripts/check-suppressions*"];

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

const base = git("merge-base", "HEAD", process.argv[2] ?? "origin/main").trim();
const diff = git("diff", "--unified=0", "--no-color", "--no-renames", base, "HEAD", "--", ...pathspecs);

const removed = [];
const added = [];
let file = "";
let inHunk = false;
for (const line of diff.split("\n")) {
  if (line.startsWith("diff --git ")) {
    inHunk = false;
  } else if (!inHunk && line.startsWith("+++ ")) {
    file = line.slice(6);
  } else if (line.startsWith("@@")) {
    inHunk = true;
  } else if (inHunk && suppression.test(line)) {
    const text = line.slice(1).trim();
    if (line[0] === "+") added.push({ file, text });
    if (line[0] === "-") removed.push(text);
  }
}

const moved = new Set();
const fresh = added.filter(({ text }) => {
  const index = removed.findIndex((old, i) => old === text && !moved.has(i));
  if (index === -1) return true;
  moved.add(index);
  return false;
});

if (fresh.length === 0) {
  console.log("No new suppressions.");
} else {
  console.error(`This branch adds ${fresh.length} lint or type-check suppression(s). Fix the code so the rule passes instead of silencing it:`);
  for (const { file, text } of fresh) console.error(`  ${file}: ${text}`);
  process.exit(1);
}
