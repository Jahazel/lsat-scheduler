// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorPage from "./error";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("shows neutral text a student can read, with no mention of students, and tries again", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const reset = vi.fn();
  render(<ErrorPage error={new Error("boom")} reset={reset} />);

  expect(screen.getByText("Something went wrong. Try again.")).toBeTruthy();
  expect(document.body.textContent).not.toMatch(/student/i);
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(reset).toHaveBeenCalledOnce();
});
