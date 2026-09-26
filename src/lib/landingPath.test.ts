import { describe, expect, it } from "vitest";
import { landingPathForRole } from "./landingPath";

describe("role landing path", () => {
  it("sends admins to All students", () => {
    expect(landingPathForRole("admin")).toBe("/admin");
  });

  it("sends students and unknown roles to This week", () => {
    expect(landingPathForRole("student")).toBe("/dashboard");
    expect(landingPathForRole(undefined)).toBe("/dashboard");
  });
});
