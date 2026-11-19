"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { FOCUS, cx } from "@/components/ui/classes";
import { planStatusLabel } from "@/lib/planStatus";
import type { Fact } from "@/lib/studentFacts";
import { listQuery, listStateFrom, type PlanKind } from "@/lib/studentList";
import { Badge, PRESS } from "../../StudentsLedger";
import { DETAIL_CARD } from "./ThisWeekPanel";

const TABS = [
  { key: "week", label: "This week" },
  { key: "weeks", label: "Past weeks" },
  { key: "progress", label: "Progress" },
  { key: "settings", label: "Settings & tests", short: "Settings" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const tabIn = (link: URLSearchParams): Tab => TABS.find((tab) => tab.key === link.get("tab"))?.key ?? "week";

const MOVE: Record<string, (index: number) => number> = {
  ArrowRight: (index) => (index + 1) % TABS.length,
  ArrowLeft: (index) => (index - 1 + TABS.length) % TABS.length,
  Home: () => 0,
  End: () => TABS.length - 1,
};

function showTab(tab: Tab) {
  const link = new URLSearchParams(window.location.search);
  if (tab === "week") link.delete("tab");
  else link.set("tab", tab);
  const query = link.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

export function AllStudentsLink({ className }: { className?: string }) {
  const list = listStateFrom(Object.fromEntries(useSearchParams()));
  return (
    <Link href={`/admin${listQuery(list)}`} className={cx("-my-1 flex min-h-8 w-fit items-center rounded-sm text-small font-medium", FOCUS, className)}>
      ← All students
    </Link>
  );
}

export type DetailStudent = { id: string; initials: string; name: string | null; email: string; plan: PlanKind; needsAnalytics: boolean };

function FactsCard({ student, facts }: { student: DetailStudent; facts: Fact[] }) {
  return (
    <section data-page-section aria-label="Student" className={cx(DETAIL_CARD, "flex flex-col gap-5 p-5 md:p-6")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-ink text-body font-semibold text-chalk">{student.initials}</span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h1 className={cx("text-h4 font-semibold [overflow-wrap:anywhere]", student.name ? "text-ink" : "text-smoke italic")}>{student.name ?? "No name"}</h1>
            <p className="text-small [overflow-wrap:anywhere] text-smoke">{student.email}</p>
            <div className="flex flex-wrap items-center gap-2">
              {student.needsAnalytics && <Badge tone="accent">Needs analytics</Badge>}
              <Badge>{planStatusLabel({ kind: student.plan })}</Badge>
              <span className="inline-flex shrink-0 items-center rounded-pill border border-vellum-line px-2 py-0.5 text-caption whitespace-nowrap text-smoke">Read only</span>
            </div>
          </div>
        </div>
        <Link href={`/admin/lab?student=${encodeURIComponent(student.id)}`}
          className={cx("flex h-10 shrink-0 items-center justify-center rounded-pill bg-ink px-[18px] text-small font-medium whitespace-nowrap text-chalk pointer-hover:hover:bg-accent max-sm:w-full", PRESS, FOCUS)}>
          Open in lab
        </Link>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-vellum-line pt-5 sm:grid-cols-3 lg:grid-cols-5">
        {facts.map((fact) => (
          <div key={fact.label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-caption text-smoke">{fact.label}</dt>
            <dd className={cx("text-small tabular-nums", fact.muted ? "text-smoke" : "font-medium text-ink")}>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function StudentDetail({ student, facts, panels }: { student: DetailStudent; facts: Fact[]; panels: Record<Tab, ReactNode> }) {
  const tab = tabIn(useSearchParams());
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const move = MOVE[event.key];
    if (!move) return;
    event.preventDefault();
    const next = move(TABS.findIndex((t) => t.key === tabIn(new URLSearchParams(window.location.search))));
    showTab(TABS[next]!.key);
    buttons.current[next]?.focus();
  };
  return (
    <div className="flex flex-col gap-6">
      <AllStudentsLink className="text-smoke pointer-hover:hover:text-ink" />
      <FactsCard student={student} facts={facts} />
      <section data-page-section aria-label="Student history" className="flex flex-col gap-5">
        <div role="tablist" aria-label="Student history" onKeyDown={onKeyDown} className="flex gap-1 overflow-x-auto border-b border-vellum-line [scrollbar-width:none] max-[359px]:gap-2">
          {TABS.map((t, index) => (
            <button key={t.key} ref={(button) => { buttons.current[index] = button; }} id={`${id}-${t.key}`} role="tab" type="button"
              aria-selected={tab === t.key} aria-controls={`${id}-panel`} tabIndex={tab === t.key ? 0 : -1} onClick={() => showTab(t.key)}
              className={cx("relative h-11 shrink-0 rounded-md px-3 text-small whitespace-nowrap outline-offset-[-3px] after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-pill max-[359px]:flex-1 max-[359px]:px-0 max-[359px]:after:inset-x-0", PRESS,
                tab === t.key ? "font-medium text-ink after:bg-ink" : "text-smoke pointer-hover:hover:text-ink")}>
              {"short" in t ? <><span aria-hidden className="sm:hidden">{t.short}</span><span className="max-sm:sr-only">{t.label}</span></> : t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${tab}`} tabIndex={0} key={tab}
          className="animate-[value-in_var(--duration-fast)_var(--ease-out-strong)_both] rounded-md outline-offset-4">
          {panels[tab]}
        </div>
      </section>
    </div>
  );
}
