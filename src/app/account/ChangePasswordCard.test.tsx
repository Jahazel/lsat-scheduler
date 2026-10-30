// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { SignedOut } from "@/lib/requestPolicy";
import type { PasswordChangeRefusal } from "./actions";

const actions = vi.hoisted(() => ({
  changePassword: vi.fn<(previous: PasswordChangeRefusal, form: FormData) => Promise<PasswordChangeRefusal | SignedOut>>(),
}));
vi.mock("./actions", () => actions);
import { ChangePasswordCard } from "./ChangePasswordCard";

afterEach(() => {
  cleanup();
  actions.changePassword.mockReset();
  vi.unstubAllGlobals();
});

const currentPassword = () => screen.getByLabelText("Current password") as HTMLInputElement;
const newPassword = () => screen.getByLabelText("New password") as HTMLInputElement;

function fillAndChange(current: string, next: string) {
  fireEvent.change(currentPassword(), { target: { value: current } });
  fireEvent.change(newPassword(), { target: { value: next } });
  fireEvent.click(screen.getByRole("button", { name: "Change password" }));
}

describe("Change password card", () => {
  it("loads the signed-out login address as a new page after the change", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    actions.changePassword.mockResolvedValue({ goTo: "/login?notice=PasswordChanged&signedOut=1" });
    render(<ChangePasswordCard />);
    fillAndChange("correct horse battery staple", "purple walrus dances at noon");
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/login?notice=PasswordChanged&signedOut=1"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("asks for the current and the new password and says it signs out every device", () => {
    render(<ChangePasswordCard />);
    expect(screen.getByRole("heading", { name: "Change password" })).toBeTruthy();
    expect(screen.getByText("Type your current password, then a new one. This signs you out on all your devices, including this one.")).toBeTruthy();
    expect([currentPassword().type, newPassword().type]).toEqual(["password", "password"]);
    expect(currentPassword().autocomplete).toBe("current-password");
    expect(newPassword().autocomplete).toBe("new-password");
    expect(screen.getByText("At least 8 characters. A long phrase works well.")).toBeTruthy();
  });

  it("sends both passwords, then clears a wrong current password and keeps the new one", async () => {
    actions.changePassword.mockResolvedValue({ field: "currentPassword", message: "That's not your current password. Try again." });
    render(<ChangePasswordCard />);
    fillAndChange("not my password", "purple walrus dances");
    await waitFor(() => expect(currentPassword().getAttribute("aria-invalid")).toBe("true"));
    expect(Object.fromEntries(actions.changePassword.mock.calls[0][1])).toEqual({
      currentPassword: "not my password", newPassword: "purple walrus dances",
    });
    expect(currentPassword().value).toBe("");
    expect(newPassword().value).toBe("purple walrus dances");
    expect(screen.getByText("That's not your current password. Try again.").id).toBe(currentPassword().getAttribute("aria-describedby"));
  });

  it("shows a refused new password in place of the hint and keeps both fields", async () => {
    actions.changePassword.mockResolvedValue({ field: "newPassword", message: "That password is too short. Use at least 8 characters." });
    render(<ChangePasswordCard />);
    fillAndChange("correct horse battery staple", "short");
    await waitFor(() => expect(newPassword().getAttribute("aria-invalid")).toBe("true"));
    expect(screen.queryByText("At least 8 characters. A long phrase works well.")).toBeNull();
    expect(screen.getByText("That password is too short. Use at least 8 characters.")).toBeTruthy();
    expect([currentPassword().value, newPassword().value]).toEqual(["correct horse battery staple", "short"]);
    expect(currentPassword().getAttribute("aria-invalid")).toBeNull();
  });

  it("locks the form while the change runs", async () => {
    actions.changePassword.mockReturnValue(new Promise(() => {}));
    render(<ChangePasswordCard />);
    fillAndChange("correct horse battery staple", "purple walrus dances");
    const working = await screen.findByRole("button", { name: "Changing password…" });
    expect(working.hasAttribute("disabled")).toBe(true);
    expect([currentPassword().readOnly, newPassword().readOnly]).toEqual([true, true]);
  });
});
