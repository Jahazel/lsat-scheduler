// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import AdminStudentLoading from "./loading";

afterEach(cleanup);

describe("Admin student loading placeholder", () => {
  it("takes the student page's shape: the admin strip above the read-only This week", () => {
    const { container } = render(<AdminStudentLoading />);
    const text = container.textContent;
    for (const line of ["← All students", "Viewing as admin — read only", "@example.test", "Your plan for this week", "13 remaining"]) {
      expect(text).toContain(line);
    }
    for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) expect(text).toContain(day);
    expect(text.indexOf("Viewing as admin")).toBeLessThan(text.indexOf("Your plan for this week"));
    expect(text).not.toContain("Check off as you go");
  });

  it("is hidden from screen readers", () => {
    const { container } = render(<AdminStudentLoading />);
    expect(container.firstElementChild!.getAttribute("aria-hidden")).toBe("true");
  });
});
