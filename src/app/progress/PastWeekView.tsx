"use client";

import Link from "next/link";
import ScheduleCheckInView from "@/components/ScheduleCheckInView";
import { ButtonLink } from "@/components/ui/Button";
import { HeaderNotes } from "@/components/ui/PageHeader";
import { FOCUS, cx } from "@/components/ui/classes";
import type { PastWeek } from "@/lib/progressHistory";
import { weekNotes } from "@/lib/scheduleCheckInSummary";
import type { ActivityCheckIn, PersistedWeeklySchedule } from "@/lib/types";
import { WEEK_CONTENT, WEEK_HEADER, WEEK_HEADER_ROW, WEEK_PAGER_BUTTONS, WEEK_TITLE_BLOCK } from "./pastWeekLayout";

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
  const pillClass = "ease-standard! max-sm:h-11 max-sm:flex-1";
  const header = (
    <header className={WEEK_HEADER}>
      <Link href="/progress" className={TEXT_LINK}>← All weeks</Link>
      <div className={WEEK_HEADER_ROW}>
        <div className={WEEK_TITLE_BLOCK}>
          <p className="flex items-center gap-3 text-small text-smoke">
            <span className="rounded-pill border border-vellum-line bg-vellum px-2.5 py-0.5 text-caption text-ink">Past week</span>
            {week.done} of {week.total} done
          </p>
          <h1 tabIndex={-1} className="text-h3 font-medium text-ink outline-none md:text-h2">Week of {monthDay.format(new Date(`${week.weekStartDate}T00:00:00.000Z`))}</h1>
          <HeaderNotes notes={weekNotes(schedule.schedule)} />
        </div>
        {(older || newer) && (
          <div className={WEEK_PAGER_BUTTONS}>
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
      padding={WEEK_CONTENT}
    />
  );
}
