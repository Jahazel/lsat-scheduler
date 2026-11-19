"use client";

import { useState } from "react";
import { cx } from "@/components/ui/classes";
import type { Upload, UploadMonth } from "@/lib/uploadHistory";
import { Chevron, MonthCard, PanelHeader, ROW, plural } from "./HistoryPanels";
import { DETAIL_CARD } from "./ThisWeekPanel";

const FIRST_TYPES = 8;
const LIST_HEAD = "pb-1 text-caption font-medium text-smoke";
const LIST_ROW = "flex justify-between gap-3 py-1 text-caption";

const percent = (accuracy: number) => `${Math.round(accuracy * 100)}%`;
const accuracyPoints = (change: number | null) => change === null ? null : Math.round(change * 100);

function Change({ points, className }: { points: number | null; className?: string }) {
  if (points === null) return <span className={cx("text-fog", className)}>—</span>;
  const tone = points > 0 ? "text-success-ink" : points < 0 ? "text-danger-ink" : "text-smoke";
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap tabular-nums", tone, className)}>
      <span aria-hidden className="text-[10px]">{points > 0 ? "▲" : points < 0 ? "▼" : "•"}</span>
      {points > 0 ? "+" : points < 0 ? "−" : "±"}{Math.abs(points)}<span className="sr-only"> points</span>
    </span>
  );
}

function UploadRow({ upload, open, toggle }: { upload: Upload; open: boolean; toggle: () => void }) {
  const [allTypes, setAllTypes] = useState(false);
  const test = upload.practiceTest;
  return (
    <li className="border-t border-vellum-line">
      <button type="button" aria-expanded={open} onClick={toggle} className={cx(ROW, "grid grid-cols-[minmax(0,1fr)_16px] items-start gap-x-4 gap-y-2 py-3.5 sm:grid-cols-[150px_minmax(0,1fr)_16px]")}>
        <span className="flex items-baseline gap-2 sm:flex-col sm:gap-0.5">
          <span className="text-small text-ink">{upload.label}</span>
          {upload.tag && <span className="text-caption text-smoke">{upload.tag}</span>}
        </span>
        <span className="col-start-1 flex min-w-0 flex-col gap-1 sm:col-start-2 sm:row-start-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-small text-smoke">Score <span className="font-medium text-ink tabular-nums">{upload.score ?? "—"}</span></span>
            {upload.scoreChange !== null && <Change points={upload.scoreChange} className="text-caption" />}
            {test && <span className="w-fit rounded-pill bg-vellum px-2 py-0.5 text-caption text-ink">PT {test.prepTest} · {test.missed} missed</span>}
          </span>
          <span className="text-caption text-smoke">Weakest: {upload.lr.slice(0, 3).map((row) => `${row.type} ${percent(row.accuracy)}`).join(" · ")}</span>
          {upload.movedMost.length > 0 && (
            <span className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-smoke">
              Moved most: {upload.movedMost.map((row) => <span key={row.type} className="inline-flex items-center gap-1">{row.type} <Change points={accuracyPoints(row.change)} /></span>)}
            </span>
          )}
        </span>
        <span className="col-start-2 row-start-1 pt-0.5 sm:col-start-3"><Chevron open={open} /></span>
      </button>
      {open && (
        <div className="grid gap-x-8 gap-y-4 px-4 pb-5 sm:grid-cols-2 sm:pr-5 sm:pl-[calc(150px+1rem+1.25rem)]">
          <dl className="flex flex-col">
            <dt className={LIST_HEAD}>LR, weakest first</dt>
            {(allTypes ? upload.lr : upload.lr.slice(0, FIRST_TYPES)).map((row) => (
              <dd key={row.type} className={LIST_ROW}>
                <span className="min-w-0 text-ink">{row.type}</span>
                <span className="flex shrink-0 gap-2 tabular-nums"><span className="text-ink">{percent(row.accuracy)}</span><Change points={accuracyPoints(row.change)} className="w-9 justify-end" /></span>
              </dd>
            ))}
            {upload.lr.length > FIRST_TYPES && (
              <dd>
                <button type="button" onClick={() => setAllTypes(!allTypes)} className="mt-1 min-h-8 rounded-xs text-small font-medium text-accent">
                  {allTypes ? `Show the weakest ${FIRST_TYPES}` : `Show all ${upload.lr.length} types`}
                </button>
              </dd>
            )}
          </dl>
          <div className="flex flex-col gap-4">
            <dl className="flex flex-col">
              <dt className={LIST_HEAD}>RC</dt>
              {upload.rc.length === 0
                ? <dd className="text-caption text-smoke">No RC passage types in this snapshot.</dd>
                : upload.rc.map((row) => <dd key={row.type} className={LIST_ROW}><span className="text-ink">{row.type}</span><span className="text-ink tabular-nums">{percent(row.accuracy)}</span></dd>)}
            </dl>
            {test && test.missedTypes.length > 0 && (
              <dl className="flex flex-col">
                <dt className={LIST_HEAD}>PT {test.prepTest} missed</dt>
                {test.missedTypes.map(([type, count]) => <dd key={type} className={LIST_ROW}><span className="min-w-0 text-ink">{type}</span><span className="text-ink tabular-nums">{count}</span></dd>)}
              </dl>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function NoAnalytics() {
  return (
    <div className={cx(DETAIL_CARD, "flex flex-col gap-1 px-5 py-8 sm:px-6")}>
      <p className="text-small font-medium text-ink">No confirmed analytics on file.</p>
      <p className="max-w-prose text-small text-smoke">Progress shows after the student uploads their 7Sage analytics.</p>
    </div>
  );
}

export function ProgressPanel({ months, score, goal, hasPastWeeks }: { months: UploadMonth[]; score: number; goal: number; hasPastWeeks: boolean }) {
  const uploads = months.flatMap((month) => month.uploads);
  const [open, setOpen] = useState<string | null>(uploads[0]?.id ?? null);
  const firstWeekNote = !hasPastWeeks && (
    <p className="text-small text-smoke">No past weeks yet.{uploads.length === 1 && " Changes show after the next upload."}</p>
  );
  if (uploads.length === 0) return <div className="flex flex-col gap-5"><PanelHeader title="Progress">{firstWeekNote}</PanelHeader><NoAnalytics /></div>;
  return (
    <div className="flex flex-col gap-5">
      <PanelHeader title={`Score ${score}`} aside={<>goal <span className="font-medium text-ink tabular-nums">{goal}</span> · {plural(uploads.length, "upload")}</>}>
        {firstWeekNote}
      </PanelHeader>
      {months.map(({ month, uploads: monthUploads }) => (
        <MonthCard key={month} title={month} count={plural(monthUploads.length, "upload")}>
          {monthUploads.map((upload) => <UploadRow key={upload.id} upload={upload} open={open === upload.id} toggle={() => setOpen(open === upload.id ? null : upload.id)} />)}
        </MonthCard>
      ))}
    </div>
  );
}
