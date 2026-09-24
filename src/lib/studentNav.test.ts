import { describe, expect, it } from "vitest";
import { initialsFor } from "./studentNav";

describe("initialsFor", () => {
  it("uses first and last name initials", () => {
    expect(initialsFor("Sam Rivera", "sam@example.com")).toBe("SR");
    expect(initialsFor("Sam Q. Rivera", null)).toBe("SR");
  });

  it("falls back to a single name, then the email", () => {
    expect(initialsFor("Sam", null)).toBe("SA");
    expect(initialsFor(null, "jo@example.com")).toBe("J");
    expect(initialsFor("  ", undefined)).toBe("?");
  });
});
