import { execFile, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, expect, it } from "vitest";

const exec = promisify(execFile);
const script = path.resolve("scripts/check-suppressions.mjs");
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")));
const kept = "// eslint-disable-next-line no-console -- kept";
let repo;

function git(...args) {
  execFileSync("git", ["-c", "user.name=test", "-c", "user.email=test@example.invalid", ...args], { cwd: repo, env });
}

function commit(files) {
  for (const [file, text] of Object.entries(files)) writeFileSync(path.join(repo, file), text);
  git("add", "--all");
  git("commit", "--quiet", "-m", "change");
}

async function check() {
  try {
    const result = await exec(process.execPath, [script, "main"], { cwd: repo, env });
    return { code: 0, output: result.stdout + result.stderr };
  } catch (error) {
    return { code: error.code, output: error.stdout + error.stderr };
  }
}

beforeEach(() => {
  repo = mkdtempSync(path.join(tmpdir(), "suppressions-"));
  git("init", "--quiet", "-b", "main");
  commit({ "old.ts": `${kept}\nconsole.log(1);\n` });
  git("switch", "--quiet", "-c", "work");
});

afterEach(() => rmSync(repo, { recursive: true, force: true }));

it.each([
  ["eslint-disable", "/* eslint-disable */"],
  ["@ts-expect-error", "// @ts-expect-error wrong type"],
  ["@ts-ignore", "// @ts-ignore"],
  ["@ts-nocheck", "// @ts-nocheck"],
  ["an inline rule setting", '/* eslint no-console: "off" */'],
])("fails a branch that adds %s and names the file", async (_name, text) => {
  commit({ "new.tsx": `${text}\n` });
  const result = await check();
  expect(result.code).toBe(1);
  expect(result.output).toContain("This branch adds 1 lint or type-check suppression(s).");
  expect(result.output).toContain(`new.tsx: ${text}`);
});

it("fails a branch that swaps an old suppression for a new one", async () => {
  commit({ "old.ts": "console.log(1);\n", "new.ts": "// @ts-ignore\n" });
  const result = await check();
  expect(result.code).toBe(1);
  expect(result.output).toContain("new.ts: // @ts-ignore");
});

it("fails a branch that turns off one more rule on an existing line", async () => {
  commit({ "old.ts": "// eslint-disable-next-line no-console, no-alert -- kept\nconsole.log(1);\n" });
  expect((await check()).code).toBe(1);
});

it("passes a branch that moves a suppression to another file", async () => {
  commit({ "old.ts": "export {};\n", "moved.ts": `${kept}\nconsole.log(1);\n` });
  const result = await check();
  expect(result.code).toBe(0);
  expect(result.output).toContain("No new suppressions.");
});

it("passes a branch that only rewords the reason on a suppressed line", async () => {
  commit({ "old.ts": "// eslint-disable-next-line no-console -- a better reason\nconsole.log(1);\n" });
  const result = await check();
  expect(result.code).toBe(0);
  expect(result.output).toContain("No new suppressions.");
});

it("passes a branch that edits the code on a line that ends in a suppression", async () => {
  commit({ "line.ts": "alert(1); // eslint-disable-line no-alert -- kept\n" });
  git("switch", "--quiet", "main");
  git("merge", "--quiet", "work");
  git("switch", "--quiet", "-c", "edit");
  commit({ "line.ts": "alert(2); // eslint-disable-line no-alert -- kept\n" });
  expect((await check()).code).toBe(0);
});

it("passes a branch that removes a suppression", async () => {
  commit({ "old.ts": "console.log(1);\n" });
  expect((await check()).code).toBe(0);
});

it("ignores suppressions in files that are not code", async () => {
  commit({ "notes.md": "Never add eslint-disable.\n" });
  expect((await check()).code).toBe(0);
});
