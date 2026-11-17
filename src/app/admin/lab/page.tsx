import { PageArrival } from "@/components/PagePlaceholder";
import { PageCue } from "@/components/SiteMotion";
import { PAGE_COLUMN, cx } from "@/components/ui/classes";
import { listApprovedAnalyticsSnapshots } from "@/lib/analyticsSnapshotRepository";
import { analyticsTrend, currentWeekInTimezone, localDateInTimezone, newestApprovedSnapshots } from "@/lib/currentWeeklySchedule";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { copiedInputs, presetInputs, readLabLink, type CopiedStudent, type LabInputs } from "@/lib/scheduleLab";
import { displayName } from "@/lib/studentList";
import { findStudentWithOwner } from "@/lib/studentRepository";
import { requireAdmin } from "../requireAdmin";
import { ScheduleLab } from "./ScheduleLab";

async function copyStudent(id: string, thisWeek: string) {
  const record = await findStudentWithOwner(id);
  if (!record) return null;
  const snapshots = await listApprovedAnalyticsSnapshots(record.id);
  const [newest] = newestApprovedSnapshots(snapshots);
  const copied: CopiedStudent = {
    id: record.id,
    name: displayName(record) ?? record.email,
    uploadedOn: newest ? localDateInTimezone(new Date(newest.approvedAt), SCHEDULE_TIMEZONE) : null,
    trend: snapshots.length > 0 ? analyticsTrend(snapshots, thisWeek) : null,
  };
  return { record, copied };
}

type LabLink = Awaited<PageProps<"/admin/lab">["searchParams"]>;

async function labStart(link: LabLink, thisWeek: string)
  : Promise<{ inputs: LabInputs; copied: CopiedStudent | null }> {
  const steady = { inputs: presetInputs("steady", thisWeek), copied: null };
  if (typeof link.student === "string") {
    const found = await copyStudent(link.student, thisWeek);
    return found ? { inputs: copiedInputs(found.record, found.copied, thisWeek), copied: found.copied } : steady;
  }
  const inputs = typeof link.lab === "string" ? readLabLink(link.lab, thisWeek) : null;
  if (!inputs) return steady;
  if (inputs.copiedFrom === null) return { inputs, copied: null };
  const found = await copyStudent(inputs.copiedFrom, thisWeek);
  if (!found || (inputs.analytics.kind === "student" && !found.copied.trend)) return steady;
  return { inputs, copied: found.copied };
}

export default async function ScheduleLabPage({ searchParams }: PageProps<"/admin/lab">) {
  await requireAdmin();
  const thisWeek = currentWeekInTimezone(new Date(), SCHEDULE_TIMEZONE);
  const { inputs, copied } = await labStart(await searchParams, thisWeek);
  return (
    <div data-page-fade className={cx(PAGE_COLUMN, "pt-6 pb-12 md:pt-10")}>
      <PageCue page="admin" />
      <PageArrival page="Schedule lab" />
      <ScheduleLab thisWeek={thisWeek} start={inputs} copied={copied} />
    </div>
  );
}
