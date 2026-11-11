// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import PrivacyPage from "./page";

afterEach(cleanup);

describe("Privacy page", () => {
  it("shows every section of the approved privacy text", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeDefined();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "What DrillMap stores",
      "Who can see your data",
      "Your 7Sage screenshots",
      "Payments",
      "Companies that handle your data for us",
      "Security records",
      "How long we keep data",
      "Deleting your Account",
      "Backups",
      "Contact",
    ]);
  });

  it("states the release-day facts", () => {
    const { container } = render(<PrivacyPage />);
    const text = container.textContent ?? "";
    expect(text).toContain("Last updated: November 10, 2026");
    expect(text).toContain("We keep daily database backups for 14 days.");
    expect(text).toContain("After a restore, we delete again every Account that was deleted before.");
    expect(text).toContain("We delete these records after 90 days.");
    expect(text).toContain("We use it for 30 days to make sure a restore from backup cannot bring your data back.");
    expect(text).toContain("If you do not sign in for 2 years, we email you, and we delete your Account 30 days later.");
    expect(text).toContain("You must have signed in within the last 10 minutes.");
    expect(text).toContain("Google handles sign-in if you choose “Continue with Google.”");
  });

  it("names Stripe as the seller and payment processor, what DrillMap sends Stripe, and the used free week list with its 12-month limit", () => {
    const { container } = render(<PrivacyPage />);
    const text = container.textContent ?? "";
    expect(text).toContain("Stripe sells your plan and takes your payment. Stripe is the seller");
    expect(text).toContain("Stripe sells plans and takes payments, as described above.");
    expect(text).toContain("To start your plan, DrillMap sends Stripe your email address, your Account ID, the plan you picked, and the date your free week ends.");
    expect(text).toContain("Each email address gets one free week in 12 months.");
    expect(text).toContain("we save a scrambled form (hash) of your email address and the date in the used free week list.");
    expect(text).toContain("We keep each row for 12 months, even if you delete your Account, and then delete it.");
    expect(text).toContain("Used free week list: 12 months from the day your free week starts.");
  });

  it("tells students that admins see their plan status", () => {
    const { container } = render(<PrivacyPage />);
    expect(container.textContent).toContain(
      "weekly study time, plan status (free week, paid, retrying, or lapsed), and saved weekly schedule with its activity check-ins",
    );
  });

  it("links the privacy contact mailbox", () => {
    render(<PrivacyPage />);
    const contact = screen.getByRole("link", { name: "privacy@drillmap.xyz" });
    expect(contact.getAttribute("href")).toBe("mailto:privacy@drillmap.xyz");
  });

  it("leaves no unfilled bracket, email list, or lead line", () => {
    const { container } = render(<PrivacyPage />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/[[\]]/);
    expect(text).not.toMatch(/email list/i);
    expect(text).not.toMatch(/\blead/i);
    expect(text).not.toMatch(/does not keep backups/);
  });
});
