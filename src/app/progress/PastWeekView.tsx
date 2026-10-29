"use client";

import Link from "next/link";
import ScheduleCheckInView from "@/components/ScheduleCheckInView";
import { ButtonLink } from "@/components/ui/Button";
import { HeaderNotes } from "@/components/ui/PageHeader";
import { FOCUS, cx } from "@/components/ui/classes";
import type { PastWeek } from "@/lib/progressHistory";
import { weekNotes } from "@/lib/scheduleCheckInSummary";
import type { ActivityCheckIn, PersistedWeeklySchedule } from "@/lib/types";

const TEXT_LINK = cx("rounded-xs text-small font-medium text-accent underline-offset-4 hover:underline", FOCUS);
const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const weekHref = (week: PastWeek) => `/progress?week=${week.weekStartDate}`;

function PagerLink({ week, direction }: { week: PastWeek; direction: "older" | "newer" }) {
  return (
    <div className={cx("flex flex-col gap-1", direction === "newer" && "ml-auto items-end text-right")}>
      <Link href={weekHref(week)} className={TEXT_LINK}>{direction === "older" ? "← Older week" : "Newer week →"}</Link>
      <p className="text-small text-smoke">
        <span>{week.label}</span>
        <span className="max-sm:hidden"> · </span>
        <span className="block sm:inline">{week.done} of {week.total} done</span>
      </p>
    </div>
  );
}

export default function PastWeekView({
  schedule,
  checkIns,
  week,
  older,
  newer,
}: {
  schedule: Pick<PersistedWeeklySchedule, "id" | "schedule"> & { generationInputs: Pick<PersistedWeeklySchedule["generationInputs"], "student"> };
  checkIns: ActivityCheckIn[];
  week: PastWeek;
  older?: PastWeek;
  newer?: PastWeek;
}) {
  const pillClass = "ease-[cubic-bezier(0.2,0,0,1)] max-sm:h-11 max-sm:flex-1";
  const header = (
    <header className="border-b border-vellum-line bg-paper px-5 pt-6 pb-6 md:px-8 md:pt-8 md:pb-10 lg:px-18">
      <Link href="/progress" className={TEXT_LINK}>← All weeks</Link>
      <div className="mt-4 flex flex-col gap-4 md:mt-6 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
        <div className="flex min-w-0 flex-col gap-2 md:gap-3">
          <p className="flex items-center gap-3 text-small text-smoke">
            <span className="rounded-pill border border-vellum-line bg-vellum px-2.5 py-0.5 text-caption text-ink">Past week</span>
            {week.done} of {week.total} done
          </p>
          <h1 className="text-h3 font-medium text-ink md:text-h2">Week of {monthDay.format(new Date(`${week.weekStartDate}T00:00:00.000Z`))}</h1>
          <HeaderNotes notes={weekNotes(schedule.schedule)} />
        </div>
        {(older || newer) && (
          <div className="flex shrink-0 gap-2">
            {older && <ButtonLink href={weekHref(older)} variant="outline" size="md" className={pillClass}>← Older week</ButtonLink>}
            {newer && <ButtonLink href={weekHref(newer)} variant="outline" size="md" className={pillClass}>Newer week →</ButtonLink>}
          </div>
        )}
      </div>
    </header>
  );
  const pager = (older || newer) && (
    <nav aria-label="Older and newer weeks" className="mt-4 flex justify-between gap-4 md:mt-6">
      {older && <PagerLink week={older} direction="older" />}
      {newer && <PagerLink week={newer} direction="newer" />}
    </nav>
  );
  return (
    <ScheduleCheckInView
      key={schedule.id}
      scheduleId={schedule.id}
      schedule={schedule.schedule}
      student={schedule.generationInputs.student}
      checkIns={checkIns}
      readOnly
      header={header}
      footer={pager}
      padding="px-4 pt-4 pb-10 md:px-8 md:pt-8 md:pb-18 lg:px-18 lg:pt-16"
    />
  );
}
