import { execFile, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, expect, it } from "vitest";

const exec = promisify(execFile);
const script = path.resolve("scripts/check-suppressions.mjs");
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")));
let repo;

function git(...args) {
  execFileSync("git", ["-c", "user.name=test", "-c", "user.email=test@example.invalid", ...args], { cwd: repo, env });
}

function commit(file, text) {
  writeFileSync(path.join(repo, file), text);
  git("add", "--all");
  git("commit", "--quiet", "-m", file);
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
  commit("old.ts", "// eslint-disable-next-line no-console -- kept\nconsole.log(1);\n");
  git("switch", "--quiet", "-c", "work");
});

afterEach(() => rmSync(repo, { recursive: true, force: true }));

it.each([
  ["eslint-disable", "/* eslint-disable */\n"],
  ["@ts-expect-error", "// @ts-expect-error wrong type\nconst a: number = 'a';\n"],
  ["@ts-ignore", "// @ts-ignore\nconst b: number = 'b';\n"],
  ["@ts-nocheck", "// @ts-nocheck\n"],
])("fails a branch that adds %s and names the file", async (_name, text) => {
  commit("new.tsx", text);
  const result = await check();
  expect(result.code).toBe(1);
  expect(result.output).toContain("Suppressions went up from 1 to 2.");
  expect(result.output).toContain("new.tsx: 0 -> 1");
});

it("passes a branch that keeps the count", async () => {
  commit("new.ts", "export const value = 1;\n");
  const result = await check();
  expect(result.code).toBe(0);
  expect(result.output).toContain("Suppressions: 1 (the base has 1).");
});

it("passes a branch that removes a suppression", async () => {
  commit("old.ts", "console.log(1);\n");
  const result = await check();
  expect(result.code).toBe(0);
  expect(result.output).toContain("Suppressions: 0 (the base has 1).");
});

it("ignores suppressions in files that are not code", async () => {
  commit("notes.md", "Never add eslint-disable.\n");
  expect((await check()).code).toBe(0);
});
