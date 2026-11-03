// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const address = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(address.search) }));

import ProgressLoading from "./loading";

afterEach(cleanup);

function placeholderText(search: string) {
  address.search = search;
  const { container } = render(<ProgressLoading />);
  return container.textContent;
}

describe("Progress loading placeholder", () => {
  it("takes the week page's shape when the address names a week", () => {
    const text = placeholderText("?week=2026-11-09");
    expect(text).toContain("← All weeks");
    expect(text).toContain("Past week");
    expect(text).not.toContain("November 2026");
  });

  it("takes the list's shape on plain Progress", () => {
    const text = placeholderText("");
    expect(text).toContain("November 2026");
    expect(text).not.toContain("← All weeks");
  });
});
