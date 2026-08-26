import mongoose, { Schema } from "mongoose";
import type { Student } from "@/lib/types";

export interface StudentDocument extends Student {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
}

const StudentSchema = new Schema<StudentDocument>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  platform: { type: String, enum: ["7Sage", "LSAT Demon"], required: true },
  currentScore: { type: Number, required: true },
  goalScore: { type: Number, required: true },
  weekdayHours: { type: Number, required: true },
  weekendHours: { type: Number, required: true },
  accommodationMultiplier: { type: Number, enum: [1, 1.5, 2], required: true },
  goalTestDate: { type: String, required: true },
});

// Reuse the compiled model across hot reloads instead of redefining it.
export const StudentModel =
  (mongoose.models.Student as mongoose.Model<StudentDocument>) ||
  mongoose.model<StudentDocument>("Student", StudentSchema);
