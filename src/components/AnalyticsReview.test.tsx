// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import AnalyticsReview from "./AnalyticsReview";
import { startReview } from "@/lib/analyticsReview";

afterEach(cleanup);

describe("analytics review wording", () => {
  it.each(["default", "full-width"] as const)("preserves screenshot wording in %s review", (reviewPresentation) => {
    render(<AnalyticsReview review={startReview([], { source: "7sage_screenshot", extractedAt: "2026-09-27T12:00:00Z" })} onReviewChange={() => {}} reviewPresentation={reviewPresentation} />);
    expect(screen.getByRole("option", { name: "Add a type the screenshot missed…" })).toBeDefined();
    expect(screen.getByRole("combobox", { name: "Add a type the screenshot missed" })).toBeDefined();
  });
  it("uses sample wording for sample analytics", () => {
    render(<AnalyticsReview review={startReview([], { source: "admin_sample", extractedAt: "2026-09-27T12:00:00Z" })} onReviewChange={() => {}} />);
    expect(screen.getByRole("option", { name: "Add a question type…" })).toBeDefined();
    expect(screen.getByRole("combobox", { name: "Add a question type" })).toBeDefined();
  });
});
