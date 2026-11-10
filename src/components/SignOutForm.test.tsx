// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FailureCode } from "@/lib/unexpectedFailure";
import { FailureToastProvider } from "./FailureNotice";
import { SignOutButton, SignOutForm } from "./SignOutForm";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("loads the signed-out address as a new page, and Log out keeps waiting until this page goes", async () => {
  const assign = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign });
  render(
    <SignOutForm action={async () => ({ goTo: "/?signedOut=1" as const })}>
      <SignOutButton>Log out</SignOutButton>
    </SignOutForm>,
    { wrapper: FailureToastProvider },
  );
  const logOut = screen.getByRole("button", { name: "Log out" });

  await userEvent.click(logOut);
  await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("/?signedOut=1"));
  await new Promise((resolve) => setTimeout(resolve));
  expect(logOut.getAttribute("aria-disabled")).toBe("true");
  expect(screen.queryByRole("alert")).toBeNull();

  dispatchEvent(new Event("pagehide"));
  await vi.waitFor(() => expect(logOut.hasAttribute("aria-disabled")).toBe(false));
});

it("shows the error code when a sign-out fails, and loads no page", async () => {
  const assign = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign });
  render(
    <SignOutForm action={async () => ({ unexpectedFailure: "3f9a01c2" as FailureCode })}>
      <button type="submit">Log out</button>
    </SignOutForm>,
    { wrapper: FailureToastProvider },
  );

  await userEvent.click(screen.getByRole("button", { name: "Log out" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong. Try again.Error code 3f9a01c2");
  expect(assign).not.toHaveBeenCalled();
});

it("shows the connection message when the sign-out never reaches the server, and keeps the page", async () => {
  const assign = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign });
  render(
    <SignOutForm action={() => Promise.reject(new TypeError("Failed to fetch"))}>
      <button type="submit">Log out</button>
    </SignOutForm>,
    { wrapper: FailureToastProvider },
  );

  await userEvent.click(screen.getByRole("button", { name: "Log out" }));
  expect((await screen.findByRole("alert")).textContent).toBe("No connection. Check your signal and try again.");
  expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
  expect(assign).not.toHaveBeenCalled();
});
