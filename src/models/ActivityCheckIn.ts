import mongoose, { Schema } from "mongoose";
import type { ActivityCheckInStatus } from "@/lib/types";
import { ACTIVITY_CHECK_IN_INDEX, ACTIVITY_CHECK_IN_INDEX_NAME } from "../../scripts/activityCheckInIndex.mjs";

export interface ActivityCheckInDocument {
  _id: mongoose.Types.ObjectId;
  scheduleId: mongoose.Types.ObjectId;
  activityId: string;
  status: ActivityCheckInStatus;
  actualMinutes?: number;
}

const ActivityCheckInSchema = new Schema<ActivityCheckInDocument>(
  {
    scheduleId: { type: Schema.Types.ObjectId, ref: "WeeklySchedule", required: true, immutable: true },
    activityId: { type: String, required: true, immutable: true },
    status: { type: String, enum: ["not_started", "completed", "skipped"], required: true },
    actualMinutes: { type: Number, min: 0 },
  },
  { timestamps: true }
);

ActivityCheckInSchema.pre("validate", function () {
  if (this.status !== "completed") this.actualMinutes = undefined;
});

ActivityCheckInSchema.index(
  ACTIVITY_CHECK_IN_INDEX as Record<string, 1 | -1>,
  { unique: true, name: ACTIVITY_CHECK_IN_INDEX_NAME }
);

export const ActivityCheckInModel =
  (mongoose.models.ActivityCheckIn as mongoose.Model<ActivityCheckInDocument>) ||
  mongoose.model<ActivityCheckInDocument>("ActivityCheckIn", ActivityCheckInSchema);
