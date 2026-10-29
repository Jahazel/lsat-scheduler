// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FailureCode } from "@/lib/unexpectedFailure";
import { SignOutForm } from "./SignOutForm";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("loads the signed-out address as a new page", async () => {
  const assign = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign });
  render(
    <SignOutForm action={async () => ({ goTo: "/?signedOut=1" as const })}>
      <button type="submit">Log out</button>
    </SignOutForm>,
  );

  await userEvent.click(screen.getByRole("button", { name: "Log out" }));
  await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("/?signedOut=1"));
  expect(screen.queryByRole("alert")).toBeNull();
});

it("shows the error code when a sign-out fails, and loads no page", async () => {
  const assign = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign });
  render(
    <SignOutForm action={async () => ({ unexpectedFailure: "3f9a01c2" as FailureCode })}>
      <button type="submit">Log out</button>
    </SignOutForm>,
  );

  await userEvent.click(screen.getByRole("button", { name: "Log out" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong. Try again. Error code: 3f9a01c2");
  expect(assign).not.toHaveBeenCalled();
});
