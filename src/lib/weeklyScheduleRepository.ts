import { listApprovedAnalyticsSnapshots } from "./analyticsSnapshotRepository";
import type { CurrentWeekRepositories } from "./currentWeeklySchedule";
import { WeeklyScheduleModel } from "@/models/WeeklySchedule";
import { mongooseActivityCheckIns } from "./activityCheckInRepository";
import type { ApprovedAnalyticsSnapshot, PersistedWeeklySchedule } from "./types";

interface StoredWeeklySchedule {
  _id: unknown;
  studentId: unknown;
  weekStartDate: string;
  generatedAt: Date;
  schedule: PersistedWeeklySchedule["schedule"];
  sourceSnapshotIds: unknown[];
  generationInputs: PersistedWeeklySchedule["generationInputs"];
  policyVersion: string;
}

export function persistedWeeklySchedule(record: StoredWeeklySchedule): PersistedWeeklySchedule {
  return {
    id: String(record._id),
    studentId: String(record.studentId),
    weekStartDate: record.weekStartDate,
    generatedAt: record.generatedAt.toISOString(),
    schedule: record.schedule,
    sourceSnapshotIds: record.sourceSnapshotIds.map(String),
    generationInputs: record.generationInputs,
    policyVersion: record.policyVersion,
  };
}

export const mongooseCurrentWeekRepositories: CurrentWeekRepositories = {
  snapshots: {
    async listEligibleForStudent(studentId) {
      const snapshots = await listApprovedAnalyticsSnapshots(studentId);
      return snapshots.flatMap((snapshot): ApprovedAnalyticsSnapshot[] => {
        if (!snapshot.approvedAt) return [];
        return [{
          id: String(snapshot._id),
          weekOf: snapshot.weekOf,
          approvedAt: snapshot.approvedAt.toISOString(),
          lrAccuracyByType: snapshot.lrAccuracyByType,
          lrTopPriorityLogicTypes: snapshot.lrTopPriorityLogicTypes,
        }];
      });
    },
  },
  weeklySchedules: {
    async findByStudentAndWeek(studentId, weekStartDate) {
      const record = await WeeklyScheduleModel.findOne({ studentId, weekStartDate }).lean();
      return record ? persistedWeeklySchedule(record) : null;
    },
    async listBeforeWeek(studentId, weekStartDate) {
      const records = await WeeklyScheduleModel.find({ studentId, weekStartDate: { $lt: weekStartDate } })
        .sort({ weekStartDate: -1 }).lean();
      return records.map(persistedWeeklySchedule);
    },
    async create(schedule) {
      const record = await WeeklyScheduleModel.create({
        studentId: schedule.studentId,
        weekStartDate: schedule.weekStartDate,
        generatedAt: new Date(schedule.generatedAt),
        schedule: schedule.schedule,
        sourceSnapshotIds: schedule.sourceSnapshotIds,
        generationInputs: schedule.generationInputs,
        policyVersion: schedule.policyVersion,
      });
      return persistedWeeklySchedule(record.toObject());
    },
  },
  activityCheckIns: mongooseActivityCheckIns,
};

export async function listWeeklySchedulesForStudent(studentId: string) {
  const records = await WeeklyScheduleModel.find({ studentId }).sort({ weekStartDate: -1 }).lean();
  return records.map(persistedWeeklySchedule);
}
