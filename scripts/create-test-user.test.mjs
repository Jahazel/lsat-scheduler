import { describe, expect, it } from "vitest";
import { parseTestUserArgs } from "./create-test-user.mts";

describe("parseTestUserArgs", () => {
  it.each([
    [[], { email: "student@test.local", role: "student" }],
    [["--admin"], { email: "admin@test.local", role: "admin" }],
  ])("uses the default Account for %j", (args, account) => {
    expect(parseTestUserArgs(args)).toEqual(account);
  });

  it.each([
    [["--email", " Parallel@Test.Local "], "student"],
    [["--admin", "--email", " Parallel@Test.Local "], "admin"],
    [["--email", " Parallel@Test.Local ", "--admin"], "admin"],
  ])("normalizes a custom Account email with %j", (args, role) => {
    expect(parseTestUserArgs(args)).toEqual({ email: "parallel@test.local", role });
  });

  it.each([
    ["--email"], ["--email", ""], ["--email", "   "], ["--email", "invalid"],
    ["--unknown"], ["student@test.local"],
  ].map((args) => [args]))("refuses invalid arguments %j", (args) => {
    expect(() => parseTestUserArgs(args)).toThrow();
  });
});
