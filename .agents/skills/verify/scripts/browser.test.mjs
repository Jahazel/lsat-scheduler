import { describe, expect, it } from "vitest";
import { isAppCspViolation } from "./browser.mjs";

const violation = "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'nonce-abc''.";
const devtools = "http://127.0.0.1:3100/_next/static/chunks/node_modules_next_dist_compiled_next-devtools_index_1a2b3c.js";

describe("isAppCspViolation", () => {
  it("ignores violations from the Next devtools overlay", () => {
    expect(isAppCspViolation(violation, devtools)).toBe(false);
  });

  it("counts violations from every other source", () => {
    expect(isAppCspViolation(violation, "http://127.0.0.1:3100/_next/static/chunks/src_app_login_page_1a2b3c.js")).toBe(true);
    expect(isAppCspViolation(violation, "http://127.0.0.1:3100/login")).toBe(true);
    expect(isAppCspViolation(violation, "")).toBe(true);
  });

  it("ignores console messages that are not CSP violations", () => {
    expect(isAppCspViolation("Hydration finished", "http://127.0.0.1:3100/login")).toBe(false);
  });
});
