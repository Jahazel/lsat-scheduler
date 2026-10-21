import { approvedForWeek, currentWeekInTimezone } from "./currentWeeklySchedule";
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

  const snapshots = approvedForWeek(
    await input.snapshots.listEligibleForStudent(input.studentId),
    weekStartDate,
    input.timezone
  );
  return snapshots.length === 0 ? { kind: "analytics_required" } : { kind: "schedule_not_created" };
}

export function adminScheduleStateMessage(result: Exclude<ReadOnlyCurrentWeekResult, { kind: "schedule" }>) {
  return result.kind === "analytics_required"
    ? "This student needs confirmed, eligible analytics before a current weekly schedule can be created."
    : "No saved schedule exists for the current week. The student must open their dashboard to create it.";
}
