// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import AnalyticsUploader from "./AnalyticsUploader";
import type { SampleDraft } from "@/components/AdminTestContext";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const lrRows = () => Response.json({ rows: [{ type: "Strengthen", category: "regular", accuracy: 70 }] });
const rcRows = () => Response.json({
  rows: [
    { type: "Law", category: "passage", accuracy: 58 },
    { type: "Comparative", category: "passage", accuracy: 70 },
    { type: "Science", category: "passage", accuracy: 64 },
    { type: "Humanities", category: "passage", accuracy: 81 },
    { type: "Art", category: "passage", accuracy: 77 },
  ],
});
const screenshot = new File(["image"], "analytics.png", { type: "image/png" });
const lrPicker = () => screen.getByLabelText("Logical Reasoning screenshot file");
const rcPicker = () => screen.getByLabelText("Reading Comprehension screenshot file");

async function addBothScreenshots(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(lrPicker(), screenshot);
  await user.upload(await screen.findByLabelText("Reading Comprehension screenshot file"), screenshot);
  await screen.findByLabelText("Law passage accuracy");
}

async function reviewScreenshot() {
  const user = userEvent.setup();
  render(<AnalyticsUploader />);
  await addBothScreenshots(user);
  await user.click(screen.getByLabelText("I reviewed these values and they match my screenshots."));
  await user.click(screen.getByLabelText("These screenshots show my latest 7Sage analytics."));
  await user.click(screen.getByRole("button", { name: "Confirm snapshot" }));
}

