// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import nextConfig from "../../../next.config";

const { resetPassword, findResetLinkEmail } = vi.hoisted(() => ({ resetPassword: vi.fn(), findResetLinkEmail: vi.fn() }));
vi.mock("./actions", () => ({ resetPassword }));
vi.mock("@/lib/passwordResetRepository", () => ({ findResetLinkEmail }));
import ResetPasswordPage, { metadata } from "./page";

afterEach(() => {
  cleanup();
  resetPassword.mockReset();
  findResetLinkEmail.mockReset();
});

async function renderPage(token?: string) {
  render(await ResetPasswordPage({ params: Promise.resolve({}), searchParams: Promise.resolve(token === undefined ? {} : { token }) }));
}

describe("Set a new password", () => {
  it("sends the link's token with the new password, keeps the typed password after a refusal, and blocks a second press", async () => {
    findResetLinkEmail.mockResolvedValue("maya.chen@fastmail.com");
    let finish: (value: unknown) => void = () => {};
    resetPassword.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    await renderPage("link-token");
    expect(screen.getByRole("heading", { name: "Set a new password" })).toBeTruthy();
    expect(screen.getByText("At least 8 characters. A long phrase works well.")).toBeTruthy();

    await userEvent.type(screen.getByLabelText("New password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Save new password" }));
    const working = await screen.findByRole("button", { name: "Saving…" });
    expect((working as HTMLButtonElement).disabled).toBe(true);
    expect(Object.fromEntries(resetPassword.mock.calls[0][1] as FormData)).toEqual({ token: "link-token", password: "password123" });

    finish({ kind: "form", error: "This password is too common. Choose a password that's harder to guess." });
    expect(await screen.findByText("This password is too common. Choose a password that's harder to guess.")).toBeTruthy();
    expect((screen.getByLabelText("New password") as HTMLInputElement).value).toBe("password123");
  });

  it("shows the link-doesn't-work message when a save finds the link used or replaced", async () => {
    findResetLinkEmail.mockResolvedValue("maya.chen@fastmail.com");
    resetPassword.mockResolvedValue({ kind: "linkDoesNotWork" });
    await renderPage("link-token");
    await userEvent.type(screen.getByLabelText("New password"), "purple walrus dances");
    await userEvent.click(screen.getByRole("button", { name: "Save new password" }));
    expect(await screen.findByRole("heading", { name: "This link doesn't work" })).toBeTruthy();
  });

  it.each([["an unknown or expired token", "old-token"], ["no token", undefined]])("for %s, offers a new link and Log in", async (_case, token) => {
    findResetLinkEmail.mockResolvedValue(null);
    await renderPage(token);
    expect(screen.getByRole("heading", { name: "This link doesn't work" })).toBeTruthy();
    expect(screen.getByText(/replaced by a newer link\. A reset link works once, for 30 minutes\./)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Get a new link" }).getAttribute("href")).toBe("/forgot-password");
    expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/login");
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("sends no Referer header from the page", async () => {
    expect(metadata.referrer).toBe("no-referrer");
    expect(await nextConfig.headers?.()).toContainEqual({
      source: "/reset-password", headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
    });
  });
});
