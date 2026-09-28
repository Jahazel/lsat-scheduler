// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import AnalyticsUploader from "./AnalyticsUploader";
import type { SampleDraft } from "@/components/AdminTestContext";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function reviewScreenshot() {
  const user = userEvent.setup();
  render(<AnalyticsUploader />);
  await user.upload(screen.getByLabelText(/Choose a 7Sage analytics screenshot/), new File(["image"], "analytics.png", { type: "image/png" }));
  await user.click(await screen.findByLabelText("I reviewed these values and they match my screenshot."));
  await user.click(screen.getByLabelText("This screenshot contains my latest 7Sage analytics."));
  await user.click(screen.getByRole("button", { name: "Confirm snapshot" }));
}

describe("AnalyticsUploader", () => {
  it("renders the analytics snapshot heading", () => {
    render(<AnalyticsUploader />);
    expect(screen.getByRole("heading", { name: "Add your latest analytics snapshot" })).toBeDefined();
  });

  it.each(["", "<html>Internal Server Error</html>", "{invalid", "null", '{"error":42}'])("shows a retry message when saving returns an unusable error body: %s", async (body) => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json({ rows: [{ type: "Strengthen", category: "regular", accuracy: 70 }] }))
      .mockResolvedValueOnce(new Response(body, { status: 500 })));
    await reviewScreenshot();
    expect(await screen.findByText("Couldn't save. Try again.")).toBeDefined();
    expect((screen.getByRole("button", { name: "Confirm snapshot" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows the retry message for a screenshot save with a readable server error", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json({ rows: [{ type: "Strengthen", category: "regular", accuracy: 70 }] }))
      .mockResolvedValueOnce(Response.json({ error: "Upload a fresh analytics screenshot before saving." }, { status: 400 })));
    await reviewScreenshot();
    expect(await screen.findByText("Couldn't save. Try again.")).toBeDefined();
  });

  it("shows the server error for an Admin sample analytics snapshot save", async () => {
    const sample: SampleDraft = {
      rows: [{ type: "Strengthen", category: "regular", accuracy: 70 }],
      extractedAt: "2026-09-28T12:00:00.000Z",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json(
      { error: "Admin access required for sample analytics." },
      { status: 403 },
    )));
    const user = userEvent.setup();
    render(<AnalyticsUploader sample={sample} />);
    await user.click(screen.getByLabelText("I reviewed and approved these sample values."));
    await user.click(screen.getByLabelText("Use this sample as my latest analytics."));
    await user.click(screen.getByRole("button", { name: "Confirm snapshot" }));
    expect(await screen.findByText("Admin access required for sample analytics.")).toBeDefined();
  });

  it("keeps the retry message when the network request fails", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json({ rows: [{ type: "Strengthen", category: "regular", accuracy: 70 }] }))
      .mockRejectedValueOnce(new TypeError("Failed to fetch")));
    await reviewScreenshot();
    expect(await screen.findByText("Couldn't save. Try again.")).toBeDefined();
  });

});
