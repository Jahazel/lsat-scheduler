// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
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
    expect(text).toContain(
      "You get no free week if you had a plan before, or if your email address had a free week in the last 12 months.",
    );
    expect(text).toContain("If you cancel during the free week, you pay nothing. You keep access until the free week ends.");
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

  it("states Account deletion and its effect on a plan", () => {
    const text = pageText();
    expect(text).toContain("You can delete your Account on the Account page.");
    expect(text).toContain("If you have a plan, it ends at once. We do not refund unused time.");
  });

  it("links the AI page, the Privacy Policy, and the contact mailbox", () => {
    render(<TermsPage />);
    expect(screen.getByRole("link", { name: "How DrillMap uses AI" }).getAttribute("href")).toBe("/legal/ai-disclosure");
    const hrefs = (name: string) => screen.getAllByRole("link", { name }).map((link) => link.getAttribute("href"));
    expect(new Set(hrefs("Privacy Policy"))).toEqual(new Set(["/legal/privacy"]));
    expect(new Set(hrefs("privacy@drillmap.xyz"))).toEqual(new Set(["mailto:privacy@drillmap.xyz"]));
  });

  it("marks the governing state as the only open gap", () => {
    const text = pageText();
    expect(text.match(/\[[^\]]*\]/g)).toEqual(["[state to be set before launch]"]);
    expect(text).not.toMatch(/placeholder/i);
  });

  it("shows the legal header with its date line and the page tabs, with this page marked", () => {
    render(<TermsPage />);
    expect(screen.getByText("Legal")).toBeDefined();
    expect(screen.getByText("Effective date: November 9, 2026")).toBeDefined();
    const tabs = within(screen.getByRole("navigation", { name: "Legal pages" })).getAllByRole("link");
    expect(tabs.map((tab) => [tab.textContent, tab.getAttribute("href")])).toEqual([
      ["Terms", "/legal/terms"],
      ["Privacy", "/legal/privacy"],
      ["AI disclosure", "/legal/ai-disclosure"],
    ]);
    expect(tabs.filter((tab) => tab.getAttribute("aria-current") === "page").map((tab) => tab.textContent)).toEqual(["Terms"]);
  });

  it("gives every section its fixed link name", () => {
    const { container } = render(<TermsPage />);
    const sections = [...container.querySelectorAll("section")].map((section) => [section.id, section.querySelector("h2")?.textContent]);
    expect(sections).toEqual([
      ["about-these-terms", "About these Terms"],
      ["your-account", "Your Account"],
      ["plans-the-free-week-and-renewal", "Plans, the free week, and renewal"],
      ["cancelling-and-refunds", "Cancelling and refunds"],
      ["no-score-guarantee", "No score guarantee"],
      ["ai-reads-your-screenshots", "AI reads your screenshots"],
      ["7sage-and-lsac", "7Sage and LSAC"],
      ["using-drillmap-fairly", "Using DrillMap fairly"],
      ["your-data-and-deleting-your-account", "Your data and deleting your Account"],
      ["when-we-can-end-your-access", "When we can end your access"],
      ["disclaimers-and-limits-on-liability", "Disclaimers and limits on liability"],
      ["changes-to-drillmap-and-to-these-terms", "Changes to DrillMap and to these Terms"],
      ["governing-law", "Governing law"],
      ["notice-for-california-residents", "Notice for California residents"],
      ["contact", "Contact"],
    ]);
  });
});
