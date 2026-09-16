"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AnalyticsReview from "@/components/AnalyticsReview";
import { summarizeAnalyticsRows } from "@/lib/analytics";
import type { SnapshotApprovalMetadata } from "@/lib/analyticsSnapshots";
import type { AnalyticsExtractedRow } from "@/lib/types";

// Always writes to the logged-in student's own snapshot via /api/analytics
// — no studentId prop needed, unlike the old tutor-driven version.
export default function AnalyticsUploader({ scheduleTestDate }: { scheduleTestDate?: string }) {
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
        body: JSON.stringify({ ...summarizeAnalyticsRows(rows), ...approval, scheduleTestDate }),
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
        <p className="text-sm font-medium text-ink-700">Create your study week</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">Add this week&rsquo;s analytics</h1>
      </header>
      <div className="grid md:grid-cols-[12rem_1fr]">
        <ol aria-label="Analytics upload progress" className="flex border-b border-ink-200 bg-ink-25 px-6 py-5 md:block md:border-b-0 md:border-r md:px-7 md:py-7">
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
        <div className="p-6 sm:p-8">
          <h2 className="font-semibold text-ink-900">{hasExtracted ? "Review your extracted analytics" : "Upload your dashboard snapshot"}</h2>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            {hasExtracted
              ? "Compare the extracted values with your screenshot, then confirm the snapshot."
              : "Use the analytics overview you checked most recently in 7Sage."}
          </p>

          <div className="mt-5 flex flex-col gap-4">
            <AnalyticsReview
              key={reviewKey}
              rows={rows}
              onRowsChange={setRows}
              onExtractedChange={setHasExtracted}
              onApprovalChange={setApproval}
              uploadPresentation="guided"
            />

            {hasExtracted && (
              <>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !approval}
                  className="self-start rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-accent-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save analytics"}
                </button>
                {!approval && <p className="text-sm text-ink-500">Confirm both statements before saving this snapshot.</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
