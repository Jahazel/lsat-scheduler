// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useFormStatus } from "react-dom";
import { SignOutForm } from "./FailureNotice";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("loads the signed-out address as a new page, and keeps the button pending until it does", async () => {
  const assign = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign });
  render(
    <SignOutForm action={async () => ({ goTo: "/?signedOut=1" })}>
      <PendingButton />
    </SignOutForm>,
  );

  await userEvent.click(screen.getByRole("button", { name: "Log out" }));
  await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("/?signedOut=1"));
  expect(screen.getByRole("button", { name: "Signing out…" })).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
});

function PendingButton() {
  const { pending } = useFormStatus();
  return <button type="submit">{pending ? "Signing out…" : "Log out"}</button>;
}
