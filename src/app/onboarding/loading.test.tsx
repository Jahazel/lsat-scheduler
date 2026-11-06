// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import OnboardingLoading from "./loading";

afterEach(cleanup);

describe("Onboarding loading placeholder", () => {
  it("takes the Goal step's shape: the step line, every Goal field, Continue, and the preview panel", () => {
    const { container } = render(<OnboardingLoading />);
    const text = container.textContent;
    expect(text).toContain("Step 1 of 4 · Goal");
    expect(text).toContain("Set your target");
    for (const field of ["Current PT score", "Goal score", "Goal test date", "Test time", "Standard", "1.5× time", "2× time"]) {
      expect(text).toContain(field);
    }
    for (const part of ["Official LSAT attempts", "None yet", "I've taken it", "Continue", "Enter both scores to continue."]) expect(text).toContain(part);
    for (const part of ["DrillMap", "This week", "— → —"]) expect(text).toContain(part);
  });

  it("is hidden from screen readers", () => {
    const { container } = render(<OnboardingLoading />);
    expect(container.firstElementChild!.getAttribute("aria-hidden")).toBe("true");
  });
});
