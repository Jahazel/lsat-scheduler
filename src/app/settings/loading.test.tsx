// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, isInaccessible, render, screen } from "@testing-library/react";
import StudySettingsLoading from "./loading";

afterEach(cleanup);

describe("Study settings loading placeholder", () => {
  it("takes Study settings' shape: the header, every Goal field, and the Week card with its preview", () => {
    const { container } = render(<StudySettingsLoading />);
    const text = container.textContent;
    expect(text).toContain("Your goal and your week.");
    for (const field of ["Current PT score", "Goal score", "Goal test month", "Test time", "Official LSAT attempts", "Add attempt"]) {
      expect(text).toContain(field);
    }
    for (const day of ["All days", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Weekly total"]) expect(text).toContain(day);
    expect(text).toContain("Preview · next weekly schedule");
  });

  it("is hidden from screen readers", () => {
    render(<StudySettingsLoading />);
    expect(isInaccessible(screen.getByText("Study settings"))).toBe(true);
  });
});
