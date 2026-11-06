// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import AllStudentsLoading from "./loading";

afterEach(cleanup);

describe("All students loading placeholder", () => {
  it("takes All students' shape: the title and a list of five students", () => {
    const { container } = render(<AllStudentsLoading />);
    expect(container.textContent).toContain("All students");
    const rows = container.querySelectorAll("li");
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row.textContent).toContain("Needs analytics");
      expect(row.textContent).toMatch(/@example\.test · .+ per week/);
    }
  });

  it("is hidden from screen readers", () => {
    const { container } = render(<AllStudentsLoading />);
    expect(container.firstElementChild!.getAttribute("aria-hidden")).toBe("true");
  });
});
