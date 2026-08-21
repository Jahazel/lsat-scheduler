import mongoose, { Schema } from "mongoose";
import type { AnalyticsSnapshot } from "@/lib/types";

export interface AnalyticsSnapshotDocument extends AnalyticsSnapshot {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
}

const AnalyticsSnapshotSchema = new Schema<AnalyticsSnapshotDocument>({
  // One snapshot per student — a new upload replaces the old one.
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, unique: true },
  weekOf: { type: String, required: true },
  lrAccuracyByType: { type: Schema.Types.Mixed, required: true },
  lrTopPriorityLogicTypes: { type: [String], required: true },
});

export const AnalyticsSnapshotModel =
  (mongoose.models.AnalyticsSnapshot as mongoose.Model<AnalyticsSnapshotDocument>) ||
  mongoose.model<AnalyticsSnapshotDocument>("AnalyticsSnapshot", AnalyticsSnapshotSchema);
