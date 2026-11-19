import { execFile, execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const wizard = fileURLToPath(new URL("./issue-982-drill-wizard.sh", import.meta.url));
const evidence = fileURLToPath(new URL("../docs/security/issue-982-stage7-drill-evidence.md", import.meta.url));
const providerCommands = ["curl", "gh", "vercel", "neonctl", "psql", "npm", "node", "pbcopy", "pbpaste", "open", "xdg-open", "wslview", "sleep"];

function hasShellcheck() {
  try {
    execFileSync("shellcheck", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function runSheetSteps() {
  return [...readFileSync(evidence, "utf8").matchAll(/^\| (\d+\.\d+) \| [^|]+ \| [^|]+ \| [^|]+ \|$/gm)].map((match) => match[1]);
}

describe("Stage 7 drill wizard", () => {
  let home;
  let calls;
  let dryRun;

  beforeAll(async () => {
    home = mkdtempSync(path.join(tmpdir(), "drill-982-home-"));
    const traps = path.join(home, "bin");
    calls = path.join(home, "calls.log");
    execFileSync("mkdir", [traps]);
    for (const command of providerCommands) {
      const file = path.join(traps, command);
      writeFileSync(file, `#!/bin/sh\necho ${command} >> '${calls}'\nexit 1\n`);
      chmodSync(file, 0o755);
    }
    dryRun = await new Promise((resolve) => {
      const child = execFile("bash", [wizard, "--dry-run"], {
        env: { HOME: home, PATH: `${traps}:${process.env.PATH}`, TERM: "dumb" },
        timeout: 60_000,
      }, (error, stdout, stderr) => resolve({ code: error?.code ?? 0, output: stdout + stderr }));
      child.stdin.end();
    });
  }, 70_000);

  afterAll(() => rmSync(home, { recursive: true, force: true }));

  it("parses with bash -n", () => {
    expect(() => execFileSync("bash", ["-n", wizard])).not.toThrow();
  });

  it.skipIf(!hasShellcheck())("passes shellcheck at warning level", () => {
    expect(() => execFileSync("shellcheck", ["--severity=warning", wizard])).not.toThrow();
  });

  it("prints every run sheet step in a dry run without calling a provider or keeping a file", () => {
    expect(dryRun.code).toBe(0);
    const printed = [...dryRun.output.matchAll(/^ {2}Step (\d+\.\d+) · /gm)].map((match) => match[1]);
    expect(printed).toEqual(runSheetSteps());
    expect(printed).toHaveLength(34);
    expect(existsSync(calls)).toBe(false);
    expect(readdirSync(home).sort()).toEqual(["bin"]);
    expect(dryRun.output).toContain("Dry run done.");
  });

  it("names a guide section in every step", () => {
    const steps = dryRun.output.split(/^ {2}Step (?=\d+\.\d+ · )/m).slice(1);
    const withoutGuide = steps.filter((step) => !/Guide: /.test(step)).map((step) => step.split(" ")[0]);
    expect(withoutGuide).toEqual([]);
  });

  it("refuses a step that does not exist", () => {
    const result = (() => {
      try {
        execFileSync("bash", [wizard, "--dry-run", "--from", "5.1"], { env: { HOME: home, PATH: process.env.PATH }, stdio: "pipe" });
        return { code: 0, output: "" };
      } catch (error) {
        return { code: error.status, output: String(error.stdout) };
      }
    })();
    expect(result.code).toBe(2);
    expect(result.output).toContain("No step 5.1.");
  });

  it("keeps private values out of the evidence file", () => {
    const text = readFileSync(evidence, "utf8");
    expect(text).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/);
    expect(text).not.toMatch(/sk_(test|live)_|rk_live_|whsec_|sk-ant-|re_[A-Za-z0-9]{8}|npg_|napi_|eyJ/);
    expect(text).not.toMatch(/postgres(ql)?:\/\//);
    expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
    expect(text).not.toMatch(/\b\d{15,}\b/);
  });
});
