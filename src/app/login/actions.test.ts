import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock("@/auth", () => ({ signIn: mocks.signIn, LoginRefused: class extends Error {} }));
import { logInWithPassword, signInWithGoogle } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
});

it("a password login lands on This week's address, so the address bar does not keep /login", async () => {
  const form = new FormData();
  form.set("email", "amy@example.test");
  form.set("password", "a long practice phrase 42");
  await logInWithPassword(null, form);
  expect(mocks.signIn).toHaveBeenCalledWith("credentials", {
    email: "amy@example.test", password: "a long practice phrase 42", redirectTo: "/dashboard",
  });
});

it("Google sign-in still returns to Login, which sends each role to its own page", async () => {
  await signInWithGoogle();
  expect(mocks.signIn).toHaveBeenCalledWith("google", { redirectTo: "/login" });
});
