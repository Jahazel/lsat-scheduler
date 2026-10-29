// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FailureCode } from "@/lib/unexpectedFailure";
import { ActionForm } from "./FailureNotice";

afterEach(cleanup);

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
