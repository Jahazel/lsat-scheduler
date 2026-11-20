import { requireAdmin } from "./requireAdmin";
import { PageCue } from "@/components/SiteMotion";
import { PageArrival } from "@/components/PagePlaceholder";
import { PAGE_COLUMN, cx } from "@/components/ui/classes";
import { localDateInTimezone } from "@/lib/currentWeeklySchedule";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { listStudentRows } from "@/lib/studentView";
import { upcomingTestMonths } from "@/lib/testMonthRepository";
import { StudentsLedger } from "./StudentsLedger";

export default async function AdminPage() {
  await requireAdmin();

  const now = new Date();
  const [rows, testMonths] = await Promise.all([
    listStudentRows(now),
    upcomingTestMonths(localDateInTimezone(now, SCHEDULE_TIMEZONE)),
  ]);

  return (
    <div data-page-fade className={cx(PAGE_COLUMN, "pt-6 pb-12 md:pt-10")}>
      <PageCue page="admin" />
      <PageArrival page="Students" />
      <StudentsLedger rows={rows} upcomingTestMonthCount={testMonths.length} />
    </div>
  );
}
