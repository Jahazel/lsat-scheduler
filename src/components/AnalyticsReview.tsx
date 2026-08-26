"use client";

import { useState } from "react";
import { mockRules } from "@/lib/mockData";
import type { AnalyticsExtractedRow, LRType } from "@/lib/types";

// Every type the review screen might need to offer for manual add — tagged
// with the same "regular" / "restricted" split the engine uses.
const ALL_TYPES: { type: LRType; category: "regular" | "restricted" }[] = [
  ...mockRules.lrStemTypes.map((type) => ({ type, category: "regular" as const })),
  ...mockRules.lrLogicTypes.map((type) => ({
    type,
    category: mockRules.lrLogicExceptions.includes(type)
      ? ("regular" as const)
      : ("restricted" as const),
  })),
];

interface AnalyticsReviewProps {
  rows: AnalyticsExtractedRow[];
  onRowsChange: (rows: AnalyticsExtractedRow[]) => void;
  onExtractedChange?: (extracted: boolean) => void;
}

// Shared upload + review UI: pick a screenshot, OCR-extract candidate rows,
// then let the reviewer correct accuracies/priority flags or add a row the
// screenshot missed. Used both on student intake (optional, before the
// student exists) and on the per-student page (weekly re-upload).
export default function AnalyticsReview({
  rows,
  onRowsChange,
  onExtractedChange,
}: AnalyticsReviewProps) {
  const [typeToAdd, setTypeToAdd] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [hasExtracted, setHasExtracted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setHasExtractedAndNotify(value: boolean) {
    setHasExtracted(value);
    onExtractedChange?.(value);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtracting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/analytics/extract", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      const { rows: extracted } = await res.json();
      onRowsChange(extracted);
      setHasExtractedAndNotify(true);
    } catch {
      setError("Couldn't read that screenshot. Try again or a clearer image.");
    } finally {
      setExtracting(false);
    }
  }

  function updateAccuracy(index: number, value: string) {
    onRowsChange(
      rows.map((r, i) => (i === index ? { ...r, accuracy: value === "" ? undefined : Number(value) } : r))
    );
  }

  function toggleTopPriority(index: number) {
    onRowsChange(rows.map((r, i) => (i === index ? { ...r, isTopPriority: !r.isTopPriority } : r)));
  }

  function removeRow(index: number) {
    onRowsChange(rows.filter((_, i) => i !== index));
  }

  function addRow() {
    const match = ALL_TYPES.find((t) => t.type === typeToAdd);
    if (!match) return;
    onRowsChange([...rows, { type: match.type, category: match.category }]);
    setTypeToAdd("");
  }

  if (!hasExtracted) {
    return (
      <div>
        <input type="file" accept="image/*" onChange={handleFileChange} disabled={extracting} />
        {extracting && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">Reading screenshot…</p>
        )}
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  const indexed = rows.map((row, i) => ({ row, i }));
  const accuracyRows = indexed.filter(({ row }) => row.category === "regular");
  const priorityRows = indexed.filter(({ row }) => row.category === "restricted");

  return (
    <div className="flex flex-col gap-4">
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Nothing recognized from that screenshot.
        </p>
      ) : (
        <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {accuracyRows.length > 0 && (
            <div className="p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                Accuracy by type
              </h3>
              <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-900">
                {accuracyRows.map(({ row, i }) => (
                  <li key={`${row.type}-${i}`} className="flex items-center gap-3 py-2 text-sm">
                    <span className="flex-1 text-black dark:text-zinc-50">{row.type}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={row.accuracy ?? ""}
                        onChange={(e) => updateAccuracy(i, e.target.value)}
                        placeholder="—"
                        className="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1 text-right dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <span className="text-xs text-zinc-500 dark:text-zinc-500">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-zinc-400 hover:text-red-500"
                      aria-label={`Remove ${row.type}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {priorityRows.length > 0 && (
            <div className="p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                Flagged as top priority
              </h3>
              <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-900">
                {priorityRows.map(({ row, i }) => (
                  <li key={`${row.type}-${i}`} className="flex items-center gap-3 py-2 text-sm">
                    <span className="flex-1 text-black dark:text-zinc-50">{row.type}</span>
                    <label className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                      <input
                        type="checkbox"
                        checked={row.isTopPriority ?? false}
                        onChange={() => toggleTopPriority(i)}
                      />
                      Top priority
                    </label>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-zinc-400 hover:text-red-500"
                      aria-label={`Remove ${row.type}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <select
          value={typeToAdd}
          onChange={(e) => setTypeToAdd(e.target.value)}
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Add a type the screenshot missed…</option>
          {ALL_TYPES.filter((t) => !rows.some((r) => r.type === t.type)).map((t) => (
            <option key={t.type} value={t.type}>
              {t.type}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addRow}
          disabled={!typeToAdd}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-black disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50"
        >
          Add
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
