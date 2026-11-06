// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import WeeklyUploadLoading from "./loading";

afterEach(cleanup);

describe("Weekly upload loading placeholder", () => {
  it("takes Weekly upload's shape: the form column and the Where to find it column", () => {
    const { container } = render(<WeeklyUploadLoading />);
    const text = container.textContent;
    for (const line of [
      "Plan this week",
      "Current score",
      "7Sage analytics",
      "Screenshots",
      "Type them",
      "Logical Reasoning screenshot",
      "Reading Comprehension screenshot",
      "Practice test review",
      "Read my screenshots",
      "Where to find it",
    ]) expect(text).toContain(line);
    expect(text).not.toContain("Your plan for this week");
  });

  it("is hidden from screen readers", () => {
    const { container } = render(<WeeklyUploadLoading />);
    expect(container.firstElementChild!.getAttribute("aria-hidden")).toBe("true");
  });
});
