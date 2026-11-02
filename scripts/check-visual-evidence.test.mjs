import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const script = path.resolve("scripts/check-visual-evidence.mjs");

function check({ files, body = "", labels = [] }) {
  const result = spawnSync(process.execPath, [script], {
    input: files.join("\n"),
    env: { ...process.env, PR_NUMBER: "42", PR_BODY: body, PR_LABELS: JSON.stringify(labels) },
    encoding: "utf8",
  });
  return { code: result.status, output: result.stdout + result.stderr };
}

describe("file rule", () => {
  it("passes a PR that changes only server, lib, test, and docs files", () => {
    const result = check({
      files: [
        "src/app/onboarding/actions.ts",
        "src/app/api/scan/route.ts",
        "src/lib/studentProfile.ts",
        "src/components/SignOutForm.test.tsx",
        "drizzle/0042_add_column.sql",
        "scripts/make-admin.mts",
        "docs/agents/issue-tracker.md",
      ],
    });
    expect(result.code).toBe(0);
  });

  it("fails a screen .tsx change with no picture and names only the screen files", () => {
    const result = check({
      files: ["src/app/progress/page.tsx", "src/components/WeekCard.tsx", "src/lib/engine.ts"],
    });
    expect(result.code).toBe(1);
    expect(result.output).toContain("src/app/progress/page.tsx");
    expect(result.output).toContain("src/components/WeekCard.tsx");
    expect(result.output).not.toContain("src/lib/engine.ts");
    expect(result.output).toContain("gh pr edit 42 --attach ./shot.png");
    expect(result.output).toContain("no-visual-change");
  });

  it("fails a .css change with no picture", () => {
    const result = check({ files: ["src/app/globals.css"] });
    expect(result.code).toBe(1);
    expect(result.output).toContain("src/app/globals.css");
  });

  it("ignores .tsx files outside src/app and src/components", () => {
    expect(check({ files: ["src/lib/emails/Welcome.tsx"] }).code).toBe(0);
  });
});

describe("picture rule", () => {
  const files = ["src/app/page.tsx"];

  it.each([
    ["a GitHub attachment link", "Shot: https://github.com/user-attachments/assets/1234-abcd"],
    ["a Markdown image", "![Progress page](https://example.test/shot.png)"],
    ["an img tag", '<img width="400" alt="Progress" src="https://example.test/shot.png">'],
    ["a video tag", '<VIDEO src="https://example.test/run.webm"></VIDEO>'],
  ])("passes a body with %s", (_kind, body) => {
    expect(check({ files, body }).code).toBe(0);
  });

  it("fails a body whose only image sits inside an HTML comment", () => {
    expect(check({ files, body: "<!-- ![Screenshot](https://example.test/shot.png) -->" }).code).toBe(1);
  });

  it("fails a body with a plain link that is not an image", () => {
    expect(check({ files, body: "See [the run](https://github.com/Jahazel/lsat-scheduler/actions)." }).code).toBe(1);
  });
});

describe("skip label", () => {
  it("passes a screen change that carries no-visual-change", () => {
    const result = check({ files: ["src/components/WeekCard.tsx"], labels: ["ready-for-agent", "no-visual-change"] });
    expect(result.code).toBe(0);
  });
});
