import { describe, expect, it } from "vitest";
import { serverErrors } from "./appLog.mjs";

const log = [
  "\u001b[32m✓\u001b[39m Ready in 1200ms",
  " GET /login 200 in 85ms",
  "\u001b[31m[auth][error]\u001b[0m JWTSessionError: Read more at https://errors.authjs.dev#jwtsessionerror",
  "\u001b[31m[auth][cause]\u001b[0m: Error: no matching decryption secret",
  "    at decode (node_modules/next-auth/jwt.js:10:5)",
  " POST /dashboard/upload 500 in 40ms",
  " ⨯ Error: Weekly schedule was not saved",
  "    at confirmWeeklyUpload (src/app/dashboard/upload/actions.ts:88:11)",
  "  digest: '395723772'",
  "",
  " GET /dashboard 200 in 30ms",
  "[browser] A tree hydrated but some attributes of the server rendered HTML didn't match",
  "\u001b[1m\u001b[31mFATAL\u001b[39m\u001b[0m: An unexpected Turbopack error occurred.",
  " GET /settings 200 in 20ms",
].join("\n");

describe("serverErrors", () => {
  it("returns each error with its indented detail lines and without colour codes", () => {
    expect(serverErrors(log)).toEqual([
      "[auth][error] JWTSessionError: Read more at https://errors.authjs.dev#jwtsessionerror\n[auth][cause]: Error: no matching decryption secret\n    at decode (node_modules/next-auth/jwt.js:10:5)",
      " ⨯ Error: Weekly schedule was not saved\n    at confirmWeeklyUpload (src/app/dashboard/upload/actions.ts:88:11)\n  digest: '395723772'",
      "[browser] A tree hydrated but some attributes of the server rendered HTML didn't match",
      "FATAL: An unexpected Turbopack error occurred.",
    ]);
  });

  it("returns the app's one-line JSON error events", () => {
    const events = '{"event":"spend_alert_not_sent","alert":"daily","error":"TypeError"}\n GET /dashboard 200 in 30ms\n{"event":"postgres_idle_connection_error","code":"57P01"}';
    expect(serverErrors(events)).toEqual([
      '{"event":"spend_alert_not_sent","alert":"daily","error":"TypeError"}',
      '{"event":"postgres_idle_connection_error","code":"57P01"}',
    ]);
  });

  it("returns nothing for a log of successful requests", () => {
    expect(serverErrors(" GET /login 200 in 85ms\n POST /settings 303 in 12ms\n")).toEqual([]);
  });
});
