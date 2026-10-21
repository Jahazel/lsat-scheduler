"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import {
  addRow,
  editAccuracy,
  hasSection,
  lowestPassageType,
  missingTypes,
  readSection,
  removeRow,
  reviewedRows,
  SECTION_NAME,
  SECTIONS,
  setStatement,
  toggleTopPriority,
  type SnapshotReview,
} from "@/lib/analyticsReview";
import type { AnalyticsSection } from "@/lib/types";
import { checkScreenshot, extractScreenshot, SCREENSHOT_LIMITS, SCREENSHOT_MEDIA_TYPES } from "@/lib/screenshotUpload";
import SignInExpired from "./SignInExpired";
import { DropZone } from "./ui/DropZone";

const SCREENSHOT_ACCEPT = SCREENSHOT_MEDIA_TYPES.join(",");
const ACCURACY_INPUT = "w-20 rounded-sm border border-vellum-line bg-paper px-2 py-1.5 text-right text-small font-semibold tabular-nums text-ink placeholder:text-fog focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

interface AnalyticsReviewProps {
  review: SnapshotReview | null;
  onReviewChange: Dispatch<SetStateAction<SnapshotReview | null>>;
  reviewPresentation?: "default" | "full-width";
}

type UploadStatus = { extracting: boolean; error: string | null; signedOut: boolean };
const IDLE: UploadStatus = { extracting: false, error: null, signedOut: false };

const NO_ROWS: Record<AnalyticsSection, string> = {
  LR: "We found no LR question types in that screenshot. Choose your Logical Reasoning screenshot.",
  RC: "We found no passage types in that screenshot. Choose your Reading Comprehension screenshot.",
};

