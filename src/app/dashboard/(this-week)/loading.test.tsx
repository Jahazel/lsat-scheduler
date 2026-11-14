// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import ThisWeekLoading from "./loading";

afterEach(cleanup);

const css = readFileSync(path.join(__dirname, "../../globals.css"), "utf8");
const reducedMotionRules = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([^@]*?)\n\}/g)].map((match) => match[1]).join("\n");

describe("This week loading placeholder", () => {
  it("takes the new This week shape: the title block and two notes, the summary card, Today, and two days of the rest of the week", () => {
    const { container } = render(<ThisWeekLoading />);
    const text = container.textContent;
    for (const words of ["Week of", "Your plan for this week", "Your plan is set. Check off as you go."]) expect(text).toContain(words);
    expect(text).toContain("of 13 done");
    expect(text).toContain("weeks to the January LSAT");
    expect(text).toContain("Today");
    expect(text).toContain("Up next");
    expect(text).toContain("Rest of the week");
    expect(text).toContain("Friday");
    expect(text).toContain("Saturday");
    expect(text).not.toContain("Monday");
    expect(text?.match(/Set up/g)).toHaveLength(8);
  });

  it("is hidden from screen readers", () => {
    const { container } = render(<ThisWeekLoading />);
    expect(container.firstElementChild!.getAttribute("aria-hidden")).toBe("true");
  });

  it("sweeps a band over the shapes, and under reduced motion drops the sweep but keeps the fades", () => {
    const { container } = render(<ThisWeekLoading />);
    const placeholder = container.firstElementChild as HTMLElement;
    expect(placeholder.style.animationName).toBe("page-placeholder-in");
    expect(css).toMatch(/\.page-placeholder-sweep \{[^}]*animation: page-placeholder-sweep 1\.6s linear infinite;/);
    expect(reducedMotionRules).toMatch(/\.page-placeholder-sweep \{ display: none; \}/);
    expect(reducedMotionRules).not.toContain("page-placeholder-in");
  });
});
