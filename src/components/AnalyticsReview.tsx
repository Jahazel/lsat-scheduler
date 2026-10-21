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
import { checkScreenshot, extractScreenshot, SCREENSHOT_LIMITS, SCREENSHOT_MEDIA_TYPES } from "@/lib/screenshotUpload";
import SignInExpired from "./SignInExpired";

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
  const [signedOut, setSignedOut] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSignedOut(false);
    const rejection = checkScreenshot(file);
    if (rejection) {
      setError(rejection.message);
      return;
    }

    setExtracting(true);
    const reply = await extractScreenshot(file);
    setExtracting(false);

    switch (reply.kind) {
      case "rows":
        onReviewChange(startReview(reply.rows, { source: "7sage_screenshot", extractedAt: new Date().toISOString() }));
        break;
      case "rejected":
        setError(reply.message);
        break;
      case "signed-out":
        setSignedOut(true);
        break;
      case "cannot-read":
      case "connection-lost":
        setError("Couldn't read that screenshot. Try again or a clearer image.");
        break;
    }
  }

  if (!review) {
    if (uploadPresentation === "guided") {
      return (
        <div>
          <label className="block cursor-pointer rounded-xs border border-dashed border-accent bg-accent/faint p-5 transition-colors duration-150 ease-out hover:bg-accent/tint focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50">
            <span className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper text-accent">
                <svg aria-hidden="true" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 16V4m0 0-4 4m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>
                <span className="block font-semibold text-ink">Choose a 7Sage analytics screenshot</span>
                <span className="mt-1 block text-small text-smoke">{SCREENSHOT_LIMITS}</span>
              </span>
            </span>
            <input className="sr-only" type="file" accept={SCREENSHOT_ACCEPT} onChange={handleFileChange} disabled={extracting} />
          </label>
          {extracting && <p className="mt-3 text-small text-smoke">Reading your screenshot…</p>}
          {error && <p className="mt-3 text-small text-danger-ink">{error}</p>}
          {signedOut && <div className="mt-3"><SignInExpired /></div>}
        </div>
      );
    }

    return (
      <div>
        <input type="file" accept={SCREENSHOT_ACCEPT} onChange={handleFileChange} disabled={extracting} />
        {extracting && (
          <p className="mt-2 text-small text-smoke ">Reading screenshot…</p>
        )}
        {error && <p className="mt-2 text-small text-danger-ink ">{error}</p>}
        {signedOut && <div className="mt-2"><SignInExpired /></div>}
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
    const type = missingTypes(review).find((missing) => missing.type === typeToAdd)?.type;
    if (!type) return;
    onReviewChange(addRow(review, type));
    setTypeToAdd("");
  };

  const isSample = review.extraction.source === "admin_sample";
  const indexed = reviewedRows(review).map((row, i) => ({ row, i }));
  const accuracyRows = indexed.filter(({ row }) => row.category === "regular");
  const priorityRows = indexed.filter(({ row }) => row.category === "restricted");
  const errorMessage = error && <p className="text-small text-danger-ink">{error}</p>;

  const priorityItems = () => {
    return priorityRows.map(({ row, i }) => {
      const inputId = `priority-${i}`;
      return <li key={`${row.type}-${i}`} className="flex items-center gap-2"><input id={inputId} type="checkbox" checked={row.isTopPriority ?? false} onChange={() => toggleRowPriority(i)} className="size-4 accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" /><label htmlFor={inputId} className="flex-1 text-small text-ink">{row.type}</label><button type="button" onClick={() => removeReviewRow(i)} className="rounded p-1 text-smoke hover:text-danger-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" aria-label={`Remove ${row.type}`}>✕</button></li>;
    });
  };

  const addTypeControl = (className: string) => {
    const label = isSample ? "Add a question type" : "Add a type the screenshot missed";
    return <div className={className}><select value={typeToAdd} onChange={(e) => setTypeToAdd(e.target.value)} aria-label={label} className="flex-1 rounded-sm border border-vellum-line bg-paper px-3 py-2 text-small text-ink focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><option value="">{label}…</option>{missingTypes(review).map(({ type }) => <option key={type} value={type}>{type}</option>)}</select><button type="button" onClick={addReviewRow} disabled={!typeToAdd} className="rounded-sm border border-vellum-line px-3 py-2 text-small font-medium text-ink hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50">Add</button></div>;
  };

  const approvalControls = (fieldsetClassName: string, legendClassName: string, wrapperClassName = "") => {
    return <div className={wrapperClassName}><fieldset className={fieldsetClassName}><legend className={legendClassName}>Confirm this snapshot</legend><div className="mt-3 space-y-3"><label className="flex items-start gap-2 text-small text-smoke"><input type="checkbox" checked={review.confirmation.extractedValuesMatch} onChange={(event) => onReviewChange(setStatement(review, "extractedValuesMatch", event.target.checked))} className="mt-0.5 size-4 accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" /><span>{isSample ? "I reviewed and approved these sample values." : "I reviewed these values and they match my screenshot."}</span></label><label className="flex items-start gap-2 text-small text-smoke"><input type="checkbox" checked={review.confirmation.isLatestAnalytics} onChange={(event) => onReviewChange(setStatement(review, "isLatestAnalytics", event.target.checked))} className="mt-0.5 size-4 accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" /><span>{isSample ? "Use this sample as my latest analytics." : "This screenshot contains my latest 7Sage analytics."}</span></label></div></fieldset></div>;
  };

  if (reviewPresentation === "full-width") {
    return (
      <div className="flex flex-col gap-6">
        <section>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-small">
              <thead className="border-b border-vellum-line text-label font-medium uppercase text-smoke">
                <tr>
                  <th className="pb-3">Question type</th>
                  <th className="w-32 pb-3">Accuracy</th>
                  <th className="w-10 pb-3"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vellum-line">
                {accuracyRows.map(({ row, i }) => {
                  const inputId = `accuracy-${i}`;
                  return (
                    <tr key={`${row.type}-${i}`}>
                      <td className="py-4 pr-6 font-medium text-ink">{row.type}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-1">
                          <input
                            id={inputId}
                            type="number"
                            value={row.accuracy ?? ""}
                            onChange={(e) => updateAccuracy(i, e.target.value)}
                            placeholder="—"
                            aria-label={`${row.type} accuracy`}
                            className="w-20 rounded-sm border border-vellum-line bg-paper px-2 py-1.5 text-right text-small font-semibold tabular-nums text-ink placeholder:text-fog focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                          />
                          <span className="text-small font-medium text-smoke">%</span>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <button type="button" onClick={() => removeReviewRow(i)} className="rounded p-1 text-smoke hover:text-danger-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" aria-label={`Remove ${row.type}`}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {accuracyRows.length === 0 && <p className="mt-5 text-small text-smoke">No accuracy types were recognized from that screenshot.</p>}
        </section>

        <section className="border-t border-vellum-line pt-6">
          <fieldset>
            <legend className="text-body font-semibold text-ink">Priority flags</legend>
            <p className="mt-1 text-small text-smoke">Keep the flags that should influence this week&rsquo;s plan.</p>
            {priorityRows.length === 0 ? (
              <p className="mt-4 text-small text-smoke">No priority types were recognized from that screenshot.</p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">{priorityItems()}</ul>
            )}
          </fieldset>
        </section>

        {addTypeControl("flex max-w-xl items-center gap-2")}

        {approvalControls("", "text-body font-semibold text-ink", "border-t border-vellum-line pt-5")}
        {errorMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="grid overflow-hidden rounded-md border border-vellum-line bg-paper md:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="p-5 sm:p-6 md:border-r md:border-vellum-line">
          <h3 className="text-body font-semibold text-ink">Accuracy by type</h3>
          <p className="mt-1 text-small text-smoke">Compare each percentage with the screenshot.</p>

          {accuracyRows.length === 0 ? (
            <p className="mt-6 text-small text-smoke">No accuracy types were recognized from that screenshot.</p>
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
                      <label htmlFor={inputId} className="block text-small font-medium text-ink">
                        {row.type}
                      </label>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-vellum-line">
                        <div
                          className="h-full rounded-full bg-accent"
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
                          className="w-20 rounded-sm border border-vellum-line bg-paper px-2 py-1.5 text-right text-small font-semibold tabular-nums text-ink placeholder:text-fog focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        />
                        <span className="text-small font-medium text-smoke">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeReviewRow(i)}
                        className="rounded p-1 text-smoke hover:text-danger-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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

        <aside className="bg-vellum p-5 sm:p-6">
          <h3 className="text-body font-semibold text-ink">Review checklist</h3>
          <ol className="mt-4 space-y-3 text-small text-smoke">
            <li>Compare the values against your screenshot.</li>
            <li>Confirm the priority flags.</li>
            <li>Confirm the snapshot before saving.</li>
          </ol>

          <div className="mt-6 border-t border-vellum-line pt-5">
            <h4 className="text-small font-semibold text-ink">Priority flags</h4>
            {priorityRows.length === 0 ? (
              <p className="mt-3 text-small text-smoke">No priority types were recognized from that screenshot.</p>
            ) : (
              <ul className="mt-3 space-y-3">{priorityItems()}</ul>
            )}
          </div>
        </aside>
      </section>

      {addTypeControl("flex items-center gap-2")}
      {approvalControls("rounded-sm border border-vellum-line p-3", "px-1 text-small font-medium text-ink")}
      {errorMessage}
    </div>
  );
}
