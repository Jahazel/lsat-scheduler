import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { PRIVACY_SECTIONS } from "../privacy/sections";
import { termsSections } from "../terms/sections";

const PARAGRAPHS = (
  <>
    <p>
      DrillMap uses AI for one task only: reading the numbers in your 7Sage analytics screenshot. Anthropic&apos;s Claude
      model does this. You see the numbers before anything is saved, and you can correct them. If AI cannot read the
      screenshot, or if the monthly reading limit is reached, you can type the numbers in by hand.
    </p>
    <p>AI does not make your weekly schedule. Fixed rules make it from your approved numbers and study settings.</p>
    <p>
      Anthropic keeps each screenshot for up to 30 days and then deletes it. DrillMap does not store screenshots. See
      the <Link href="/legal/privacy">Privacy Policy</Link> for more.
    </p>
  </>
);

export default function AIDisclosurePage() {
  return (
    <LegalPage
      id="ai-disclosure"
      title="How DrillMap uses AI"
      dateLine="Last updated: November 10, 2026"
      paragraphs={PARAGRAPHS}
      related={{ terms: termsSections(), privacy: PRIVACY_SECTIONS }}
    />
  );
}
