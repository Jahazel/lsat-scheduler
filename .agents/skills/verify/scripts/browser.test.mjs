import { describe, expect, it } from "vitest";
import { chromiumLaunchOptions, drive, editableFieldsHydrated, isAppCspViolation } from "./browser.mjs";

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

describe("editableFieldsHydrated", () => {
  const page = (...fields) => ({ querySelectorAll: () => fields });
  const hydrated = () => ({ __reactFiber$abc: {} });

  it("waits while any text field has no React fiber yet", () => {
    expect(editableFieldsHydrated(page(hydrated(), {}))).toBe(false);
  });

  it("is ready when every text field has its React fiber, or there is none", () => {
    expect(editableFieldsHydrated(page(hydrated(), hydrated()))).toBe(true);
    expect(editableFieldsHydrated(page())).toBe(true);
  });
});

describe("chromiumLaunchOptions", () => {
  it("keeps Playwright's hidden scrollbars by default", () => {
    expect(chromiumLaunchOptions()).toEqual({ headless: true });
    expect(chromiumLaunchOptions({})).toEqual({ headless: true });
  });

  it("drops the hide-scrollbars switch when asked to show scrollbars", () => {
    expect(chromiumLaunchOptions({ showScrollbars: true })).toEqual({ headless: true, ignoreDefaultArgs: ["--hide-scrollbars"] });
  });
});

describe("drive", () => {
  it("names every argument, including the optional scrollbar option, when called wrongly", async () => {
    await expect(drive(undefined, "Not A Name", async () => {})).rejects.toThrow(
      "Usage: drive(.verification/evidence/<run-name>, <lowercase-drive-name>, steps[, { showScrollbars: true }])");
  });
});
