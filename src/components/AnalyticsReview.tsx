"use client";

import { useState } from "react";
import {
  addRow,
  editAccuracy,
  missingTypes,
  removeRow,
  reviewedRows,
  setStatement,
  startReview,
  toggleTopPriority,
  type SnapshotReview,
} from "@/lib/analyticsReview";
import { checkScreenshot, SCREENSHOT_LIMITS, SCREENSHOT_MEDIA_TYPES } from "@/lib/screenshotUpload";

const SCREENSHOT_ACCEPT = SCREENSHOT_MEDIA_TYPES.join(",");

interface AnalyticsReviewProps {
  review: SnapshotReview | null;
  onReviewChange: (review: SnapshotReview) => void;
  uploadPresentation?: "default" | "guided";
  reviewPresentation?: "default" | "full-width";
}

// Shared upload + review UI: pick a screenshot, OCR-extract candidate rows,
// then let the reviewer correct accuracies/priority flags or add a row the
// screenshot missed. Used both on student intake (optional, before the
// student exists) and on the per-student page (weekly re-upload).
export default function AnalyticsReview({
  review,
  onReviewChange,
  uploadPresentation = "default",
  reviewPresentation = "default",
}: AnalyticsReviewProps) {
  const [typeToAdd, setTypeToAdd] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const rejection = checkScreenshot(file);
    if (rejection) {
      setError(rejection.message);
      return;
    }

    setExtracting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/analytics/extract", {
        method: "POST",
        body: formData,
      });
      if (res.status === 413 || res.status === 415) {
        setError((await res.json()).error);
        return;
      }
      if (!res.ok) throw new Error();
      const { rows: extracted } = await res.json();
      onReviewChange(startReview(extracted, { source: "7sage_screenshot", extractedAt: new Date().toISOString() }));
    } catch {
      setError("Couldn't read that screenshot. Try again or a clearer image.");
    } finally {
      setExtracting(false);
    }
  }

  if (!review) {
    if (uploadPresentation === "guided") {
      return (
        <div>
          <label className="block cursor-pointer rounded-lg border border-dashed border-accent-600 bg-accent-100/35 p-5 transition-colors duration-150 ease-out hover:bg-accent-100/60 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent-600 has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50">
            <span className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-accent-700">
                <svg aria-hidden="true" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 16V4m0 0-4 4m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>
                <span className="block font-semibold text-ink-900">Choose a 7Sage analytics screenshot</span>
                <span className="mt-1 block text-sm text-ink-700">{SCREENSHOT_LIMITS}</span>
              </span>
            </span>
            <input className="sr-only" type="file" accept={SCREENSHOT_ACCEPT} onChange={handleFileChange} disabled={extracting} />
          </label>
          {extracting && <p className="mt-3 text-sm text-ink-700">Reading your screenshot…</p>}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      );
    }

    return (
      <div>
        <input type="file" accept={SCREENSHOT_ACCEPT} onChange={handleFileChange} disabled={extracting} />
        {extracting && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">Reading screenshot…</p>
        )}
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  const updateAccuracy = (index: number, value: string) => {
    onReviewChange(editAccuracy(review, index, value === "" ? undefined : Number(value)));
  };

  const toggleRowPriority = (index: number) => {
    onReviewChange(toggleTopPriority(review, index));
  };

  const removeReviewRow = (index: number) => {
    onReviewChange(removeRow(review, index));
  };

  const addReviewRow = () => {
    const type = missingTypes(review).find((missing) => missing === typeToAdd);
    if (!type) return;
    onReviewChange(addRow(review, type));
    setTypeToAdd("");
  };

  const isSample = review.extraction.source === "admin_sample";
  const indexed = reviewedRows(review).map((row, i) => ({ row, i }));
  const accuracyRows = indexed.filter(({ row }) => row.category === "regular");
  const priorityRows = indexed.filter(({ row }) => row.category === "restricted");
  const errorMessage = error && <p className="text-sm text-red-600">{error}</p>;

  const priorityItems = () => {
    return priorityRows.map(({ row, i }) => {
      const inputId = `priority-${i}`;
      return <li key={`${row.type}-${i}`} className="flex items-center gap-2"><input id={inputId} type="checkbox" checked={row.isTopPriority ?? false} onChange={() => toggleRowPriority(i)} className="size-4 accent-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600" /><label htmlFor={inputId} className="flex-1 text-sm text-ink-900">{row.type}</label><button type="button" onClick={() => removeReviewRow(i)} className="rounded p-1 text-ink-700 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600" aria-label={`Remove ${row.type}`}>✕</button></li>;
    });
  };

  const addTypeControl = (className: string) => {
    const label = isSample ? "Add a question type" : "Add a type the screenshot missed";
    return <div className={className}><select value={typeToAdd} onChange={(e) => setTypeToAdd(e.target.value)} aria-label={label} className="flex-1 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus-visible:border-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"><option value="">{label}…</option>{missingTypes(review).map((type) => <option key={type} value={type}>{type}</option>)}</select><button type="button" onClick={addReviewRow} disabled={!typeToAdd} className="rounded-md border border-ink-200 px-3 py-2 text-sm font-medium text-ink-900 hover:border-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:cursor-not-allowed disabled:opacity-50">Add</button></div>;
  };

  const approvalControls = (fieldsetClassName: string, legendClassName: string, wrapperClassName = "") => {
    return <div className={wrapperClassName}><fieldset className={fieldsetClassName}><legend className={legendClassName}>Confirm this snapshot</legend><div className="mt-3 space-y-3"><label className="flex items-start gap-2 text-sm text-ink-700"><input type="checkbox" checked={review.confirmation.extractedValuesMatch} onChange={(event) => onReviewChange(setStatement(review, "extractedValuesMatch", event.target.checked))} className="mt-0.5 size-4 accent-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600" /><span>{isSample ? "I reviewed and approved these sample values." : "I reviewed these values and they match my screenshot."}</span></label><label className="flex items-start gap-2 text-sm text-ink-700"><input type="checkbox" checked={review.confirmation.isLatestAnalytics} onChange={(event) => onReviewChange(setStatement(review, "isLatestAnalytics", event.target.checked))} className="mt-0.5 size-4 accent-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600" /><span>{isSample ? "Use this sample as my latest analytics." : "This screenshot contains my latest 7Sage analytics."}</span></label></div></fieldset></div>;
  };

  if (reviewPresentation === "full-width") {
    return (
      <div className="flex flex-col gap-6">
        <section>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="border-b border-ink-200 text-xs font-medium uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="pb-3">Question type</th>
                  <th className="w-32 pb-3">Accuracy</th>
                  <th className="w-10 pb-3"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {accuracyRows.map(({ row, i }) => {
                  const inputId = `accuracy-${i}`;
                  return (
                    <tr key={`${row.type}-${i}`}>
                      <td className="py-4 pr-6 font-medium text-ink-900">{row.type}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-1">
                          <input
                            id={inputId}
                            type="number"
                            value={row.accuracy ?? ""}
                            onChange={(e) => updateAccuracy(i, e.target.value)}
                            placeholder="—"
                            aria-label={`${row.type} accuracy`}
                            className="w-20 rounded-md border border-ink-200 bg-white px-2 py-1.5 text-right text-sm font-semibold tabular-nums text-ink-900 placeholder:text-ink-500 focus-visible:border-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
                          />
                          <span className="text-sm font-medium text-ink-700">%</span>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <button type="button" onClick={() => removeReviewRow(i)} className="rounded p-1 text-ink-700 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600" aria-label={`Remove ${row.type}`}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {accuracyRows.length === 0 && <p className="mt-5 text-sm text-ink-700">No accuracy types were recognized from that screenshot.</p>}
        </section>

        <section className="border-t border-ink-200 pt-6">
          <fieldset>
            <legend className="text-base font-semibold text-ink-900">Priority flags</legend>
            <p className="mt-1 text-sm text-ink-700">Keep the flags that should influence this week&rsquo;s plan.</p>
            {priorityRows.length === 0 ? (
              <p className="mt-4 text-sm text-ink-700">No priority types were recognized from that screenshot.</p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">{priorityItems()}</ul>
            )}
          </fieldset>
        </section>

        {addTypeControl("flex max-w-xl items-center gap-2")}

        {approvalControls("", "text-base font-semibold text-ink-900", "border-t border-ink-200 pt-5")}
        {errorMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="grid overflow-hidden rounded-xl border border-ink-200 bg-white md:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="p-5 sm:p-6 md:border-r md:border-ink-200">
          <h3 className="text-base font-semibold text-ink-900">Accuracy by type</h3>
          <p className="mt-1 text-sm text-ink-700">Compare each percentage with the screenshot.</p>

          {accuracyRows.length === 0 ? (
            <p className="mt-6 text-sm text-ink-700">No accuracy types were recognized from that screenshot.</p>
          ) : (
            <ul className="mt-6 space-y-5">
              {accuracyRows.map(({ row, i }) => {
                const accuracy = typeof row.accuracy === "number" && Number.isFinite(row.accuracy)
                  ? Math.max(0, Math.min(100, row.accuracy))
                  : 0;
                const inputId = `accuracy-${i}`;

                return (
                  <li key={`${row.type}-${i}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <label htmlFor={inputId} className="block text-sm font-medium text-ink-900">
                        {row.type}
                      </label>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="h-full rounded-full bg-accent-600"
                          style={{ width: `${accuracy}%` }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <input
                          id={inputId}
                          type="number"
                          value={row.accuracy ?? ""}
                          onChange={(e) => updateAccuracy(i, e.target.value)}
                          placeholder="—"
                          className="w-20 rounded-md border border-ink-200 bg-white px-2 py-1.5 text-right text-sm font-semibold tabular-nums text-ink-900 placeholder:text-ink-500 focus-visible:border-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
                        />
                        <span className="text-sm font-medium text-ink-700">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeReviewRow(i)}
                        className="rounded p-1 text-ink-700 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
                        aria-label={`Remove ${row.type}`}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="bg-ink-25 p-5 sm:p-6">
          <h3 className="text-base font-semibold text-ink-900">Review checklist</h3>
          <ol className="mt-4 space-y-3 text-sm text-ink-700">
            <li>Compare the values against your screenshot.</li>
            <li>Confirm the priority flags.</li>
            <li>Confirm the snapshot before saving.</li>
          </ol>

          <div className="mt-6 border-t border-ink-200 pt-5">
            <h4 className="text-sm font-semibold text-ink-900">Priority flags</h4>
            {priorityRows.length === 0 ? (
              <p className="mt-3 text-sm text-ink-700">No priority types were recognized from that screenshot.</p>
            ) : (
              <ul className="mt-3 space-y-3">{priorityItems()}</ul>
            )}
          </div>
        </aside>
      </section>

      {addTypeControl("flex items-center gap-2")}
      {approvalControls("rounded-md border border-ink-100 p-3", "px-1 text-sm font-medium text-ink-900")}
      {errorMessage}
    </div>
  );
}
