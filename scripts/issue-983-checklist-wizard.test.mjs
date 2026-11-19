import { execFile, execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const wizard = fileURLToPath(new URL("./issue-983-checklist-wizard.sh", import.meta.url));
const library = fileURLToPath(new URL("./stage7-wizard-lib.sh", import.meta.url));
const evidence = fileURLToPath(new URL("../docs/security/issue-983-stage7-full-run-evidence.md", import.meta.url));
const gate = fileURLToPath(new URL("../docs/security/release-gate.md", import.meta.url));
const grantCheck = fileURLToPath(new URL("../sql/production-grant-check.sql", import.meta.url));
const providerCommands = ["curl", "gh", "vercel", "neonctl", "psql", "npm", "node", "pbcopy", "pbpaste", "open", "xdg-open", "wslview", "sleep"];

function hasShellcheck() {
  try {
    execFileSync("shellcheck", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function section(text, heading) {
  const start = text.indexOf(`\n## ${heading}\n`);
  if (start < 0) throw new Error(`No section ${heading}`);
  const end = text.indexOf("\n## ", start + 1);
  return text.slice(start, end < 0 ? undefined : end);
}

function tableRows(text) {
  return [...text.matchAll(/^\| (.+) \|$/gm)].map((match) => match[1].split(" | ").map((cell) => cell.trim()));
}

const evidenceText = readFileSync(evidence, "utf8");
const checklist = [...readFileSync(gate, "utf8").matchAll(/^\| ([A-J]\d+) \| [^|]+ \| ([^|]+) \| [^|]+ \| [^|]+ \| [^|]+ \|$/gm)]
  .map((match) => ({ row: match[1], kind: match[2].trim() }));
const runSheet = tableRows(section(evidenceText, "Owner run sheet")).filter(([step]) => /^\d+\.\d+$/.test(step))
  .map(([step, check, action, expected]) => ({ step, check, action, expected }));
const rowMap = tableRows(section(evidenceText, "Row map")).filter(([row]) => /^[A-J]\d+$/.test(row))
  .map(([row, kind, steps]) => ({ row, kind, steps: steps.split(", ") }));
const fullRunKind = (kind) => /Auto|Copy|Settings/.test(kind);

describe("Stage 7 full-checklist wizard", () => {
  let home;
  let calls;
  let dryRun;

  beforeAll(async () => {
    home = mkdtempSync(path.join(tmpdir(), "checklist-983-home-"));
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
    expect(() => execFileSync("bash", ["-n", library])).not.toThrow();
  });

  it.skipIf(!hasShellcheck())("passes shellcheck at warning level", () => {
    expect(() => execFileSync("shellcheck", ["-x", "--severity=warning", wizard])).not.toThrow();
  });

  it("prints every run sheet step in a dry run without calling a provider or keeping a file", () => {
    expect(dryRun.code).toBe(0);
    const printed = [...dryRun.output.matchAll(/^ {2}Step (\d+\.\d+) · /gm)].map((match) => match[1]);
    expect(printed).toEqual(runSheet.map(({ step }) => step));
    expect(existsSync(calls)).toBe(false);
    expect(readdirSync(home).sort()).toEqual(["bin"]);
    expect(dryRun.output).toContain("Dry run done.");
    expect(dryRun.output).not.toMatch(/has no section|is not recorded yet|command not found|unbound variable/);
  });

  it("maps every launch checklist row to its steps exactly once", () => {
    expect(checklist).toHaveLength(65);
    expect(rowMap.map(({ row }) => row)).toEqual(checklist.map(({ row }) => row));
    expect(rowMap.map(({ kind }) => kind)).toEqual(checklist.map(({ kind }) => kind));
    const steps = new Map(runSheet.map((entry) => [entry.step, entry]));
    for (const { row, steps: named } of rowMap) {
      for (const step of named) expect(steps.has(step), `${row} names step ${step}`).toBe(true);
    }
  });

  it("has one full-run step for each row whose Kind includes Auto, Copy, or Settings, and for no other row", () => {
    const fullRun = runSheet.filter(({ step }) => step.startsWith("2."));
    expect(fullRun.map(({ check }) => check)).toEqual(checklist.filter(({ kind }) => fullRunKind(kind)).map(({ row }) => row));
    for (const { row, kind, steps } of rowMap) {
      const own = fullRun.filter(({ check }) => check === row).map(({ step }) => step);
      expect(steps.filter((step) => step.startsWith("2.")), row).toEqual(own);
      if (!fullRunKind(kind)) expect(steps, row).not.toHaveLength(0);
    }
  });

  it("names the evidence of each full-run step by its Kind", () => {
    const kinds = new Map(checklist.map(({ row, kind }) => [row, kind]));
    for (const { step, check, action } of runSheet.filter((entry) => entry.step.startsWith("2."))) {
      const kind = kinds.get(check);
      if (kind.includes("Auto")) expect(action, step).toContain("Auto: the Checks run");
      if (kind.includes("Copy")) expect(action, step).toMatch(/Copy[,:]/);
      if (kind.includes("Settings")) expect(action, step).toMatch(/Settings: /);
    }
  });

  it("runs the live checks the issue lists, after the release and its grant check", () => {
    const checks = runSheet.map(({ check }) => check);
    for (const row of ["A5", "E2", "E3", "E4", "C5", "J8", "J16"]) {
      expect(runSheet.some(({ step, check }) => step.startsWith("4.") && check === row), row).toBe(true);
    }
    expect(checks.indexOf("#79 grant check")).toBeLessThan(checks.indexOf("E2"));
    expect(runSheet.find(({ check }) => check === "#79 grant check").action).toContain("sql/production-grant-check.sql");
    expect(runSheet.some(({ step, action }) => step.startsWith("4.") && action.includes("#937"))).toBe(true);
    expect(runSheet.at(-4)).toMatchObject({ step: "4.10", check: "Cleanup" });
  });

  it("has every field that Ready and go asks for in the readiness record template", () => {
    const record = section(evidenceText, "Readiness record");
    for (const field of ["Version (full commit SHA", "Date of the checks", "Docs-only commits after the candidate",
      "### Evidence for each check", "### Accepted risks", "### Items outside the checklist", "#731", "#973", "#974",
      "### When this record expires", "The live version changes.", "A provider setting on the launch checklist changes.",
      "30 days pass", "### Go decision"]) {
      expect(record, field).toContain(field);
    }
    const evidenceRows = tableRows(record.slice(record.indexOf("### Evidence for each check"), record.indexOf("### Accepted risks")))
      .map(([row]) => row).filter((row) => /^[A-J]\d+$/.test(row));
    expect(evidenceRows).toEqual(checklist.map(({ row }) => row));
    const risks = tableRows(section(readFileSync(gate, "utf8"), "Accepted risks")).slice(2);
    const recorded = tableRows(record.slice(record.indexOf("### Accepted risks"), record.indexOf("### Items outside"))).slice(2);
    expect(recorded).toHaveLength(risks.length);
  });

  it("refuses a step that does not exist", () => {
    const result = (() => {
      try {
        execFileSync("bash", [wizard, "--dry-run", "--from", "6.1"], { env: { HOME: home, PATH: process.env.PATH }, stdio: "pipe" });
        return { code: 0, output: "" };
      } catch (error) {
        return { code: error.status, output: String(error.stdout) };
      }
    })();
    expect(result.code).toBe(2);
    expect(result.output).toContain("No step 6.1.");
  });

  it("keeps private values out of the evidence file and the grant check", () => {
    for (const text of [evidenceText, readFileSync(grantCheck, "utf8")]) {
      expect(text).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/);
      expect(text).not.toMatch(/sk_(test|live)_|rk_live_[A-Za-z0-9]|whsec_|sk-ant-|re_[A-Za-z0-9]{8}|npg_|napi_|eyJ/);
      expect(text).not.toMatch(/postgres(ql)?:\/\//);
      expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
      expect(text).not.toMatch(/\b\d{15,}\b/);
    }
  });
});
