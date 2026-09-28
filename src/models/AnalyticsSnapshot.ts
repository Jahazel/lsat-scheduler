import mongoose, { Schema } from "mongoose";
import type { AnalyticsSnapshot } from "@/lib/types";

export type AnalyticsSnapshotStatus = "approved" | "legacy";

export interface AnalyticsSnapshotDocument extends AnalyticsSnapshot {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  status: AnalyticsSnapshotStatus;
  approvedAt?: Date;
  extraction?: {
    source: "7sage_screenshot" | "admin_sample";
    extractedAt: Date;
  };
  confirmation?: {
    extractedValuesMatch: true;
    isLatestAnalytics: true;
    confirmedAt: Date;
  };
  legacy?: {
    migratedAt: Date;
    source: "single-snapshot-storage";
  };
}

const AnalyticsSnapshotSchema = new Schema<AnalyticsSnapshotDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    weekOf: { type: String, required: true },
    lrAccuracyByType: { type: Schema.Types.Mixed, required: true },
    lrTopPriorityLogicTypes: { type: [String], required: true },
    status: { type: String, enum: ["approved", "legacy"], required: true },
    approvedAt: { type: Date },
    extraction: {
      source: { type: String, enum: ["7sage_screenshot", "admin_sample"] },
      extractedAt: { type: Date },
    },
    confirmation: {
      extractedValuesMatch: { type: Boolean },
      isLatestAnalytics: { type: Boolean },
      confirmedAt: { type: Date },
    },
    legacy: {
      migratedAt: { type: Date },
      source: { type: String, enum: ["single-snapshot-storage"] },
    },
  },
  { timestamps: true },
);

AnalyticsSnapshotSchema.index(
  { studentId: 1, status: 1, approvedAt: -1 },
  { name: "studentId_1_status_1_approvedAt_-1" },
);

export const AnalyticsSnapshotModel =
  (mongoose.models.AnalyticsSnapshot as mongoose.Model<AnalyticsSnapshotDocument>) ||
  mongoose.model<AnalyticsSnapshotDocument>("AnalyticsSnapshot", AnalyticsSnapshotSchema);
