// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("./actions", () => ({ signInWithGoogle: vi.fn() }));
import LoginPage from "./page";

afterEach(cleanup);

async function renderLogin(error?: string) {
  render(await LoginPage({ searchParams: Promise.resolve(error === undefined ? {} : { error }) } as PageProps<"/login">));
}

describe("Login", () => {
  it("offers only Continue with Google and a way to Signup", async () => {
    await renderLogin();
    expect(screen.getByRole("heading", { name: "Log in to DrillMap" })).toBeTruthy();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Continue with Google"]);
    expect(document.querySelector("input")).toBeNull();
    expect(screen.getByRole("link", { name: "Sign up" }).getAttribute("href")).toBe("/signup");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it.each([
    ["AccessDenied", "alert", "Google sign-in didn't finish. Try again, or use a Google account with a verified email."],
    ["OAuthCallbackError", "alert", "Google sign-in didn't finish. Try again, or use a Google account with a verified email."],
    ["AccountDisabled", "alert", "This Account can't sign in."],
    ["SessionEnded", "status", "Your session ended. Sign in again."],
  ])("explains the %s reason", async (error, role, text) => {
    await renderLogin(error);
    expect(screen.getByRole(role).textContent).toBe(text);
  });
});
