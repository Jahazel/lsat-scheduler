// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, isInaccessible, render, within } from "@testing-library/react";
import StudentsLoading from "./loading";

afterEach(cleanup);

describe("Students loading placeholder", () => {
  it("takes the Students shape: the title, then a list of six students", () => {
    const { container } = render(<StudentsLoading />);
    expect(container.textContent).toBe("Students");
    expect(container.querySelectorAll("li")).toHaveLength(6);
  });

  it("is hidden from screen readers", () => {
    const { container } = render(<StudentsLoading />);
    expect(isInaccessible(within(container).getByText("Students"))).toBe(true);
  });
});
