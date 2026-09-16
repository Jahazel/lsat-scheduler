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
    <div className="mt-10 rounded-lg border border-ink-100 bg-white p-4">
      <h2 className="font-semibold text-ink-900">Upload this week&rsquo;s analytics</h2>

      <div className="mt-3 flex flex-col gap-4">
        <AnalyticsReview
          key={reviewKey}
          rows={rows}
          onRowsChange={setRows}
          onExtractedChange={setHasExtracted}
          onApprovalChange={setApproval}
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
            {!approval && (
              <p className="text-sm text-ink-500">Confirm both statements before saving this snapshot.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
