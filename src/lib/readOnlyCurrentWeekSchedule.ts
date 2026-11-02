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

  if (isUploadWeekend(input.now(), input.timezone)) {
    const nextWeekStartDate = isoDateInWeek(weekStartDate, 7);
    if (await input.weeklySchedules.findByStudentAndWeek(input.studentId, nextWeekStartDate)) {
      return { kind: "next_week_preview", weekStartDate: nextWeekStartDate };
    }
  }

  const snapshots = approvedForWeek(
    await input.snapshots.listEligibleForStudent(input.studentId),
    weekStartDate,
    input.timezone
  );
  return snapshots.length === 0 ? { kind: "analytics_required" } : { kind: "schedule_not_created" };
}

const previewStartDate = new Intl.DateTimeFormat("en-US", {
  weekday: "long", month: "short", day: "numeric", timeZone: "UTC",
});

export function adminScheduleStateMessage(result: Exclude<ReadOnlyCurrentWeekResult, { kind: "schedule" }>) {
  switch (result.kind) {
    case "next_week_preview":
      return `This student has saved their plan for next week. It starts ${previewStartDate.format(new Date(`${result.weekStartDate}T00:00:00.000Z`))}.`;
    case "analytics_required":
      return "This student needs confirmed, eligible analytics before a current weekly schedule can be created.";
    case "schedule_not_created":
      return "No saved schedule exists for the current week. The student must open their dashboard to create it.";
  }
}
