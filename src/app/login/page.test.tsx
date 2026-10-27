// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PASSWORD_LOGIN_NOTICES } from "@/lib/loginNotice";

const actions = vi.hoisted(() => ({ signInWithGoogle: vi.fn(), logInWithPassword: vi.fn() }));
vi.mock("./actions", () => actions);
import LoginPage from "./page";

beforeEach(() => actions.logInWithPassword.mockReset());
afterEach(cleanup);

async function renderLogin(params: { error?: string; notice?: string } = {}) {
  render(await LoginPage({ searchParams: Promise.resolve(params) } as PageProps<"/login">));
}

async function logInAs(email: string, password: string) {
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: "Log in" }));
}

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

describe("Login", () => {
  it("offers Continue with Google, then the email and password form, and a way to Signup", async () => {
    await renderLogin();
    expect(screen.getByRole("heading", { name: "Log in to DrillMap" })).toBeTruthy();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Continue with Google", "Log in"]);
    expect(field("Email").getAttribute("type")).toBe("email");
    expect(field("Password").getAttribute("type")).toBe("password");
    expect(screen.getByRole("link", { name: "Sign up" }).getAttribute("href")).toBe("/signup");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it.each([
    [{ error: "AccessDenied" }, "alert", "Google sign-in didn't finish. Try again, or use a Google account with a verified email."],
    [{ error: "OAuthCallbackError" }, "alert", "Google sign-in didn't finish. Try again, or use a Google account with a verified email."],
    [{ error: "AccountDisabled" }, "alert", "This Account can't log in."],
    [{ error: "SessionEnded" }, "status", "Your session ended. Log in again."],
    [{ error: "CredentialsSignin" }, "alert", "That email and password don't match. Check both and try again, or reset your password."],
    [{ notice: "EmailVerified" }, "status", "Email verified. Log in."],
  ])("explains %o", async (params, role, text) => {
    await renderLogin(params);
    expect(screen.getByRole(role).textContent).toBe(text);
  });

  it.each([
    ["wrong email or password", PASSWORD_LOGIN_NOTICES.wrongEmailOrPassword, "alert"],
    ["paused", PASSWORD_LOGIN_NOTICES.paused, "alert"],
    ["verify your email", PASSWORD_LOGIN_NOTICES.verifyYourEmail, "status"],
  ])("shows %s above the fields, keeps the email, clears the password, and marks no field", async (_case, notice, role) => {
    actions.logInWithPassword.mockResolvedValue({ email: "maya.chen@fastmail.com", notice, passwordError: null });
    await renderLogin({ notice: "EmailVerified" });
    await logInAs("maya.chen@fastmail.com", "a long phrase that works");

    await waitFor(() => expect(screen.getByRole(role).textContent).toBe(notice.text));
    expect(screen.queryByText("Email verified. Log in.")).toBeNull();
    expect(field("Email").value).toBe("maya.chen@fastmail.com");
    expect(field("Password").value).toBe("");
    expect([field("Email"), field("Password")].map((input) => input.getAttribute("aria-invalid"))).toEqual([null, null]);
  });

  it("shows a too-long password beside the Password field", async () => {
    actions.logInWithPassword.mockResolvedValue({
      email: "maya.chen@fastmail.com", notice: null, passwordError: "That password is too long. Try a shorter one.",
    });
    await renderLogin();
    await logInAs("maya.chen@fastmail.com", "x".repeat(73));

    await waitFor(() => expect(field("Password").getAttribute("aria-invalid")).toBe("true"));
    expect(screen.getByText("That password is too long. Try a shorter one.").id).toBe(field("Password").getAttribute("aria-describedby"));
    expect(field("Email").value).toBe("maya.chen@fastmail.com");
  });
});
