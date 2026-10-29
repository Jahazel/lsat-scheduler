// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { requestPolicy } from "@/lib/requestPolicy";

const verifyEmail = vi.hoisted(() => vi.fn());
vi.mock("./actions", () => ({ verifyEmail }));
import VerifyEmailPage, { metadata } from "./page";

afterEach(() => {
  cleanup();
  verifyEmail.mockReset();
});

async function renderPage(token?: string) {
  render(await VerifyEmailPage({ searchParams: Promise.resolve(token === undefined ? {} : { token }) } as PageProps<"/verify-email">));
}

describe("Verify my email", () => {
  it("sends the link's token only when the button is pressed, and blocks a second press while it runs", async () => {
    let finish: (value: { linkDoesNotWork: boolean }) => void = () => {};
    verifyEmail.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    await renderPage("link-token");
    expect(screen.getByRole("heading", { name: "Verify your email" })).toBeTruthy();
    expect(verifyEmail).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Verify my email" }));
    const working = await screen.findByRole("button", { name: "Verifying…" });
    expect((working as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(working);
    expect(verifyEmail).toHaveBeenCalledTimes(1);
    expect(Object.fromEntries(verifyEmail.mock.calls[0][1] as FormData)).toEqual({ token: "link-token" });

    finish({ linkDoesNotWork: true });
    expect(await screen.findByRole("heading", { name: "This link doesn't work" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign up again" }).getAttribute("href")).toBe("/signup");
    expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/login");
  });

  it("shows the link-doesn't-work message for a link with no token", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByRole("heading", { name: "This link doesn't work" })).toBeTruthy());
  });

  it("sends no Referer header from the page", async () => {
    expect(metadata.referrer).toBe("no-referrer");
    const { responseHeaders } = requestPolicy({
      method: "GET", pathname: "/verify-email", search: "", origin: null, contentType: null, siteUrl: undefined, enforceCsp: false, development: false,
    });
    expect(responseHeaders["Referrer-Policy"]).toBe("no-referrer");
  });
});
