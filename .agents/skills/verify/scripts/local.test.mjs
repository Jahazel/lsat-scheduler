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

describe("local.mjs help", () => {
  it("lists every command without a database or run directory", () => {
    for (const flag of ["--help", "-h", "help"]) {
      const result = local(flag);
      expect(result.status).toBe(0);
      for (const command of commands) expect(result.stdout).toMatch(new RegExp(`^  ${command} `, "m"));
      expect(result.stdout).toContain("SKILL.md");
    }
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
  });
});
