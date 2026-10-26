import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./local.mjs", import.meta.url));
const commands = ["launch", "doctor", "seed", "session", "inspect", "logs", "cleanup"];

function local(...args) {
  const env = { ...process.env };
  delete env.DATABASE_URL;
  return spawnSync(process.execPath, [script, ...args], { cwd: tmpdir(), env, encoding: "utf8" });
}

describe("local.mjs help", { timeout: 30_000 }, () => {
  it("lists every command without a database or run directory", () => {
    for (const flag of ["--help", "-h", "help"]) {
      const result = local(flag);
      expect(result.status).toBe(0);
      for (const command of commands) expect(result.stdout).toMatch(new RegExp(`^  ${command} `, "m"));
      expect(result.stdout).toContain("SKILL.md");
    }
  });

  it("shows each command's usage, also after its arguments or as help <command>", () => {
    for (const command of commands) {
      for (const args of [[command, "--help"], ["help", command]]) {
        const result = local(...args);
        expect(result.status).toBe(0);
        expect(result.stdout).toMatch(new RegExp(`^Usage: local\\.mjs ${command} <run-dir>`));
      }
    }
    const late = local("seed", ".verification/evidence/run", "student", "--help");
    expect(late.status).toBe(0);
    expect(late.stdout).toMatch(/^Usage: local\.mjs seed /);
  });

  it("explains one command's arguments with an example", () => {
    const result = local("seed", "--help");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("local.mjs seed <run-dir> student|admin <email> [--not-onboarded]");
    expect(result.stdout).toMatch(/Example:\n {2}\.\/\.agents\/skills\/verify\/scripts\/local\.mjs seed /);
    expect(result.stdout).not.toContain("local.mjs session");
  });

  it("names the problem and points to help for a wrong command", () => {
    const unknown = local("lauch", ".verification/evidence/run");
    expect(unknown.status).toBe(1);
    expect(unknown.stderr).toContain('Unknown command "lauch"');
    expect(unknown.stderr).toMatch(/^  launch /m);

    const missing = local("seed", ".verification/evidence/run", "teacher", "a@example.test");
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain("local.mjs seed <run-dir> student|admin <email> [--not-onboarded]");
    expect(missing.stderr).toContain("local.mjs seed --help");

    const none = local();
    expect(none.status).toBe(1);
    expect(none.stdout).toBe("");
    expect(none.stderr).toMatch(/^  launch /m);
  });

  it("refuses arguments each command does not take", () => {
    const run = ".verification/evidence/run";
    for (const args of [
      ["launch", run, "extra"], ["doctor", run, "extra"], ["inspect", run, "extra"], ["cleanup", run, "extra"],
      ["seed", run, "student"], ["seed", run, "admin", "a@example.test", "--onboarded"],
      ["session", run], ["session", run, "a@example.test", "--signed-in-minutes-ago", "ten"],
      ["logs", run, "--from"], ["logs", run, "--from", "abc"],
      ["doctor"],
    ]) {
      const result = local(...args);
      expect(result.status, args.join(" ")).toBe(1);
      expect(result.stderr, args.join(" ")).toContain(`Usage: local.mjs ${args[0]} <run-dir>`);
    }
  });
});
