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

afterEach(() => {
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
    render(<DeletionCard admin signedInRecently />);
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(REMOVED);
  });

  it("offers the confirmation form after a recent sign-in", () => {
    render(<DeletionCard admin={false} signedInRecently />);
    expect(screen.getByLabelText("Type DELETE to confirm")).toBeTruthy();
    expect(buttons()).toEqual(["Delete account"]);
  });

  it("asks for a new Google sign-in when the sign-in is too old", () => {
    render(<DeletionCard admin={false} signedInRecently={false} />);
    expect(screen.getByText("Sign in again to delete")).toBeTruthy();
    expect(screen.getByText("Deleting your account needs a Google sign-in from the last 10 minutes.")).toBeTruthy();
    expect(buttons()).toEqual(["Continue with Google"]);
    expect(screen.queryByLabelText("Type DELETE to confirm")).toBeNull();
  });

  it("shows the Admin notice instead of any form", () => {
    render(<DeletionCard admin signedInRecently />);
    expect(screen.getByText("Admin account")).toBeTruthy();
    expect(screen.getByText("This action is not available for admin accounts.")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("keeps the typed text and explains a wrong confirmation under the field", async () => {
    actions.deleteAccount.mockResolvedValue("wrong-text");
    render(<DeletionCard admin={false} signedInRecently />);
    typeAndDelete("delete");
    const field = screen.getByLabelText("Type DELETE to confirm") as HTMLInputElement;
    await waitFor(() => expect(field.getAttribute("aria-invalid")).toBe("true"));
    expect(field.value).toBe("delete");
    expect(screen.getByText("Type DELETE in capital letters to confirm.").id).toBe(field.getAttribute("aria-describedby"));
  });

  it("switches to the sign-in step when the server finds the sign-in too old", async () => {
    actions.deleteAccount.mockResolvedValue("sign-in-too-old");
    render(<DeletionCard admin={false} signedInRecently />);
    typeAndDelete("DELETE");
    await waitFor(() => expect(buttons()).toEqual(["Continue with Google"]));
  });

  it("shows the working state while deletion runs", async () => {
    actions.deleteAccount.mockReturnValue(new Promise(() => {}));
    render(<DeletionCard admin={false} signedInRecently />);
    typeAndDelete("DELETE");
    await waitFor(() => expect(buttons()).toEqual(["Deleting…"]));
    expect(screen.getByRole("button", { name: "Deleting…" }).hasAttribute("disabled")).toBe(true);
    expect((screen.getByLabelText("Type DELETE to confirm") as HTMLInputElement).readOnly).toBe(true);
    expect(screen.getByText("Deleting your account. This takes a few seconds.")).toBeTruthy();
  });
});
