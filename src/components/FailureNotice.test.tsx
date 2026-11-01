// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import type { FailureCode, FormState } from "@/lib/unexpectedFailure";

const navigation = vi.hoisted(() => ({ pathname: "/account" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

import { ActionForm, FailureToastProvider } from "./FailureNotice";

afterEach(() => {
  cleanup();
  navigation.pathname = "/account";
});

const failure = (code: string): FormState => ({ unexpectedFailure: code as FailureCode });

function Screen({ logOut, save = [] }: { logOut: FormState[]; save?: FormState[] }) {
  return (
    <FailureToastProvider>
      <ActionForm action={async () => logOut.shift() ?? null}>
        <button type="submit">Log out</button>
      </ActionForm>
      <ActionForm action={async () => save.shift() ?? null}>
        <button type="submit">Save</button>
      </ActionForm>
    </FailureToastProvider>
  );
}

const press = (name: string) => userEvent.click(screen.getByRole("button", { name }));
const toast = () => screen.findByRole("alert");

it("shows the message and the error code when an action fails, and nothing before", async () => {
  render(<Screen logOut={[failure("3f9a01c2")]} />);
  expect(screen.queryByRole("alert")).toBeNull();

  await press("Log out");
  const alert = await toast();
  expect(alert.textContent).toContain("Something went wrong. Try again.");
  expect(alert.textContent).toContain("Error code 3f9a01c2");
});

it("closes when the student presses Close", async () => {
  render(<Screen logOut={[failure("3f9a01c2")]} />);
  await press("Log out");
  await toast();

  await press("Close");
  expect(screen.queryByRole("alert")).toBeNull();
});

it("replaces the toast with a fresh alert when a second failure has a new code", async () => {
  render(<Screen logOut={[failure("3f9a01c2"), failure("0d2d95eb")]} />);
  await press("Log out");
  const first = await toast();

  await press("Log out");
  await vi.waitFor(() => expect(screen.getByRole("alert").textContent).toContain("0d2d95eb"));
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  expect(screen.getByRole("alert")).not.toBe(first);
});

it("keeps the same alert when the same code arrives again", async () => {
  render(<Screen logOut={[failure("3f9a01c2"), failure("3f9a01c2")]} save={[failure("3f9a01c2")]} />);
  await press("Log out");
  const first = await toast();

  await press("Log out");
  await press("Save");
  expect(screen.getAllByRole("alert")).toEqual([first]);
  expect(first.dataset.replaced).toBeUndefined();
});

it("closes when the same action is tried again and works", async () => {
  render(<Screen logOut={[failure("3f9a01c2"), null]} />);
  await press("Log out");
  await toast();

  await press("Log out");
  await vi.waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
});

it("stays when a different action works", async () => {
  render(<Screen logOut={[failure("3f9a01c2")]} save={[null]} />);
  await press("Log out");
  const alert = await toast();

  await press("Save");
  expect(screen.getByRole("alert")).toBe(alert);
});

it("closes when the student leaves the screen", async () => {
  const { rerender } = render(<Screen logOut={[failure("3f9a01c2")]} />);
  await press("Log out");
  await toast();

  navigation.pathname = "/progress";
  rerender(<Screen logOut={[]} />);
  expect(screen.queryByRole("alert")).toBeNull();
});

function Menu() {
  const [open, setOpen] = useState(true);
  return (
    <FailureToastProvider>
      <button type="button" onClick={() => setOpen(false)}>Close menu</button>
      {open && (
        <ActionForm action={async () => failure("3f9a01c2")}>
          <button type="submit">Log out</button>
        </ActionForm>
      )}
    </FailureToastProvider>
  );
}

it("stays when the form that failed is removed, such as a menu closing", async () => {
  render(<Menu />);
  await press("Log out");
  const alert = await toast();

  await press("Close menu");
  expect(screen.getByRole("alert")).toBe(alert);
});

it("shows inside an open dialog, which makes the rest of the page inert", async () => {
  render(
    <FailureToastProvider>
      <dialog aria-label="Test controls">
        <ActionForm action={async () => failure("3f9a01c2")}>
          <button type="submit">Next Monday</button>
        </ActionForm>
      </dialog>
    </FailureToastProvider>,
  );
  const dialog = screen.getByRole("dialog", { hidden: true });
  act(() => dialog.setAttribute("open", ""));
  await press("Next Monday");

  expect(dialog.contains(await toast())).toBe(true);

  act(() => dialog.removeAttribute("open"));
  await vi.waitFor(() => expect(dialog.contains(screen.getByRole("alert"))).toBe(false));
});
