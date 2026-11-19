import { PageArrival } from "@/components/PagePlaceholder";
import { PageCue } from "@/components/SiteMotion";
import { PAGE_COLUMN, cx } from "@/components/ui/classes";
import { localDateInTimezone } from "@/lib/currentWeeklySchedule";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { listTestMonthsWithStudents } from "@/lib/testMonthRepository";
import { requireAdmin } from "../requireAdmin";
import { TestDates } from "./TestDates";

export default async function TestDatesPage() {
  await requireAdmin();
  const today = localDateInTimezone(new Date(), SCHEDULE_TIMEZONE);
  return (
    <div data-page-fade className={cx(PAGE_COLUMN, "pt-6 pb-12 md:pt-10")}>
      <PageCue page="admin" />
      <PageArrival page="Test dates" />
      <TestDates months={await listTestMonthsWithStudents()} today={today} />
    </div>
  );
}
