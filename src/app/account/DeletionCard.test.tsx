// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { DeletionRefusal } from "./actions";

const actions = vi.hoisted(() => ({
  deleteAccount: vi.fn<(previous: DeletionRefusal, form: FormData) => Promise<DeletionRefusal>>(),
  signInAgainToDelete: vi.fn(async () => {}),
}));
vi.mock("./actions", () => actions);
import { DeletionCard } from "./DeletionCard";

let finishStalledDeletion = () => {};
const stallDeletion = () => actions.deleteAccount.mockReturnValue(new Promise((resolve) => { finishStalledDeletion = () => resolve(null); }));

afterEach(() => {
  finishStalledDeletion();
  cleanup();
  actions.deleteAccount.mockReset();
});

const REMOVED = ["Your profile", "Approved and legacy analytics snapshots", "Weekly schedules", "Activity check-ins"];
const buttons = () => screen.getAllByRole("button").map((button) => button.textContent);

function typeAndDelete(text: string) {
  fireEvent.change(screen.getByLabelText("Type DELETE to confirm"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
}

describe("Account deletion card", () => {
  it("lists what deletion removes in every state", () => {
    render(<DeletionCard mode={{ kind: "admin" }} />);
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(REMOVED);
  });

  it("offers the confirmation form after a recent sign-in", () => {
    render(<DeletionCard mode={{ kind: "google", signedInRecently: true }} />);
    expect(screen.getByLabelText("Type DELETE to confirm")).toBeTruthy();
    expect(buttons()).toEqual(["Delete account"]);
  });

  it("asks for a new Google sign-in when the sign-in is too old", () => {
    render(<DeletionCard mode={{ kind: "google", signedInRecently: false }} />);
    expect(screen.getByText("Sign in again to delete")).toBeTruthy();
    expect(screen.getByText("Deleting your account needs a Google sign-in from the last 10 minutes.")).toBeTruthy();
    expect(buttons()).toEqual(["Continue with Google"]);
    expect(screen.queryByLabelText("Type DELETE to confirm")).toBeNull();
  });

  it("shows the Admin notice instead of any form", () => {
    render(<DeletionCard mode={{ kind: "admin" }} />);
    expect(screen.getByText("Admin account")).toBeTruthy();
    expect(screen.getByText("This action is not available for admin accounts.")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("keeps the typed text and explains a wrong confirmation under the field", async () => {
    actions.deleteAccount.mockResolvedValue("wrong-text");
    render(<DeletionCard mode={{ kind: "google", signedInRecently: true }} />);
    typeAndDelete("delete");
    const field = screen.getByLabelText("Type DELETE to confirm") as HTMLInputElement;
    await waitFor(() => expect(field.getAttribute("aria-invalid")).toBe("true"));
    expect(field.value).toBe("delete");
    expect(screen.getByText("Type DELETE in capital letters to confirm.").id).toBe(field.getAttribute("aria-describedby"));
  });

  it("switches to the sign-in step when the server finds the sign-in too old", async () => {
    actions.deleteAccount.mockResolvedValue("sign-in-too-old");
    render(<DeletionCard mode={{ kind: "google", signedInRecently: true }} />);
    typeAndDelete("DELETE");
    await waitFor(() => expect(buttons()).toEqual(["Continue with Google"]));
  });

  it("shows the working state while deletion runs", async () => {
    stallDeletion();
    render(<DeletionCard mode={{ kind: "google", signedInRecently: true }} />);
    typeAndDelete("DELETE");
    await waitFor(() => expect(buttons()).toEqual(["Deleting…"]));
    expect(screen.getByRole("button", { name: "Deleting…" }).hasAttribute("disabled")).toBe(true);
    expect((screen.getByLabelText("Type DELETE to confirm") as HTMLInputElement).readOnly).toBe(true);
    expect(screen.getByText("Deleting your account. This takes a few seconds.")).toBeTruthy();
  });

  describe("for a password Account", () => {
    const currentPassword = () => screen.getByLabelText("Current password") as HTMLInputElement;
    function fillAndDelete(password: string, text: string) {
      fireEvent.change(currentPassword(), { target: { value: password } });
      typeAndDelete(text);
    }

    it("asks for the current password instead of a Google sign-in", () => {
      render(<DeletionCard mode={{ kind: "password" }} />);
      expect(currentPassword().type).toBe("password");
      expect(screen.getByLabelText("Type DELETE to confirm")).toBeTruthy();
      expect(buttons()).toEqual(["Delete account"]);
      expect(screen.queryByText("Sign in again to delete")).toBeNull();
    });

    it("sends the password and the text, then clears a wrong password and keeps the text", async () => {
      actions.deleteAccount.mockResolvedValue("wrong-password");
      render(<DeletionCard mode={{ kind: "password" }} />);
      fillAndDelete("not my password", "DELETE");
      await waitFor(() => expect(currentPassword().getAttribute("aria-invalid")).toBe("true"));
      expect(Object.fromEntries(actions.deleteAccount.mock.calls[0][1])).toEqual({ currentPassword: "not my password", confirmation: "DELETE" });
      expect(currentPassword().value).toBe("");
      expect(screen.getByText("That's not your current password. Try again.").id).toBe(currentPassword().getAttribute("aria-describedby"));
      expect((screen.getByLabelText("Type DELETE to confirm") as HTMLInputElement).value).toBe("DELETE");
    });

    it("keeps the password after a wrong confirmation text", async () => {
      actions.deleteAccount.mockResolvedValue("wrong-text");
      render(<DeletionCard mode={{ kind: "password" }} />);
      fillAndDelete("correct horse battery staple", "delete");
      await waitFor(() => expect(screen.getByText("Type DELETE in capital letters to confirm.")).toBeTruthy());
      expect(currentPassword().value).toBe("correct horse battery staple");
      expect(currentPassword().getAttribute("aria-invalid")).toBeNull();
    });

    it("says to wait after too many wrong passwords", async () => {
      actions.deleteAccount.mockResolvedValue("paused");
      render(<DeletionCard mode={{ kind: "password" }} />);
      fillAndDelete("guess", "DELETE");
      expect(await screen.findByText("Too many tries. Try again later.")).toBeTruthy();
    });

    it("locks both fields while deletion runs", async () => {
      stallDeletion();
      render(<DeletionCard mode={{ kind: "password" }} />);
      fillAndDelete("correct horse battery staple", "DELETE");
      await waitFor(() => expect(buttons()).toEqual(["Deleting…"]));
      expect(currentPassword().readOnly).toBe(true);
      expect((screen.getByLabelText("Type DELETE to confirm") as HTMLInputElement).readOnly).toBe(true);
    });
  });
});
