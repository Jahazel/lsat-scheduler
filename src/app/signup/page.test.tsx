// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signIn = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ signIn }));
import SignupPage from "./page";

beforeEach(() => signIn.mockReset());
afterEach(cleanup);

describe("Signup", () => {
  it("shows the agreement, one Google button, and a way to Login", () => {
    render(<SignupPage />);
    expect(screen.getByRole("heading", { name: "Sign up for DrillMap" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "I agree to the Terms of Service and Privacy Policy" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Terms of Service" }).getAttribute("href")).toBe("/legal/terms");
    expect(screen.getByRole("link", { name: "Privacy Policy" }).getAttribute("href")).toBe("/legal/privacy");
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Continue with Google"]);
    expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/login");
    expect(screen.queryByText("Tick the box to continue.")).toBeNull();
  });

  it("starts no Google sign-in until the box is ticked", async () => {
    render(<SignupPage />);
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    const box = screen.getByRole("checkbox");
    await waitFor(() => expect(box.getAttribute("aria-invalid")).toBe("true"));
    expect(screen.getByText("Tick the box to continue.").id).toBe(box.getAttribute("aria-describedby"));
    expect(signIn).not.toHaveBeenCalled();

    await userEvent.click(box);
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/onboarding" }));
  });
});
