"use client";

import { cx } from "@/components/ui/classes";
import { initials } from "../data";
import { CARD } from "../students/controls";
import { BackLink, Badges, LiveDays, OpenInLab, ReadOnly, displayName, facts, type DetailProps } from "./shared";
import { DetailTabs, type Tab } from "./tabs";

export function Facts({ student, detail, back, lab, tab, setTab }: DetailProps & { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <BackLink back={back} />
      <section aria-label="Student" className={cx(CARD, "flex flex-col gap-5 p-5 md:p-6")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-ink text-body font-semibold text-chalk">{initials(student)}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <h1 className={cx("text-h4 font-semibold break-words", student.name ? "text-ink" : "text-smoke italic")}>{displayName(student)}</h1>
              <p className="text-small [overflow-wrap:anywhere] text-smoke">{student.email}</p>
              <div className="flex flex-wrap items-center gap-2"><Badges student={student} /><ReadOnly /></div>
            </div>
          </div>
          <OpenInLab lab={lab} className="max-sm:w-full" />
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-vellum-line pt-5 sm:grid-cols-3 lg:grid-cols-5">
          {facts(student, detail).map((f) => (
            <div key={f.label} className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-caption text-smoke">{f.label}</dt>
              <dd className={cx("text-small tabular-nums", f.muted ? "text-smoke" : "font-medium text-ink")}>{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <DetailTabs tab={tab} setTab={setTab} student={student} detail={detail} week={<LiveDays detail={detail} scheduleId={`proto-${student.id}`} />} />
    </div>
  );
}

const SHAPE = "rounded bg-vellum-line";

export function FactsLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading student">
      <span className={cx(SHAPE, "h-4 w-24")} />
      <div className={cx(CARD, "flex flex-col gap-5 p-5 md:p-6")}>
        <div className="flex items-start gap-4">
          <span className="size-12 shrink-0 rounded-pill bg-vellum-line" />
          <div className="flex flex-1 flex-col gap-2 pt-1"><span className={cx(SHAPE, "h-5 w-44 max-w-full")} /><span className={cx(SHAPE, "h-3.5 w-56 max-w-full")} /><span className={cx(SHAPE, "h-5 w-32 rounded-pill")} /></div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-vellum-line pt-5 sm:grid-cols-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="flex flex-col gap-1.5"><span className={cx(SHAPE, "h-3 w-14")} /><span className={cx(SHAPE, "h-4 w-24")} /></div>)}
        </div>
      </div>
      <span className={cx(SHAPE, "h-6 w-48")} />
      {[0, 1].map((i) => (
        <div key={i} className={cx(CARD, "flex flex-col gap-3 p-5")}>
          <span className={cx(SHAPE, "h-4 w-32")} />
          {[0, 1, 2].map((j) => <span key={j} className={cx(SHAPE, "h-4 w-full max-w-md")} />)}
        </div>
      ))}
    </div>
  );
}
