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

export type PastWeekLinks = { all: string; weekPrefix: string };

const PLACES = {
  page: { Title: "h1", header: WEEK_HEADER, row: WEEK_HEADER_ROW, title: "text-h3 font-medium text-ink outline-none md:text-h2", padding: WEEK_CONTENT },
  panel: { Title: "h2", header: "flex flex-col", row: "mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6", title: "text-h4 font-semibold text-ink outline-none", padding: "pt-5" },
} as const;

function PagerLink({ week, href, direction }: { week: PastWeek; href: string; direction: "older" | "newer" }) {
  return (
    <div className={cx("flex flex-col gap-1", direction === "newer" && "ml-auto items-end text-right")}>
      <Link href={href} className={TEXT_LINK}>{direction === "older" ? "← Older week" : "Newer week →"}</Link>
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
  links = { all: "/progress", weekPrefix: "/progress?week=" },
  place = "page",
}: {
  schedule: Pick<PersistedWeeklySchedule, "id" | "schedule"> & { generationInputs: Pick<PersistedWeeklySchedule["generationInputs"], "student"> };
  checkIns: ActivityCheckIn[];
  week: PastWeek;
  older?: PastWeek;
  newer?: PastWeek;
  links?: PastWeekLinks;
  place?: keyof typeof PLACES;
}) {
  const layout = PLACES[place];
  const weekHref = (to: PastWeek) => `${links.weekPrefix}${to.weekStartDate}`;
  const pillClass = "ease-standard! max-sm:h-11 max-sm:flex-1";
  const header = (
    <header className={layout.header}>
      <Link href={links.all} className={cx(TEXT_LINK, "w-fit")}>← All weeks</Link>
      <div className={layout.row}>
        <div className={WEEK_TITLE_BLOCK}>
          <p className="flex items-center gap-3 text-small text-smoke">
            <span className="rounded-pill border border-vellum-line bg-vellum px-2.5 py-0.5 text-caption text-ink">Past week</span>
            {week.done} of {week.total} done
          </p>
          <layout.Title tabIndex={-1} className={layout.title}>Week of {monthDay.format(new Date(`${week.weekStartDate}T00:00:00.000Z`))}</layout.Title>
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
      {older && <PagerLink week={older} href={weekHref(older)} direction="older" />}
      {newer && <PagerLink week={newer} href={weekHref(newer)} direction="newer" />}
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
      padding={layout.padding}
    />
  );
}
