import { describe, expect, it } from "vitest";
import { newPasswordProblem, PASSWORD_MESSAGES } from "./passwordRules";

const email = "maya.chen@fastmail.com";

describe("a new password", () => {
  it.each([
    ["seven characters", "abcdefg", "tooShort"],
    ["73 ASCII bytes", "a".repeat(73), "tooLong"],
    ["25 three-byte characters (75 bytes)", "日".repeat(25), "tooLong"],
    ["on the common list", "password123", "tooCommon"],
    ["on the common list in another case", "PassWord123", "tooCommon"],
    ["the student's own email", email, "tooCommon"],
    ["the student's own email in another case", "Maya.Chen@Fastmail.com", "tooCommon"],
    ["the product name", "DrillMap", "tooCommon"],
  ] as const)("refuses %s", (_case, password, problem) => {
    expect(newPasswordProblem(password, email)).toBe(problem);
  });

  it.each([
    ["eight characters", "kq8vz!rm"],
    ["a long phrase", "correct horse battery staple on a tuesday"],
    ["exactly 72 ASCII bytes", "x".repeat(72)],
    ["24 three-byte characters (exactly 72 bytes)", "日".repeat(24)],
    ["18 four-byte characters (exactly 72 bytes)", "🦊".repeat(18)],
  ])("accepts %s", (_case, password) => {
    expect(newPasswordProblem(password, email)).toBeNull();
  });

  it("counts characters, not bytes, for the 8-character minimum", () => {
    expect(newPasswordProblem("🦊".repeat(7), email)).toBe("tooShort");
    expect(newPasswordProblem("🦊".repeat(8), email)).toBeNull();
  });

  it("uses the owner's messages", () => {
    expect(PASSWORD_MESSAGES).toEqual({
      tooShort: "That password is too short. Use at least 8 characters.",
      tooLong: "That password is too long. Try a shorter one.",
      tooCommon: "This password is too common. Choose a password that's harder to guess.",
    });
  });
});
