// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { isUnexpectedFailure, type Answer } from "@/lib/unexpectedFailure";
import { useRefusableForm } from "./useRefusableForm";

type Refusal = { field: "email" | "password"; message: string } | null;

const send = vi.fn<(previous: Answer<Refusal>, formData: FormData) => Promise<Answer<Refusal>>>();

afterEach(() => {
  cleanup();
  send.mockReset();
});

function LoginLikeForm({ clearsPassword = false }: { clearsPassword?: boolean }) {
  const { answer, pending, form } = useRefusableForm(send, null, clearsPassword ? () => "password" : undefined);
  return (
    <form {...form}>
      <label>Email<input name="email" /></label>
      <label>Password<input name="password" type="password" /></label>
      <button type="submit">{pending ? "Sending…" : "Send"}</button>
      {answer && !isUnexpectedFailure(answer) && <p>{answer.message}</p>}
    </form>
  );
}

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

async function typeAndSend() {
  await userEvent.type(field("Email"), "maya.chen@fastmail.com");
  await userEvent.type(field("Password"), "a long phrase that works");
  await userEvent.click(screen.getByRole("button", { name: "Send" }));
}

describe("A form that keeps what the student typed", () => {
  it("sends the typed fields and keeps every one after a planned refusal", async () => {
    send.mockResolvedValue({ field: "email", message: "Enter a valid email." });
    render(<LoginLikeForm />);
    await typeAndSend();

    expect(await screen.findByText("Enter a valid email.")).toBeTruthy();
    expect(Object.fromEntries(send.mock.calls[0][1])).toEqual({ email: "maya.chen@fastmail.com", password: "a long phrase that works" });
    expect([field("Email").value, field("Password").value]).toEqual(["maya.chen@fastmail.com", "a long phrase that works"]);
  });

  it("empties only the field the refusal names", async () => {
    send.mockResolvedValue({ field: "password", message: "Wrong password." });
    render(<LoginLikeForm clearsPassword />);
    await typeAndSend();

    expect(await screen.findByText("Wrong password.")).toBeTruthy();
    expect([field("Email").value, field("Password").value]).toEqual(["maya.chen@fastmail.com", ""]);
  });

  it("keeps every field, the password too, when the send never reaches the server", async () => {
    send.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<LoginLikeForm clearsPassword />);
    await typeAndSend();

    await waitFor(() => expect(screen.getByRole("button", { name: "Send" })).toBeTruthy());
    expect([field("Email").value, field("Password").value]).toEqual(["maya.chen@fastmail.com", "a long phrase that works"]);
  });

  it("reports pending until the answer comes", async () => {
    let finish: (answer: Refusal) => void = () => {};
    send.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    render(<LoginLikeForm />);
    await typeAndSend();

    expect(await screen.findByRole("button", { name: "Sending…" })).toBeTruthy();
    finish(null);
    expect(await screen.findByRole("button", { name: "Send" })).toBeTruthy();
  });

  it("renders a form that a submit before the page loads cannot send as a plain GET", () => {
    expect(renderToString(<LoginLikeForm />)).toMatch(/<form[^>]* action="javascript:/);
  });
});
