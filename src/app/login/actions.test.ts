import { beforeEach, describe, expect, it, vi } from "vitest";
const { signIn, findOne } = vi.hoisted(() => ({ signIn: vi.fn(), findOne: vi.fn() }));
vi.mock("@/auth", () => ({ signIn }));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/models/User", () => ({ UserModel: { findOne } }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));
import { login, signInWithGoogle } from "./actions";
import { AuthError } from "next-auth";

function credentials() {
  const form = new FormData();
  form.set("email", " QA@example.test ");
  form.set("password", "test-password");
  return form;
}

describe("sign-in destination", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    signIn.mockImplementation(async (_provider, options) => {
      if (options.redirect !== false) throw new Error(`REDIRECT:${options.redirectTo}`);
    });
  });

  it("sends a verified admin directly to All students", async () => {
    findOne.mockImplementation(async ({ email }) => email === "qa@example.test" ? { role: "admin" } : null);
    await expect(login({}, credentials())).rejects.toThrow("REDIRECT:/admin");
  });

  it("sends a verified student directly to This week", async () => {
    findOne.mockResolvedValue({ role: "student" });
    await expect(login({}, credentials())).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("rejects invalid credentials without redirecting", async () => {
    signIn.mockRejectedValue(new AuthError());
    await expect(login({}, credentials())).resolves.toEqual({ error: "Invalid email or password." });
    expect(findOne).not.toHaveBeenCalled();
  });

  it("propagates unexpected authentication failures", async () => {
    signIn.mockRejectedValue(new Error("Authentication unavailable"));
    await expect(login({}, credentials())).rejects.toThrow("Authentication unavailable");
  });

  it("lets the role-aware login redirect handle Google sign-in", async () => {
    signIn.mockResolvedValue(undefined);
    await signInWithGoogle();
    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/login" });
  });
});
