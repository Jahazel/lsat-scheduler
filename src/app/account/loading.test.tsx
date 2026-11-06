// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import AccountLoading from "./loading";

afterEach(cleanup);

describe("Account loading placeholder", () => {
  it("takes Account's shape: the email line, the Sessions card and the Delete account card", () => {
    const { container } = render(<AccountLoading />);
    const text = container.textContent;
    expect(text).toContain("amy@example.test");
    expect(text).toContain("Google sign-in");
    expect(text).toContain("Sign out of all devices");
    expect(text).toContain("This permanently removes from active storage:");
    expect(text).toContain("Type DELETE to confirm");
  });

  it("is hidden from screen readers and offers nothing to press", () => {
    const { container } = render(<AccountLoading />);
    expect(container.firstElementChild!.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("button, a, input")).toBeNull();
  });
});
