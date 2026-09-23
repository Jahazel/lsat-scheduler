import mongoose, { Schema } from "mongoose";
import { DAY_ORDER } from "@/lib/engine";
import {
  DAILY_CAPACITY_STEP_MINUTES,
  MAX_DAILY_CAPACITY_MINUTES,
  MIN_DAILY_CAPACITY_MINUTES,
} from "@/lib/studentProfile";
import type { Student } from "@/lib/types";

export interface StudentDocument extends Student {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
}

const dailyCapacity = {
  type: Number,
  required: true,
  min: MIN_DAILY_CAPACITY_MINUTES,
  max: MAX_DAILY_CAPACITY_MINUTES,
  validate: {
    validator: (minutes: number) => minutes % DAILY_CAPACITY_STEP_MINUTES === 0,
    message: "Daily capacity must be in 15-minute steps.",
  },
};

const StudentSchema = new Schema<StudentDocument>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  platform: { type: String, enum: ["7Sage", "LSAT Demon"], required: true },
  currentScore: { type: Number, required: true },
  goalScore: { type: Number, required: true },
  dailyCapacityMinutes: Object.fromEntries(DAY_ORDER.map((day) => [day, dailyCapacity])),
  preferredPracticeTestDay: { type: String, enum: DAY_ORDER, required: true },
  accommodationMultiplier: { type: Number, enum: [1, 1.5, 2], required: true },
  goalTestDate: { type: String, required: true },
});

// Reuse the compiled model across hot reloads instead of redefining it.
export const StudentModel =
  (mongoose.models.Student as mongoose.Model<StudentDocument>) ||
  mongoose.model<StudentDocument>("Student", StudentSchema);
