// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const actions = vi.hoisted(() => ({ signUpWithGoogle: vi.fn(), signUpWithPassword: vi.fn() }));
vi.mock("./actions", () => actions);
import SignupPage from "./page";

beforeEach(() => {
  actions.signUpWithGoogle.mockReset();
  actions.signUpWithPassword.mockReset();
});
afterEach(cleanup);

async function fillIn() {
  await userEvent.type(screen.getByLabelText("Name"), "Maya Chen");
  await userEvent.type(screen.getByLabelText("Email"), "maya.chen@fastmail.com");
  await userEvent.type(screen.getByLabelText("Password"), "a long phrase that works");
}

describe("Signup", () => {
  it("offers Google, then the password form with the Terms box above Create account, and a way to Login", () => {
    render(<SignupPage />);
    expect(screen.getByRole("heading", { name: "Sign up for DrillMap" })).toBeTruthy();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Continue with Google", "Create account"]);
    expect(screen.getByText(/By continuing with Google, you agree to the/)).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "I agree to the Terms of Service and Privacy Policy" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Terms of Service" }).map((link) => link.getAttribute("href")))
      .toEqual(["/legal/terms", "/legal/terms"]);
    expect(screen.getByText("At least 8 characters. A long phrase works well.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/login");
  });

  it("starts Google signup without the box", async () => {
    render(<SignupPage />);
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(actions.signUpWithGoogle).toHaveBeenCalled());
    expect(actions.signUpWithPassword).not.toHaveBeenCalled();
  });

  it("shows a refusal beside its field and keeps what the student typed", async () => {
    actions.signUpWithPassword.mockResolvedValue({ kind: "form", errors: { terms: "Tick the box to continue." } });
    render(<SignupPage />);
    await fillIn();
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    const box = screen.getByRole("checkbox");
    await waitFor(() => expect(box.getAttribute("aria-invalid")).toBe("true"));
    expect(screen.getByText("Tick the box to continue.").id).toBe(box.getAttribute("aria-describedby"));
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("a long phrase that works");
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("maya.chen@fastmail.com");
  });

  it("shows Check your email, and Sign up again brings back an empty form", async () => {
    actions.signUpWithPassword.mockResolvedValue({ kind: "checkYourEmail", email: "maya.chen@fastmail.com" });
    render(<SignupPage />);
    await fillIn();
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeTruthy();
    expect(screen.getByText("We sent an email to maya.chen@fastmail.com. Open the link in it to finish signing up.")).toBeTruthy();
    expect(screen.getByText("The link works for 24 hours.")).toBeTruthy();
    const sent = actions.signUpWithPassword.mock.calls[0][1] as FormData;
    expect(Object.fromEntries(sent)).toEqual({
      name: "Maya Chen", email: "maya.chen@fastmail.com", password: "a long phrase that works", agreedToTerms: "on",
    });

    await userEvent.click(screen.getByRole("button", { name: "Sign up again" }));
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("");
  });
});
