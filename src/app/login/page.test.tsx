// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("./actions", () => ({ signInWithGoogle: vi.fn(), logInWithPassword: vi.fn() }));
import LoginPage from "./page";

afterEach(cleanup);

async function renderLogin(params: { error?: string; notice?: string } = {}) {
  render(await LoginPage({ searchParams: Promise.resolve(params) } as PageProps<"/login">));
}

describe("Login", () => {
  it("offers Continue with Google, then the email and password form, and a way to Signup", async () => {
    await renderLogin();
    expect(screen.getByRole("heading", { name: "Log in to DrillMap" })).toBeTruthy();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Continue with Google", "Log in"]);
    expect(screen.getByLabelText("Email").getAttribute("type")).toBe("email");
    expect(screen.getByLabelText("Password").getAttribute("type")).toBe("password");
    expect(screen.getByRole("link", { name: "Sign up" }).getAttribute("href")).toBe("/signup");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it.each([
    [{ error: "AccessDenied" }, "alert", "Google sign-in didn't finish. Try again, or use a Google account with a verified email."],
    [{ error: "OAuthCallbackError" }, "alert", "Google sign-in didn't finish. Try again, or use a Google account with a verified email."],
    [{ error: "AccountDisabled" }, "alert", "This Account can't sign in."],
    [{ error: "SessionEnded" }, "status", "Your session ended. Log in again."],
    [{ error: "CredentialsSignin" }, "alert", "That email and password don't match. Check both and try again, or reset your password."],
    [{ notice: "EmailVerified" }, "status", "Email verified. Log in."],
  ])("explains %o", async (params, role, text) => {
    await renderLogin(params);
    expect(screen.getByRole(role).textContent).toBe(text);
  });
});
