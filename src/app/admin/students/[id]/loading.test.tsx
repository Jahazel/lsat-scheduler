// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, isInaccessible, render, screen } from "@testing-library/react";
import AdminStudentLoading from "./loading";

afterEach(cleanup);

describe("Admin student loading placeholder", () => {
  it("takes the student page's shape: ← All students, then the facts card's labels", () => {
    const { container } = render(<AdminStudentLoading />);
    expect(container.textContent).toBe("← All studentsScoreTestStudy timeJoinedPast weeks");
  });

  it("is hidden from screen readers", () => {
    render(<AdminStudentLoading />);
    expect(isInaccessible(screen.getByText("← All students"))).toBe(true);
  });
});
