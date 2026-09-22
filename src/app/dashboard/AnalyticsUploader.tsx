"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AnalyticsReview from "@/components/AnalyticsReview";
import { summarizeAnalyticsRows } from "@/lib/analytics";
import type { SnapshotApprovalMetadata } from "@/lib/analyticsSnapshots";
import type { AnalyticsExtractedRow } from "@/lib/types";

// Always writes to the logged-in student's own snapshot via /api/analytics
// — no studentId prop needed, unlike the old tutor-driven version.
export default function AnalyticsUploader() {
  const router = useRouter();
  const [rows, setRows] = useState<AnalyticsExtractedRow[]>([]);
  const [hasExtracted, setHasExtracted] = useState(false);
  const [approval, setApproval] = useState<SnapshotApprovalMetadata | null>(null);
  const [reviewKey, setReviewKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...summarizeAnalyticsRows(rows), ...approval }),
      });
      if (!res.ok) throw new Error();
      setHasExtracted(false);
      setApproval(null);
      setRows([]);
      setReviewKey((key) => key + 1);
      router.refresh();
    } catch {
      setError("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-ink-200 bg-white">
      <header className="border-b border-ink-200 px-6 py-5 sm:px-8">
        <p className="text-sm font-medium text-ink-700">{hasExtracted ? "Step 2 of 3 · Review" : "Create your study week"}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">{hasExtracted ? "Check the extracted analytics" : "Add your latest analytics snapshot"}</h1>
        {hasExtracted && <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">Compare each result with your screenshot. Edit anything that needs correcting before you confirm.</p>}
      </header>
      <div className={hasExtracted ? "p-6 sm:p-8" : "grid md:grid-cols-[12rem_1fr]"}>
        <ol aria-label="Analytics snapshot progress" className={hasExtracted ? "hidden" : "flex border-b border-ink-200 bg-ink-25 px-6 py-5 md:block md:border-b-0 md:border-r md:px-7 md:py-7"}>
          <li aria-current={hasExtracted ? undefined : "step"} className={`flex items-center gap-3 text-sm font-semibold ${hasExtracted ? "text-ink-500" : "text-ink-900"}`}>
            <span aria-hidden="true" className={`grid size-7 place-items-center rounded-full text-xs ${hasExtracted ? "bg-accent-100 text-accent-700" : "bg-accent-600 text-white"}`}>{hasExtracted ? "✓" : "1"}</span>
            Upload<span className="sr-only">{hasExtracted ? " — complete" : " — current step"}</span>
          </li>
          <li aria-current={hasExtracted ? "step" : undefined} className={`ml-6 flex items-center gap-3 text-sm md:ml-0 md:mt-7 ${hasExtracted ? "font-semibold text-ink-900" : "text-ink-500"}`}>
            <span aria-hidden="true" className={`grid size-7 place-items-center rounded-full text-xs ${hasExtracted ? "bg-accent-600 text-white" : "border border-ink-200 bg-white"}`}>2</span>
            Review<span className="sr-only">{hasExtracted ? " — current step" : " — upcoming"}</span>
          </li>
          <li className="ml-6 flex items-center gap-3 text-sm text-ink-500 md:ml-0 md:mt-7">
            <span aria-hidden="true" className="grid size-7 place-items-center rounded-full border border-ink-200 bg-white text-xs">3</span>
            Schedule<span className="sr-only"> — upcoming</span>
          </li>
        </ol>
        <div className={hasExtracted ? "" : "p-6 sm:p-8"}>
          <h2 className={hasExtracted ? "sr-only" : "font-semibold text-ink-900"}>{hasExtracted ? "Review extracted analytics" : "Upload your dashboard snapshot"}</h2>
          <p className={hasExtracted ? "hidden" : "mt-1 text-sm leading-6 text-ink-700"}>Use the analytics overview you checked most recently in 7Sage.</p>

          <div className="mt-5 flex flex-col gap-4">
            <AnalyticsReview
              key={reviewKey}
              rows={rows}
              onRowsChange={setRows}
              onExtractedChange={setHasExtracted}
              onApprovalChange={setApproval}
              uploadPresentation="guided"
              reviewPresentation={hasExtracted ? "full-width" : "default"}
            />
            {hasExtracted && (
              <>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex flex-col gap-3 border-t border-ink-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-ink-500">{approval ? "Ready to create your schedule." : "Confirm both statements before saving this snapshot."}</p>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !approval}
                    className="self-start rounded-md bg-accent-600 px-6 py-3 text-base font-medium text-white transition-colors duration-150 ease-out hover:bg-accent-700 focus-visible:bg-accent-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
                  >
                    {saving ? "Saving…" : "Confirm snapshot"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
