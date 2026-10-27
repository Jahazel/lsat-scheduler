// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const requestPasswordReset = vi.hoisted(() => vi.fn());
vi.mock("./actions", () => ({ requestPasswordReset }));
import ForgotPasswordPage from "./page";

afterEach(() => {
  cleanup();
  requestPasswordReset.mockReset();
});

describe("Forgot password", () => {
  it("sends the typed email, then shows the one message that fits every email", async () => {
    requestPasswordReset.mockResolvedValue({ kind: "sent", email: "maya.chen@fastmail.com" });
    render(<ForgotPasswordPage />);
    expect(screen.getByRole("heading", { name: "Reset your password" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/login");

    await userEvent.type(screen.getByLabelText("Email"), "maya.chen@fastmail.com");
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeTruthy();
    expect(Object.fromEntries(requestPasswordReset.mock.calls[0][1] as FormData)).toEqual({ email: "maya.chen@fastmail.com" });
    expect(screen.getByText("If maya.chen@fastmail.com has a DrillMap Account, we sent it an email with your next step.")).toBeTruthy();
    expect(screen.getByText("A reset link works for 30 minutes.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/login");
  });

  it("shows the email error under the field", async () => {
    requestPasswordReset.mockResolvedValue({ kind: "form", error: "Enter a valid email." });
    render(<ForgotPasswordPage />);
    await userEvent.type(screen.getByLabelText("Email"), "maya@fastmail.com");
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect((await screen.findByText("Enter a valid email.")).id).toBe(screen.getByLabelText("Email").getAttribute("aria-describedby"));
  });
});
