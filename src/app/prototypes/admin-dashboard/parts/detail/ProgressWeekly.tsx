"use client";

import { useState } from "react";
import { cx } from "@/components/ui/classes";
import { byMonth, LR_TYPES, pct, shortDate, weekLabel, type Performance, type Snapshot } from "./history";
import { Chevron, MonthCard, PanelHeader, ROW, UNDER_COL, WEEK_COL, plural } from "./panel";
import { Change, FirstSnapshotNote, NoAnalytics } from "./progressParts";

const FIRST_TYPES = 8;

const LIST_HEAD = "pb-1 text-caption font-medium text-smoke";
const LIST_ROW = "flex justify-between gap-3 py-1 text-caption";

function UploadRow({ perf, index, open, toggle }: { perf: Performance; index: number; open: boolean; toggle: () => void }) {
  const snap = perf.snapshots[index]!;
  const before: Snapshot | undefined = perf.snapshots[index - 1];
  const score = perf.scores[index]!.score;
  const scoreBefore = perf.scores[index - 1]?.score;
  const test = perf.tests.find((t) => t.week === snap.week);
  const weakest = LR_TYPES.toSorted((a, b) => snap.lr[a]! - snap.lr[b]!);
  const moved = before ? LR_TYPES.map((t) => ({ t, d: snap.lr[t]! - before.lr[t]! })).toSorted((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 2) : [];
  const [allTypes, setAllTypes] = useState(false);
  const tag = index === perf.snapshots.length - 1 ? "Newest" : index === 0 ? "First upload" : null;
  return (
    <li className="border-t border-vellum-line">
      <button type="button" aria-expanded={open} onClick={toggle} className={cx(ROW, "grid grid-cols-[minmax(0,1fr)_16px] items-start gap-x-4 gap-y-2 py-3.5", WEEK_COL)}>
        <span className="flex items-baseline gap-2 sm:flex-col sm:gap-0.5">
          <span className="text-small text-ink">{weekLabel(snap.week)}</span>
          {tag && <span className="text-caption text-smoke">{tag}</span>}
        </span>
        <span className="col-start-1 flex min-w-0 flex-col gap-1 sm:col-start-2 sm:row-start-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small">
            <span><span className="text-smoke">Score</span> <span className="font-medium text-ink tabular-nums">{score}</span></span>
            {scoreBefore !== undefined && <Change value={(score - scoreBefore) / 100} className="text-caption" />}
            {test && <span className="rounded-pill bg-vellum px-2 py-0.5 text-caption text-ink">PT {test.prepTest} · {test.missed} missed</span>}
          </span>
          <span className="text-caption text-smoke">Weakest: {weakest.slice(0, 3).map((t) => `${t} ${pct(snap.lr[t]!)}`).join(" · ")}</span>
          {moved.length > 0 && <span className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-smoke">Moved most: {moved.map((m) => <span key={m.t} className="inline-flex items-center gap-1">{m.t} <Change value={m.d} /></span>)}</span>}
        </span>
        <span className="col-start-2 row-start-1 pt-0.5 sm:col-start-3"><Chevron open={open} /></span>
      </button>
      {open && (
        <div className={cx("grid gap-x-8 gap-y-4 px-4 pb-5 sm:grid-cols-2 sm:pr-5", UNDER_COL)}>
          <dl className="flex flex-col">
            <dt className={LIST_HEAD}>LR, weakest first</dt>
            {(allTypes ? weakest : weakest.slice(0, FIRST_TYPES)).map((t) => <dd key={t} className={LIST_ROW}><span className="min-w-0 text-ink">{t}</span><span className="flex shrink-0 gap-2 tabular-nums"><span className="text-ink">{pct(snap.lr[t]!)}</span><Change value={before ? snap.lr[t]! - before.lr[t]! : null} className="w-9 justify-end" /></span></dd>)}
            {weakest.length > FIRST_TYPES && (
              <dd><button type="button" onClick={() => setAllTypes((a) => !a)} className="mt-1 min-h-8 text-small font-medium text-accent">{allTypes ? `Show the weakest ${FIRST_TYPES}` : `Show all ${weakest.length} types`}</button></dd>
            )}
          </dl>
          <div className="flex flex-col gap-4">
            <dl className="flex flex-col">
              <dt className={LIST_HEAD}>RC</dt>
              {Object.keys(snap.rc).length === 0 ? <dd className="text-caption text-smoke">No RC passage types in this snapshot.</dd> : Object.entries(snap.rc).map(([t, v]) => <dd key={t} className={LIST_ROW}><span className="text-ink">{t}</span><span className="text-ink tabular-nums">{pct(v!)}</span></dd>)}
            </dl>
            {test && (
              <dl className="flex flex-col">
                <dt className={LIST_HEAD}>PT {test.prepTest} missed</dt>
                {test.missedTypes.map(([t, n]) => <dd key={t} className={LIST_ROW}><span className="min-w-0 text-ink">{t}</span><span className="text-ink tabular-nums">{n}</span></dd>)}
              </dl>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function ProgressWeekly({ perf }: { perf: Performance }) {
  const newest = perf.snapshots.length - 1;
  const [open, setOpen] = useState<number | null>(newest);
  if (perf.snapshots.length === 0) return <div className="flex flex-col gap-5"><PanelHeader title="Progress" /><NoAnalytics /></div>;
  const first = perf.scores[0]!;
  const last = perf.scores.at(-1)!;
  const indexes = perf.snapshots.map((_, i) => newest - i);
  return (
    <div className="flex flex-col gap-5">
      <PanelHeader title={`Score ${last.score}`}
        aside={<>goal <span className="font-medium text-ink tabular-nums">{perf.goal}</span>{newest > 0 && <> · {last.score > first.score ? "+" : last.score < first.score ? "−" : "±"}{Math.abs(last.score - first.score)} since {shortDate(first.week)}</>} · {plural(perf.snapshots.length, "upload")}</>}>
        <FirstSnapshotNote perf={perf} />
      </PanelHeader>
      {byMonth(indexes, (i) => perf.snapshots[i]!.week).map(({ month, items }) => (
        <MonthCard key={month} title={month} count={plural(items.length, "upload")}>
          {items.map((i) => <UploadRow key={i} perf={perf} index={i} open={open === i} toggle={() => setOpen(open === i ? null : i)} />)}
        </MonthCard>
      ))}
    </div>
  );
}
