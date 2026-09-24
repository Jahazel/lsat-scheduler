import mongoose, { Schema } from "mongoose";
import { WEEKLY_SCHEDULE_INDEX, WEEKLY_SCHEDULE_INDEX_NAME } from "../../scripts/weeklyScheduleIndex.mjs";
import type {
  AnalyticsSnapshot,
  DayOfWeek,
  PriorWeekProgressFacts,
  Student,
  WeeklySchedule,
} from "@/lib/types";

export interface WeeklyScheduleDocument {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  weekStartDate: string;
  generatedAt: Date;
  schedule: WeeklySchedule;
  sourceSnapshotIds: mongoose.Types.ObjectId[];
  generationInputs: {
    student: Student;
    timezone: string;
    remainingDays: DayOfWeek[];
    analytics: AnalyticsSnapshot;
    priorWeekProgress: PriorWeekProgressFacts;
    carryOverReviewMinutes?: number;
  };
  policyVersion: string;
}

const WeeklyScheduleSchema = new Schema<WeeklyScheduleDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, immutable: true },
    weekStartDate: { type: String, required: true, immutable: true },
    generatedAt: { type: Date, required: true, immutable: true },
    schedule: { type: Schema.Types.Mixed, required: true, immutable: true },
    sourceSnapshotIds: { type: [Schema.Types.ObjectId], ref: "AnalyticsSnapshot", required: true, immutable: true },
    generationInputs: { type: Schema.Types.Mixed, required: true, immutable: true },
    policyVersion: { type: String, required: true, immutable: true },
  },
  { timestamps: true }
);

export const WEEKLY_SCHEDULE_IMMUTABLE_ERROR =
  "Weekly schedules are immutable; create a new schedule instead of updating an existing one.";

WeeklyScheduleSchema.pre("save", function () {
  if (!this.isNew) throw new Error(WEEKLY_SCHEDULE_IMMUTABLE_ERROR);
});
WeeklyScheduleSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate", "findOneAndReplace", "replaceOne"],
  function () {
    throw new Error(WEEKLY_SCHEDULE_IMMUTABLE_ERROR);
  }
);
WeeklyScheduleSchema.pre("bulkWrite", function () {
  throw new Error(WEEKLY_SCHEDULE_IMMUTABLE_ERROR);
});

WeeklyScheduleSchema.index(WEEKLY_SCHEDULE_INDEX as Record<string, 1 | -1>, {
  unique: true,
  name: WEEKLY_SCHEDULE_INDEX_NAME,
});

export const WeeklyScheduleModel =
  (mongoose.models.WeeklySchedule as mongoose.Model<WeeklyScheduleDocument>) ||
  mongoose.model<WeeklyScheduleDocument>("WeeklySchedule", WeeklyScheduleSchema);
