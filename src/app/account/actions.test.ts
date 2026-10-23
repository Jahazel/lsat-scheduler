import { expect, it, vi } from "vitest";

const signIn = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: vi.fn(), signIn, signOut: vi.fn() }));
import { signInAgainToDelete } from "./actions";

it("Sign in again shows the Google account chooser and returns to the deletion form", async () => {
  await signInAgainToDelete();
  expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/account#delete-account" }, { prompt: "select_account" });
});