export default function AnalyticsReview({
  review,
  onReviewChange,
  reviewPresentation = "default",
}: AnalyticsReviewProps) {
  const [typeToAdd, setTypeToAdd] = useState("");
  const [uploads, setUploads] = useState<Record<AnalyticsSection, UploadStatus>>({ LR: IDLE, RC: IDLE });
  const setUpload = (section: AnalyticsSection, status: UploadStatus) => setUploads((current) => ({ ...current, [section]: status }));

  async function readFile(section: AnalyticsSection, file: File) {
    const rejection = checkScreenshot(file);
    if (rejection) {
      setUpload(section, { ...IDLE, error: rejection.message });
      return;
    }

    setUpload(section, { ...IDLE, extracting: true });
    const reply = await extractScreenshot(file, section);

    switch (reply.kind) {
      case "rows":
        if (reply.rows.length === 0) {
          setUpload(section, { ...IDLE, error: NO_ROWS[section] });
          break;
        }
        setUpload(section, IDLE);
        onReviewChange((current) => readSection(current, section, reply.rows, { source: "7sage_screenshot", extractedAt: new Date().toISOString() }));
        break;
      case "rejected":
        setUpload(section, { ...IDLE, error: reply.message });
        break;
      case "signed-out":
        setUpload(section, { ...IDLE, signedOut: true });
        break;
      case "cannot-read":
      case "connection-lost":
        setUpload(section, { ...IDLE, error: "Couldn't read that screenshot. Try again or a clearer image." });
        break;
    }
  }

  const missingSections = SECTIONS.filter((section) => !hasSection(review, section));
  const uploadControls = missingSections.length > 0 && (
    <div className="flex flex-col gap-4">
      {missingSections.map((section) => {
        const { extracting, error, signedOut } = uploads[section];
        return (
          <div key={section}>
            <DropZone label={`${SECTION_NAME[section]} screenshot`} accept={SCREENSHOT_ACCEPT} error={error ?? undefined} onFile={(file) => readFile(section, file)} />
            {extracting && <p className="mt-3 text-small text-smoke">Reading your {SECTION_NAME[section]} screenshot…</p>}
            {signedOut && <div className="mt-3"><SignInExpired /></div>}
          </div>
        );
      })}
      <p className="text-small text-smoke">{SCREENSHOT_LIMITS} each.</p>
    </div>
  );

  if (!review) return uploadControls;

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
  const passageRows = indexed.filter(({ row }) => row.category === "passage");
  const goesFirst = lowestPassageType(review);

  const passageBlock = passageRows.length > 0 && (
    <section>
      <h3 className="text-body font-semibold text-ink">Reading Comprehension</h3>
      <p className="mt-1 text-small text-smoke">Passage types · lowest goes first in your plan</p>
      <ul className="mt-3 divide-y divide-vellum-line border-y border-vellum-line">
        {passageRows.map(({ row, i }) => {
          const original = review.rows[i].original;
          return (
            <li key={row.type} className="flex min-h-11 items-center gap-3 py-1.5">
              <label htmlFor={`passage-${i}`} className="grow text-small font-medium text-ink">{row.type}</label>
              <span className="text-caption text-smoke">
                {row.type === goesFirst ? <span className="text-small text-accent">Goes first</span> : original === null ? "not found" : null}
              </span>
              <span className="flex items-center gap-1">
                <input
                  id={`passage-${i}`}
                  type="number"
                  value={row.accuracy ?? ""}
                  onChange={(e) => updateAccuracy(i, e.target.value)}
                  placeholder="—"
                  aria-label={`${row.type} passage accuracy`}
                  className={ACCURACY_INPUT}
                />
                <span className="text-small font-medium text-smoke">%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );


  const priorityItems = () => {
    return priorityRows.map(({ row, i }) => {
      const inputId = `priority-${i}`;
      return <li key={`${row.type}-${i}`} className="flex items-center gap-2"><input id={inputId} type="checkbox" checked={row.category === "restricted" && (row.isTopPriority ?? false)} onChange={() => toggleRowPriority(i)} className="size-4 accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" /><label htmlFor={inputId} className="flex-1 text-small text-ink">{row.type}</label><button type="button" onClick={() => removeReviewRow(i)} className="rounded p-1 text-smoke hover:text-danger-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" aria-label={`Remove ${row.type}`}>✕</button></li>;
    });
  };

  const addTypeControl = (className: string) => {
    const label = isSample ? "Add a question type" : "Add a type the screenshot missed";
    return <div className={className}><select value={typeToAdd} onChange={(e) => setTypeToAdd(e.target.value)} aria-label={label} className="flex-1 rounded-sm border border-vellum-line bg-paper px-3 py-2 text-small text-ink focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><option value="">{label}…</option>{missingTypes(review).map(({ type }) => <option key={type} value={type}>{type}</option>)}</select><button type="button" onClick={addReviewRow} disabled={!typeToAdd} className="rounded-sm border border-vellum-line px-3 py-2 text-small font-medium text-ink hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50">Add</button></div>;
  };

  const approvalControls = (fieldsetClassName: string, legendClassName: string, wrapperClassName = "") => {
    return <div className={wrapperClassName}><fieldset className={fieldsetClassName}><legend className={legendClassName}>Confirm this snapshot</legend><div className="mt-3 space-y-3"><label className="flex items-start gap-2 text-small text-smoke"><input type="checkbox" checked={review.confirmation.extractedValuesMatch} onChange={(event) => onReviewChange(setStatement(review, "extractedValuesMatch", event.target.checked))} className="mt-0.5 size-4 accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" /><span>{isSample ? "I reviewed and approved these sample values." : "I reviewed these values and they match my screenshots."}</span></label><label className="flex items-start gap-2 text-small text-smoke"><input type="checkbox" checked={review.confirmation.isLatestAnalytics} onChange={(event) => onReviewChange(setStatement(review, "isLatestAnalytics", event.target.checked))} className="mt-0.5 size-4 accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" /><span>{isSample ? "Use this sample as my latest analytics." : "These screenshots show my latest 7Sage analytics."}</span></label></div></fieldset></div>;
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
                            className={ACCURACY_INPUT}
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

        {uploadControls}
        {passageBlock && <div className="border-t border-vellum-line pt-6">{passageBlock}</div>}

        {approvalControls("", "text-body font-semibold text-ink", "border-t border-vellum-line pt-5")}
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
                          className={ACCURACY_INPUT}
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
      {uploadControls}
      {passageBlock}
      {approvalControls("rounded-sm border border-vellum-line p-3", "px-1 text-small font-medium text-ink")}
    </div>
  );
}
