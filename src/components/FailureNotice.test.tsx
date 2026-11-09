// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import type { FailureCode, FormState } from "@/lib/unexpectedFailure";

const navigation = vi.hoisted(() => ({ pathname: "/account" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

import { ActionForm, catchLostConnection, FailureToastProvider } from "./FailureNotice";

afterEach(() => {
  cleanup();
  navigation.pathname = "/account";
});

const failure = (code: string): FormState => ({ unexpectedFailure: code as FailureCode });

function Screen({ logOut, save = [] }: { logOut: (FormState | Error)[]; save?: (FormState | Error)[] }) {
  return (
    <FailureToastProvider>
      <ActionForm action={async () => {
        const answer = logOut.shift() ?? null;
        if (answer instanceof Error) throw answer;
        return answer;
      }}>
        <button type="submit">Log out</button>
      </ActionForm>
      <ActionForm action={async () => {
        const answer = save.shift() ?? null;
        if (answer instanceof Error) throw answer;
        return answer;
      }}>
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

it("keeps the closed toast on screen until its exit ends", async () => {
  let endExit!: () => void;
  const exit = new Promise<void>((resolve) => (endExit = resolve));
  Element.prototype.getAnimations = function (this: Element) {
    return this.hasAttribute("data-leaving") ? [{ finished: exit } as unknown as Animation] : [];
  };
  try {
    render(<Screen logOut={[failure("3f9a01c2")]} />);
    await press("Log out");
    await toast();

    await press("Close");
    expect(document.querySelector(".failure-toast[data-leaving]")).not.toBeNull();
    await act(async () => endExit());
    expect(document.querySelector(".failure-toast")).toBeNull();
  } finally {
    delete (Element.prototype as Partial<Element>).getAnimations;
  }
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

it("shows the connection message with no error code when the request never reaches the server, and closes once it works", async () => {
  render(<Screen logOut={[new TypeError("Failed to fetch"), null]} />);
  await press("Log out");
  expect((await toast()).textContent).toBe("No connection. Check your signal and try again.");
  expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();

  await press("Log out");
  await vi.waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
});

it("shows a server failure's error code after a lost connection", async () => {
  render(<Screen logOut={[new TypeError("Failed to fetch"), failure("3f9a01c2")]} />);
  await press("Log out");
  await toast();

  await press("Log out");
  await vi.waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Error code 3f9a01c2"));
});

it("shows the connection message again after the student closed it", async () => {
  render(<Screen logOut={[new TypeError("Failed to fetch"), new TypeError("Failed to fetch")]} />);
  await press("Log out");
  await toast();
  await userEvent.click(screen.getByRole("button", { name: "Close" }));
  await vi.waitFor(() => expect(screen.queryByRole("alert")).toBeNull());

  await press("Log out");
  expect((await toast()).textContent).toBe("No connection. Check your signal and try again.");
});

it("closes the connection message when the last action that lost the connection works", async () => {
  render(<Screen logOut={[new TypeError("Failed to fetch")]} save={[new TypeError("Failed to fetch"), null]} />);
  await press("Log out");
  const alert = await toast();
  await press("Save");
  expect(screen.getByRole("alert")).toBe(alert);

  await press("Save");
  await vi.waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
});

it("lets a rejection that is not a lost connection reject", async () => {
  const failing = catchLostConnection(async () => {
    throw new Error("Server Action was not found");
  });
  await expect(failing()).rejects.toThrow("Server Action was not found");
  await expect(catchLostConnection(() => Promise.reject(new TypeError("Failed to fetch")))()).resolves.toEqual({ unexpectedFailure: "no-connection" });
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

function Steps() {
  const [step, setStep] = useState<"check" | "upload">("check");
  return (
    <FailureToastProvider>
      {step === "check" ? (
        <>
          <button type="button" onClick={() => setStep("upload")}>Back</button>
          <ActionForm action={async () => failure("3f9a01c2")}>
            <button type="submit">Confirm</button>
          </ActionForm>
        </>
      ) : <p>Upload</p>}
    </FailureToastProvider>
  );
}

it("closes when the step that showed it goes away without a route change", async () => {
  render(<Steps />);
  await press("Confirm");
  await toast();

  await press("Back");
  expect(screen.getByText("Upload")).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
});

it("moves the same toast into an open dialog and back, without showing or announcing it again", async () => {
  render(
    <FailureToastProvider>
      <ActionForm action={async () => failure("3f9a01c2")}>
        <button type="submit">Next Monday</button>
      </ActionForm>
      <dialog aria-label="Test controls" />
    </FailureToastProvider>,
  );
  await press("Next Monday");
  const alert = await toast();
  const dialog = screen.getByRole("dialog", { hidden: true });

  act(() => dialog.setAttribute("open", ""));
  await vi.waitFor(() => expect(dialog.contains(alert)).toBe(true));
  expect(alert.isConnected).toBe(true);
  expect(alert.getAttribute("role")).toBeNull();
  expect(alert.dataset.entered).toBe("true");
  expect(alert.textContent).toContain("Error code 3f9a01c2");

  act(() => dialog.removeAttribute("open"));
  await vi.waitFor(() => expect(dialog.contains(alert)).toBe(false));
  expect(alert.isConnected).toBe(true);
  expect(alert.getAttribute("role")).toBeNull();
});

it("keeps the toast on the page when its open dialog leaves the page", async () => {
  const page = (withDialog: boolean) => (
    <FailureToastProvider>
      <ActionForm action={async () => failure("3f9a01c2")}>
        <button type="submit">Next Monday</button>
      </ActionForm>
      {withDialog && <dialog aria-label="Test controls" />}
    </FailureToastProvider>
  );
  const { rerender } = render(page(true));
  await press("Next Monday");
  const alert = await toast();
  const dialog = screen.getByRole("dialog", { hidden: true });
  act(() => dialog.setAttribute("open", ""));
  await vi.waitFor(() => expect(dialog.contains(alert)).toBe(true));

  rerender(page(false));

  await vi.waitFor(() => expect(alert.isConnected).toBe(true));
  expect(alert.closest("dialog")).toBeNull();
  expect(alert.textContent).toContain("Error code 3f9a01c2");
});

it("shows a failure from inside an open dialog in that dialog, which makes the rest of the page inert", async () => {
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
});
