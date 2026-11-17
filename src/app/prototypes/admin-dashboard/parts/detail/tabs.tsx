"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import ScheduleCheckInView from "@/components/ScheduleCheckInView";
import { cx } from "@/components/ui/classes";
import { PRESS } from "../chrome";
import type { DetailTab } from "../../view";
import type { Student } from "../data";
import { CARD } from "../students/controls";
import type { Detail } from "./data";
import { pastWeeksFor, pastWeekSchedule, performanceFor, shortDate, type PastWeek } from "./history";
import { ProgressWeekly } from "./ProgressWeekly";
import { SettingsTab } from "./SettingsTab";
import { settingsFor } from "./settings";
import { Chevron, MonthCard, PanelHeader, ROW, plural } from "./panel";

export type Tab = DetailTab;
const TABS: { key: Tab; label: string; short?: string }[] = [{ key: "week", label: "This week" }, { key: "weeks", label: "Past weeks" }, { key: "progress", label: "Progress" }, { key: "settings", label: "Settings & tests", short: "Settings" }];
const MOVE: Record<string, (i: number) => number> = {
  ArrowRight: (i) => (i + 1) % TABS.length,
  ArrowLeft: (i) => (i - 1 + TABS.length) % TABS.length,
  Home: () => 0,
  End: () => TABS.length - 1,
};

export function DetailTabs({ tab, setTab, student, detail, week }: { tab: Tab; setTab: (t: Tab) => void; student: Student; detail: Detail; week: ReactNode }) {
  const id = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const move = MOVE[e.key];
    if (!move) return;
    e.preventDefault();
    const next = move(TABS.findIndex((t) => t.key === tab));
    setTab(TABS[next]!.key);
    tabs.current[next]?.focus();
  };
  return (
    <section aria-label="Student history" className="flex flex-col gap-5">
      <div role="tablist" aria-label="Student history" onKeyDown={onKeyDown} className="flex gap-1 overflow-x-auto border-b max-[359px]:gap-2 border-vellum-line [scrollbar-width:none]">
        {TABS.map((t, i) => (
          <button key={t.key} ref={(el) => { tabs.current[i] = el; }} id={`${id}-${t.key}`} role="tab" type="button" aria-selected={tab === t.key} aria-controls={`${id}-panel`} tabIndex={tab === t.key ? 0 : -1} onClick={() => setTab(t.key)}
            className={cx("relative h-11 shrink-0 rounded-md px-3 outline-offset-[-3px] text-small whitespace-nowrap after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-pill max-[359px]:flex-1 max-[359px]:px-0 max-[359px]:after:inset-x-0",
              tab === t.key ? "font-medium text-ink after:bg-ink" : "text-smoke pointer-hover:hover:text-ink")}>
            {t.short ? <><span className="sm:hidden">{t.short}</span><span className="max-sm:hidden">{t.label}</span></> : t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${tab}`} tabIndex={0} key={tab} className="page-in rounded-md outline-offset-4">
        {tab === "week" && week}
        {tab === "weeks" && <WeeksTab student={student} detail={detail} />}
        {tab === "progress" && <ProgressWeekly perf={performanceFor(student, detail)} />}
        {tab === "settings" && <SettingsTab settings={settingsFor(student, detail)} />}
      </div>
    </section>
  );
}

export function NoPastWeeks() {
  return (
    <div className={cx(CARD, "flex flex-col gap-1 px-5 py-8 sm:px-6")}>
      <p className="text-small font-medium text-ink">No past weeks yet.</p>
      <p className="text-small text-smoke">Each week shows up here after it ends.</p>
    </div>
  );
}

function WeeksTab({ student, detail }: { student: Student; detail: Detail }) {
  const months = pastWeeksFor(student);
  const all = months.flatMap((m) => m.weeks);
  const [open, setOpen] = useState<string | null>(null);
  if (all.length === 0) return <div className="flex flex-col gap-5"><PanelHeader title="Past weeks" /><NoPastWeeks /></div>;
  const index = all.findIndex((w) => w.start === open);
  if (index >= 0) return <PastWeekView week={all[index]!} older={all[index + 1]} newer={all[index - 1]} student={student} detail={detail} go={setOpen} />;
  const done = all.reduce((n, w) => n + w.done, 0);
  const total = all.reduce((n, w) => n + w.total, 0);
  return (
    <div className="flex flex-col gap-5">
      <PanelHeader title="Past weeks" aside={<><span className="font-medium text-ink tabular-nums">{done} of {total}</span> done · {plural(all.length, "week")}</>} />
      {months.map(({ month, weeks }) => (
        <MonthCard key={month} title={month} count={plural(weeks.length, "week")}>
          {weeks.map((w) => (
            <li key={w.start} className="border-t border-vellum-line">
              <button type="button" onClick={() => setOpen(w.start)}
                className={cx(ROW, "grid min-h-14 grid-cols-[1fr_auto_16px] items-center gap-x-3 gap-y-2 py-3 [grid-template-areas:'dates_count_chevron'_'bar_bar_chevron'] sm:grid-cols-[150px_minmax(0,240px)_1fr_16px] sm:gap-4 sm:py-0 sm:[grid-template-areas:'dates_bar_count_chevron']")}>
                <span className="text-small text-ink [grid-area:dates]">{w.label}</span>
                <span aria-hidden className="h-1 overflow-hidden rounded-pill bg-vellum-line [grid-area:bar]"><span className="block h-full rounded-pill bg-accent" style={{ width: `${(w.done / w.total) * 100}%` }} /></span>
                <span className="justify-self-end text-caption text-smoke tabular-nums [grid-area:count]">{w.done} of {w.total} done</span>
                <span className="justify-self-end [grid-area:chevron]"><Chevron /></span>
              </button>
            </li>
          ))}
        </MonthCard>
      ))}
    </div>
  );
}

function PastWeekView({ week, older, newer, student, detail, go }: { week: PastWeek; older?: PastWeek; newer?: PastWeek; student: Student; detail: Detail; go: (start: string | null) => void }) {
  const live = pastWeekSchedule(student, detail, week);
  const pill = cx("flex h-10 items-center rounded-pill border border-vellum-line bg-paper px-4 text-small font-medium text-ink shadow-control pointer-hover:hover:bg-vellum max-sm:flex-1 max-sm:justify-center", PRESS);
  const header = (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => go(null)} className="-my-1 min-h-8 w-fit text-small font-medium text-accent">← All weeks</button>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-3 text-small text-smoke"><span className="rounded-pill border border-vellum-line bg-vellum px-2.5 py-0.5 text-caption text-ink">Past week</span>{week.done} of {week.total} done</p>
          <h2 className="text-h4 font-semibold text-ink">Week of {shortDate(week.start)}</h2>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          {older && <button type="button" onClick={() => go(older.start)} className={pill}>← Older week</button>}
          {newer && <button type="button" onClick={() => go(newer.start)} className={pill}>Newer week →</button>}
        </div>
      </div>
    </div>
  );
  return <ScheduleCheckInView key={week.start} scheduleId={`past-${week.start}`} schedule={live.schedule} student={live.student} checkIns={live.checkIns} readOnly header={header} padding="pt-5" />;
}
