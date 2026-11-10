// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import TermsPage from "./page";

const prices = vi.hoisted(() => {
  const approved = { weeklyCents: 1000, monthlyCents: 2999 };
  return { approved, PLAN_PRICES: approved };
});
vi.mock("@/lib/planPrices", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/planPrices")>()),
  get PLAN_PRICES() {
    return prices.PLAN_PRICES;
  },
}));

afterEach(() => {
  cleanup();
  prices.PLAN_PRICES = prices.approved;
});

function pageText() {
  const { container } = render(<TermsPage />);
  return (container.textContent ?? "").replace(/\s+/g, " ");
}

describe("Terms page", () => {
  it("shows every section of the Terms", () => {
    render(<TermsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeDefined();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "About these Terms",
      "Your Account",
      "Plans, the free week, and renewal",
      "Cancelling and refunds",
      "No score guarantee",
      "AI reads your screenshots",
      "7Sage and LSAC",
      "Using DrillMap fairly",
      "Your data and deleting your Account",
      "When we can end your access",
      "Disclaimers and limits on liability",
      "Changes to DrillMap and to these Terms",
      "Governing law",
      "Notice for California residents",
      "Contact",
    ]);
  });

  it("states the effective date, the age rule, and the agreement", () => {
    const text = pageText();
    expect(text).toContain("Effective date: November 9, 2026");
    expect(text).toContain("You must be at least 18 years old to use DrillMap.");
    expect(text).toContain("When you tick the “I agree” box or continue with Google at sign-up, you agree to these Terms.");
  });

  it("states the prices from the prices module", () => {
    const text = pageText();
    expect(text).toContain("Weekly costs $10 a week. Monthly costs $29.99 a month.");

    cleanup();
    prices.PLAN_PRICES = { weeklyCents: 1299, monthlyCents: 3999 };
    expect(pageText()).toContain("Weekly costs $12.99 a week. Monthly costs $39.99 a month.");
  });

  it("states auto-renewal, the free week, cancelling, and refunds", () => {
    const text = pageText();
    expect(text).toContain("Your plan renews on its own at the end of each week or month until you cancel.");
    expect(text).toContain(
      "The free week runs from the end of onboarding to the Sunday that closes your first full Monday–Sunday week, so it lasts 7 to 13 days.",
    );
    expect(text).toContain("Your first charge is on the Monday after your free week ends.");
    expect(text).toContain("Each email address gets one free week in any 12 months.");
    expect(text).toContain("If you cancel during the free week, you pay nothing.");
    expect(text).toContain("You can cancel at any time on the Stripe Customer Portal.");
    expect(text).toContain("We do not give refunds for unused time.");
    expect(text).toContain("Stripe is the seller of record.");
  });

  it("states the AI, score, and 7Sage limits", () => {
    const text = pageText();
    expect(text).toContain("DrillMap does not promise any LSAT score or result.");
    expect(text).toContain("You must check the numbers AI reads and correct any that are wrong before you confirm them.");
    expect(text).toContain("DrillMap is not affiliated with, endorsed by, or sponsored by 7Sage or LSAC.");
  });

  it("matches the Privacy Policy on Account deletion", () => {
    const text = pageText();
    expect(text).toContain("You can delete your Account on the Account page.");
    expect(text).toContain("If you have a plan, it ends at once. We do not refund unused time.");
  });

  it("links the AI page, the Privacy Policy, and the contact mailbox", () => {
    render(<TermsPage />);
    expect(screen.getByRole("link", { name: "How DrillMap uses AI" }).getAttribute("href")).toBe("/legal/ai-disclosure");
    expect(screen.getAllByRole("link", { name: "Privacy Policy" })[0].getAttribute("href")).toBe("/legal/privacy");
    expect(screen.getAllByRole("link", { name: "privacy@drillmap.xyz" })[0].getAttribute("href")).toBe(
      "mailto:privacy@drillmap.xyz",
    );
  });

  it("marks the governing state as the only open gap", () => {
    const text = pageText();
    expect(text.match(/\[[^\]]*\]/g)).toEqual(["[state to be set before launch]"]);
    expect(text).not.toMatch(/placeholder/i);
  });
});
