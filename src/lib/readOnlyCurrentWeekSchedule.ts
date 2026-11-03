import { approvedForWeek, currentWeekInTimezone, isUploadWeekend } from "./currentWeeklySchedule";
import { isoDateInWeek } from "./scheduleReasonText";
import type { ActivityCheckIn, ApprovedAnalyticsSnapshot, PersistedWeeklySchedule } from "./types";

interface ReadOnlyCurrentWeekRepositories {
  snapshots: {
    listEligibleForStudent(studentId: string): Promise<ApprovedAnalyticsSnapshot[]>;
  };
  weeklySchedules: {
    findByStudentAndWeek(studentId: string, weekStartDate: string): Promise<PersistedWeeklySchedule | null>;
  };
  activityCheckIns: {
    listForSchedule(scheduleId: string): Promise<ActivityCheckIn[]>;
  };
}

interface LoadReadOnlyCurrentWeekInput extends ReadOnlyCurrentWeekRepositories {
  studentId: string;
  timezone: string;
  now: () => Date;
}

export type ReadOnlyCurrentWeekResult =
  | { kind: "schedule"; schedule: PersistedWeeklySchedule; checkIns: ActivityCheckIn[] }
  | { kind: "next_week_preview"; weekStartDate: string }
  | { kind: "next_week_upload_confirmed"; weekStartDate: string }
  | { kind: "analytics_required" }
  | { kind: "schedule_not_created" };

// This read boundary intentionally has no create or save methods. Admin
// oversight can only show the same records already persisted for the student.
export async function loadReadOnlyCurrentWeek(input: LoadReadOnlyCurrentWeekInput): Promise<ReadOnlyCurrentWeekResult> {
  const weekStartDate = currentWeekInTimezone(input.now(), input.timezone);
  const schedule = await input.weeklySchedules.findByStudentAndWeek(input.studentId, weekStartDate);
  if (schedule) {
    return {
      kind: "schedule",
      schedule,
      checkIns: await input.activityCheckIns.listForSchedule(schedule.id),
    };
  }

  const uploadWeekend = isUploadWeekend(input.now(), input.timezone);
  const nextWeekStartDate = isoDateInWeek(weekStartDate, 7);
  if (uploadWeekend && await input.weeklySchedules.findByStudentAndWeek(input.studentId, nextWeekStartDate)) {
    return { kind: "next_week_preview", weekStartDate: nextWeekStartDate };
  }

  const snapshots = await input.snapshots.listEligibleForStudent(input.studentId);
  if (approvedForWeek(snapshots, weekStartDate, input.timezone).length > 0) return { kind: "schedule_not_created" };
  if (uploadWeekend && approvedForWeek(snapshots, nextWeekStartDate, input.timezone).length > 0) {
    return { kind: "next_week_upload_confirmed", weekStartDate: nextWeekStartDate };
  }
  return { kind: "analytics_required" };
}

const previewStartDate = new Intl.DateTimeFormat("en-US", {
  weekday: "long", month: "short", day: "numeric", timeZone: "UTC",
});

const formatWeekStart = (weekStartDate: string) => previewStartDate.format(new Date(`${weekStartDate}T00:00:00.000Z`));

export function adminScheduleStateMessage(result: Exclude<ReadOnlyCurrentWeekResult, { kind: "schedule" }>) {
  switch (result.kind) {
    case "next_week_preview":
      return `This student has saved their plan for next week. It starts ${formatWeekStart(result.weekStartDate)}.`;
    case "next_week_upload_confirmed":
      return `This student has confirmed their upload for next week, which starts ${formatWeekStart(result.weekStartDate)}. Their plan is saved when they open This week.`;
    case "analytics_required":
      return "This student needs confirmed, eligible analytics before a current weekly schedule can be created.";
    case "schedule_not_created":
      return "No saved schedule exists for the current week. The student must open their dashboard to create it.";
  }
}