describe("AnalyticsUploader", () => {
  it("renders the analytics snapshot heading", () => {
    render(<AnalyticsUploader />);
    expect(screen.getByRole("heading", { name: "Add your latest analytics snapshot" })).toBeDefined();
    expect(lrPicker()).toBeDefined();
    expect(rcPicker()).toBeDefined();
  });

  it("keeps Confirm snapshot disabled until the RC screenshot is added", async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce(lrRows()).mockResolvedValueOnce(rcRows());
    vi.stubGlobal("fetch", fetchSpy);
    const user = userEvent.setup();
    render(<AnalyticsUploader />);
    await user.upload(lrPicker(), screenshot);
    await screen.findByLabelText("Strengthen accuracy");
    await user.click(screen.getByLabelText("I reviewed these values and they match my screenshots."));
    await user.click(screen.getByLabelText("These screenshots show my latest 7Sage analytics."));

    expect((screen.getByRole("button", { name: "Confirm snapshot" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Add both screenshots before saving this snapshot.")).toBeDefined();
    expect((fetchSpy.mock.calls[0][1].body as FormData).get("section")).toBe("LR");

    await user.upload(rcPicker(), screenshot);
    expect(await screen.findByText("Goes first")).toBeDefined();
    expect((fetchSpy.mock.calls[1][1].body as FormData).get("section")).toBe("RC");
  });

  it("names the fix when the RC screenshot shows no passage types", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ rows: [] })));
    const user = userEvent.setup();
    render(<AnalyticsUploader />);
    await user.upload(rcPicker(), screenshot);
    expect(await screen.findByText("We found no passage types in that screenshot. Choose your Reading Comprehension screenshot.")).toBeDefined();
  });

  it("locks Confirm snapshot while a passage type is empty", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(lrRows()).mockResolvedValueOnce(Response.json({
      rows: [{ type: "Law", category: "passage", accuracy: 58 }],
    })));
    const user = userEvent.setup();
    render(<AnalyticsUploader />);
    await user.upload(lrPicker(), screenshot);
    await user.upload(await screen.findByLabelText("Reading Comprehension screenshot file"), screenshot);
    expect(((await screen.findByLabelText("Art passage accuracy")) as HTMLInputElement).value).toBe("");
    expect(screen.getAllByText("not found")).toHaveLength(4);
    await user.click(screen.getByLabelText("I reviewed these values and they match my screenshots."));
    await user.click(screen.getByLabelText("These screenshots show my latest 7Sage analytics."));

    expect((screen.getByRole("button", { name: "Confirm snapshot" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Fix the accuracy values above. Each one must be 0 to 100.")).toBeDefined();
  });

  it.each(["", "<html>Internal Server Error</html>", "{invalid", "null", '{"error":42}'])("shows a retry message when saving returns an unusable error body: %s", async (body) => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(lrRows())
      .mockResolvedValueOnce(rcRows())
      .mockResolvedValueOnce(new Response(body, { status: 500 })));
    await reviewScreenshot();
    expect(await screen.findByText("Couldn't save. Try again.")).toBeDefined();
    expect((screen.getByRole("button", { name: "Confirm snapshot" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows the retry message for a screenshot save with a readable server error", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(lrRows())
      .mockResolvedValueOnce(rcRows())
      .mockResolvedValueOnce(Response.json({ error: "Upload a fresh analytics screenshot before saving." }, { status: 400 })));
    await reviewScreenshot();
    expect(await screen.findByText("Couldn't save. Try again.")).toBeDefined();
  });

  it("shows the server error for an Admin sample analytics snapshot save", async () => {
    const sample: SampleDraft = {
      rows: [
        { type: "Strengthen", category: "regular", accuracy: 70 },
        { type: "Law", category: "passage", accuracy: 58 },
        { type: "Comparative", category: "passage", accuracy: 70 },
        { type: "Science", category: "passage", accuracy: 64 },
        { type: "Humanities", category: "passage", accuracy: 81 },
        { type: "Art", category: "passage", accuracy: 77 },
      ],
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

  it("keeps Confirm snapshot disabled and names the fix while an accuracy is over 100", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(lrRows()).mockResolvedValueOnce(rcRows()));
    const user = userEvent.setup();
    render(<AnalyticsUploader />);
    await addBothScreenshots(user);
    const accuracy = screen.getByLabelText("Strengthen accuracy");
    await user.clear(accuracy);
    await user.type(accuracy, "120");
    await user.click(screen.getByLabelText("I reviewed these values and they match my screenshots."));
    await user.click(screen.getByLabelText("These screenshots show my latest 7Sage analytics."));
    expect((screen.getByRole("button", { name: "Confirm snapshot" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Fix the accuracy values above. Each one must be 0 to 100.")).toBeDefined();
  });

  it("says the sign-in expired when the upload runs signed out", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ error: "Not signed in" }, { status: 401 })));
    const user = userEvent.setup();
    render(<AnalyticsUploader />);
    await user.upload(lrPicker(), screenshot);

    expect(await screen.findByText(/Your sign-in expired\. Sign in again, then upload your screenshot again\./)).toBeDefined();
    expect(screen.getByRole("link", { name: "Sign in again" }).getAttribute("href")).toBe("/login");
    expect(screen.queryByText(/Couldn't read that screenshot/)).toBeNull();
  });

  it("replaces the sign-in message with the file problem when the next file is rejected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ error: "Not signed in" }, { status: 401 })));
    const user = userEvent.setup();
    render(<AnalyticsUploader />);
    await user.upload(lrPicker(), new File(["image"], "analytics.png", { type: "image/png" }));
    await screen.findByRole("link", { name: "Sign in again" });

    await user.upload(lrPicker(), new File([new Uint8Array(5 * 1024 * 1024)], "huge.png", { type: "image/png" }));

    expect(screen.getByText(/That file is 5\.0 MB/)).toBeDefined();
    expect(screen.queryByRole("link", { name: "Sign in again" })).toBeNull();
  });

  it("leaves focus where the student moved it while the save was running", async () => {
    let reply!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(lrRows())
      .mockResolvedValueOnce(rcRows())
      .mockReturnValueOnce(new Promise<Response>((resolve) => { reply = resolve; })));
    const outside = document.body.appendChild(document.createElement("button"));
    await reviewScreenshot();
    outside.focus();

    reply(Response.json({ error: "Not signed in" }, { status: 401 }));

    await screen.findByRole("link", { name: "Sign in again" });
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it("says the sign-in expired when the save runs signed out", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(lrRows())
      .mockResolvedValueOnce(rcRows())
      .mockResolvedValueOnce(Response.json({ error: "Not signed in" }, { status: 401 })));
    await reviewScreenshot();

    expect(await screen.findByText(/Your sign-in expired\. Sign in again, then upload your screenshot again\./)).toBeDefined();
    expect(screen.getByRole("link", { name: "Sign in again" }).getAttribute("href")).toBe("/login");
    expect(screen.queryByText("Couldn't save. Try again.")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Sign in again" }));
  });

  it("keeps the retry message when the network request fails", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(lrRows())
      .mockResolvedValueOnce(rcRows())
      .mockRejectedValueOnce(new TypeError("Failed to fetch")));
    await reviewScreenshot();
    expect(await screen.findByText("Couldn't save. Try again.")).toBeDefined();
  });

});
