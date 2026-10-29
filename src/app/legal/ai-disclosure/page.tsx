import Link from "next/link";

export default function AIDisclosurePage() {
  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-h3 font-semibold text-ink">How DrillMap uses AI</h1>
        <div className="mt-4 space-y-4 text-small leading-body text-smoke">
          <p>
            DrillMap uses AI for one task only: reading the numbers in your 7Sage analytics screenshot. Anthropic&apos;s
            Claude model does this. You see the numbers before anything is saved, and you can correct them. If AI cannot
            read the screenshot, or if the monthly reading limit is reached, you can type the numbers in by hand.
          </p>
          <p>AI does not make your weekly schedule. Fixed rules make it from your approved numbers and study settings.</p>
          <p>
            Anthropic keeps each screenshot for up to 30 days and then deletes it. DrillMap does not store screenshots.
            See the{" "}
            <Link href="/legal/privacy" className="text-ink underline underline-offset-3">
              Privacy Policy
            </Link>{" "}
            for more.
          </p>
        </div>
      </div>
    </div>
  );
}
