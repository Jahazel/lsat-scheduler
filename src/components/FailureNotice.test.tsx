// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useFormStatus } from "react-dom";
import type { FailureCode } from "@/lib/unexpectedFailure";
import { ActionForm, SignOutForm } from "./FailureNotice";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows the error code when a redirecting action fails, and nothing before", async () => {
  render(
    <ActionForm action={async () => ({ unexpectedFailure: "3f9a01c2" as FailureCode })}>
      <button type="submit">Log out</button>
    </ActionForm>,
  );
  expect(screen.queryByRole("alert")).toBeNull();

  await userEvent.click(screen.getByRole("button", { name: "Log out" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong. Try again. Error code: 3f9a01c2");
});

it("shows the error code when a sign-out fails, and loads no page", async () => {
  const assign = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign });
  render(
    <SignOutForm action={async () => ({ unexpectedFailure: "3f9a01c2" as FailureCode })}>
      <PendingButton />
    </SignOutForm>,
  );

  await userEvent.click(screen.getByRole("button", { name: "Log out" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong. Try again. Error code: 3f9a01c2");
  expect(assign).not.toHaveBeenCalled();
});

function PendingButton() {
  const { pending } = useFormStatus();
  return <button type="submit">{pending ? "Signing out…" : "Log out"}</button>;
}
