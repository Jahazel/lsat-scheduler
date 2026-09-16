import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/AnalyticsReview", () => ({ default: () => <div>analytics review</div> }));

import AnalyticsUploader from "./AnalyticsUploader";

describe("AnalyticsUploader", () => {
  it("renders the analytics snapshot heading without exposing an HTML entity", () => {
    const markup = renderToStaticMarkup(<AnalyticsUploader />);

    expect(markup).toContain("Add your latest analytics snapshot");
    expect(markup).not.toContain("&amp;rsquo;");
  });
});
