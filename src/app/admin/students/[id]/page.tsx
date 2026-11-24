import { notFound } from "next/navigation";
import { requireAdmin } from "../../requireAdmin";
import { PageArrival } from "@/components/PagePlaceholder";
import { PageCue } from "@/components/SiteMotion";
import { PAGE_COLUMN, cx } from "@/components/ui/classes";
import { localDateInTimezone } from "@/lib/currentWeeklySchedule";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { studentFacts } from "@/lib/studentFacts";
import { displayName, listQuery, listStateFrom } from "@/lib/studentList";
import { initialsFor } from "@/lib/studentNav";
import { loadStudentView } from "@/lib/studentView";
import PastWeekView from "@/app/progress/PastWeekView";
import { PastWeeksPanel } from "./HistoryPanels";
import { ProgressPanel } from "./ProgressPanel";
import { SettingsPanel } from "./SettingsPanel";
import { StudentDetail } from "./StudentDetail";
import { ThisWeekPanel } from "./ThisWeekPanel";

export default async function AdminStudentPage({ params, searchParams }: PageProps<"/admin/students/[id]">) {
  await requireAdmin();

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const now = new Date();
  const view = await loadStudentView(id, now, typeof query.pastWeek === "string" ? query.pastWeek : undefined);
  if (!view) notFound();
  const { student, pastWeeks } = view;

  const weeksLink = new URLSearchParams(listQuery(listStateFrom(query)));
  weeksLink.set("tab", "weeks");
  const weekLinks = { all: `/admin/students/${id}?${weeksLink}`, weekPrefix: `/admin/students/${id}?${weeksLink}&pastWeek=` };
  const name = displayName(student);
  const today = localDateInTimezone(now, SCHEDULE_TIMEZONE);

  return (
    <div data-page-fade className={cx(PAGE_COLUMN, "pt-6 pb-12 md:pt-10")}>
      <PageCue page="admin" />
      <PageArrival page={name ?? student.email} />
      <StudentDetail
        student={{ id: student.id, initials: initialsFor(name, student.email), name, email: student.email, plan: view.plan, needsAnalytics: view.needsAnalytics }}
        facts={studentFacts({ ...student, pastWeeks: pastWeeks.count, needsAnalytics: view.needsAnalytics }, now)}
        panels={{
          week: <ThisWeekPanel week={view.thisWeek} today={today} />,
          weeks: pastWeeks.route.kind === "week"
            ? <PastWeekView {...pastWeeks.route} links={weekLinks} place="panel" />
            : <PastWeeksPanel months={pastWeeks.months} weekPrefix={weekLinks.weekPrefix} />,
          progress: <ProgressPanel months={view.uploads} score={student.currentScore} goal={student.goalScore} hasPastWeeks={pastWeeks.count > 0} />,
          settings: <SettingsPanel settings={student} officialAttempts={student.officialAttempts} today={today} />,
        }}
      />
    </div>
  );
}
