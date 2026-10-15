import mongoose from "mongoose";
import type { ClientSession } from "mongoose";
import { StudentModel } from "@/models/Student";
import { UserModel } from "@/models/User";
import { WeeklyScheduleModel } from "@/models/WeeklySchedule";
import { ActivityCheckInModel } from "@/models/ActivityCheckIn";
import { AnalyticsSnapshotModel } from "@/models/AnalyticsSnapshot";
import { listApprovedAnalyticsSnapshots } from "./analyticsSnapshotRepository";
import { postgresAdminClock } from "./studentClock";
import type { AdminTestRepositories } from "./adminTestWorkspace";

async function deleteSchedules(
  studentId: string,
  session: ClientSession,
  weekStartDate?: string,
) {
  const filter = { studentId, ...(weekStartDate ? { weekStartDate } : {}) };
  const schedules = await WeeklyScheduleModel.find(filter)
    .select("_id")
    .session(session)
    .lean();
  await ActivityCheckInModel.deleteMany(
    { scheduleId: { $in: schedules.map((s) => s._id) } },
    { session },
  );
  const result = await WeeklyScheduleModel.deleteMany(filter, { session });
  return result.deletedCount;
}

export const mongooseAdminTestRepositories: AdminTestRepositories = {
  clock: postgresAdminClock,
  async findStudent(userId) {
    const student = await StudentModel.findOne({ userId }).lean();
    return student
      ? { id: String(student._id), currentScore: student.currentScore }
      : null;
  },
  async approvedSnapshots(studentId) {
    const records = await listApprovedAnalyticsSnapshots(studentId);
    return records.map((record) => ({
      id: String(record._id),
      studentId,
      status: "approved" as const,
      approvedAt: record.approvedAt!.toISOString(),
      weekOf: record.weekOf,
      lrAccuracyByType: record.lrAccuracyByType,
      lrTopPriorityLogicTypes: record.lrTopPriorityLogicTypes,
      ...(record.extraction
        ? { extraction: { source: record.extraction.source } }
        : {}),
    }));
  },
  async inTransaction(work) {
    await mongoose.connection.transaction(async (session) => {
      await work({
        deleteSchedules: (studentId, weekStartDate) =>
          deleteSchedules(studentId, session, weekStartDate),
        async deleteSnapshots(studentId) {
          await AnalyticsSnapshotModel.deleteMany({ studentId }, { session });
        },
        async deleteStudent(studentId, userId) {
          await StudentModel.deleteOne({ _id: studentId, userId }, { session });
        },
        async clearSimulatedDate(userId) {
          await UserModel.updateOne(
            { _id: userId, role: "admin" },
            { $unset: { simulatedDate: 1 } },
            { session },
          );
        },
      });
    });
  },
};
