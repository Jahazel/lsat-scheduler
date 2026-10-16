import { describe, expect, it } from "vitest";
import { parseTestUserArgs } from "./create-test-user.mts";

describe("parseTestUserArgs", () => {
  it("uses the default Account", () => {
    expect(parseTestUserArgs([])).toEqual({ email: "student@test.local" });
  });

  it("normalizes a custom Account email", () => {
    expect(parseTestUserArgs(["--email", " Parallel@Test.Local "])).toEqual({ email: "parallel@test.local" });
  });

  it.each([
    ["--email"], ["--email", ""], ["--email", "   "], ["--email", "invalid"],
    ["--unknown"], ["--admin"], ["student@test.local"],
  ].map((args) => [args]))("refuses invalid arguments %j", (args) => {
    expect(() => parseTestUserArgs(args)).toThrow();
  });
});
