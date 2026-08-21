"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AnalyticsReview from "../AnalyticsReview";
import type { AnalyticsExtractedRow } from "@/lib/types";

export default function AnalyticsUploader({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<AnalyticsExtractedRow[]>([]);
  const [hasExtracted, setHasExtracted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const lrAccuracyByType: Record<string, number> = {};
    const lrTopPriorityLogicTypes: string[] = [];

    for (const row of rows) {
      if (row.category === "regular" && row.accuracy !== undefined) {
        lrAccuracyByType[row.type] = row.accuracy / 100;
      }
      if (row.category === "restricted" && row.isTopPriority) {
        lrTopPriorityLogicTypes.push(row.type);
      }
    }

    try {
      const res = await fetch(`/api/students/${studentId}/analytics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lrAccuracyByType,
          lrTopPriorityLogicTypes,
        }),
      });
      if (!res.ok) throw new Error();
      setHasExtracted(false);
      setRows([]);
      router.refresh();
    } catch {
      setError("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-10 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="font-semibold text-black dark:text-zinc-50">Upload analytics</h2>

      <div className="mt-3 flex flex-col gap-4">
        <AnalyticsReview rows={rows} onRowsChange={setRows} onExtractedChange={setHasExtracted} />

        {hasExtracted && (
          <>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {saving ? "Saving…" : "Save analytics"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
