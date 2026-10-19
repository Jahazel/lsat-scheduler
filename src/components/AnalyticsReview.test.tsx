// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AnalyticsReview from "./AnalyticsReview";
import { startReview } from "@/lib/analyticsReview";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

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

describe("screenshot limits", () => {
  function renderGuidedUpload() {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<AnalyticsReview review={null} onReviewChange={() => {}} uploadPresentation="guided" />);
    return fetchSpy;
  }

  it("shows the upload limits", () => {
    renderGuidedUpload();
    expect(screen.getByText("PNG, JPG, or WEBP · 4 MB or less")).toBeDefined();
  });

  it.each([
    ["a wrong file type", new File(["%PDF-1.7"], "study-notes.pdf", { type: "application/pdf" }), "study-notes.pdf is a PDF. Choose a PNG, JPG, or WEBP screenshot."],
    ["a file over 4 MB", new File([new Uint8Array(13_002_342)], "analytics.png", { type: "image/png" }), "That file is 12.4 MB. Choose one that is 4 MB or less."],
  ])("names %s without uploading", async (_label, file, message) => {
    const fetchSpy = renderGuidedUpload();
    await userEvent.setup({ applyAccept: false }).upload(screen.getByLabelText(/Choose a 7Sage analytics screenshot/), file);

    expect(await screen.findByText(message)).toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows the route's rejection when the server finds a mislabeled file", async () => {
    const fetchSpy = renderGuidedUpload();
    const error = "renamed.png is not a PNG, JPG, or WEBP image. Choose a PNG, JPG, or WEBP screenshot.";
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ error, reason: "wrong-type" }), { status: 415 }));
    await userEvent.upload(screen.getByLabelText(/Choose a 7Sage analytics screenshot/), new File(["%PDF-1.7"], "renamed.png", { type: "image/png" }));

    expect(await screen.findByText(error)).toBeDefined();
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});
