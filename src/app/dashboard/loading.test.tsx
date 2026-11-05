// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import ThisWeekLoading from "./loading";

afterEach(cleanup);

describe("This week loading placeholder", () => {
  it("takes This week's shape: the header, the progress summary and seven day cards", () => {
    const { container } = render(<ThisWeekLoading />);
    const text = container.textContent;
    expect(text).toContain("Your plan for this week");
    expect(text).toContain("13 remaining");
    expect(text).toContain("On pace");
    for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) expect(text).toContain(day);
  });

  it("is hidden from screen readers", () => {
    const { container } = render(<ThisWeekLoading />);
    expect(container.firstElementChild!.getAttribute("aria-hidden")).toBe("true");
  });
});
