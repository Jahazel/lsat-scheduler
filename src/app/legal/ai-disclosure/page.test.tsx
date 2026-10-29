// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import AIDisclosurePage from "./page";

afterEach(cleanup);

describe("AI disclosure page", () => {
  it("shows the approved AI disclosure text", () => {
    const { container } = render(<AIDisclosurePage />);
    expect(screen.getByRole("heading", { level: 1, name: "How DrillMap uses AI" })).toBeDefined();
    expect([...container.querySelectorAll("p")].map((p) => p.textContent)).toEqual([
      "DrillMap uses AI for one task only: reading the numbers in your 7Sage analytics screenshot. Anthropic's Claude model does this. You see the numbers before anything is saved, and you can correct them. If AI cannot read the screenshot, or if the monthly reading limit is reached, you can type the numbers in by hand.",
      "AI does not make your weekly schedule. Fixed rules make it from your approved numbers and study settings.",
      "Anthropic keeps each screenshot for up to 30 days and then deletes it. DrillMap does not store screenshots. See the Privacy Policy for more.",
    ]);
    expect(screen.queryByText(/Placeholder/)).toBeNull();
  });
});
