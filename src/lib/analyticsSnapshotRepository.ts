import type mongoose from "mongoose";
import { AnalyticsSnapshotModel } from "@/models/AnalyticsSnapshot";

// Legacy records remain auditable history, but only approved snapshots may
// participate in current analytics reads or future planning windows.
export function listApprovedAnalyticsSnapshots(studentId: mongoose.Types.ObjectId | string) {
  return AnalyticsSnapshotModel.find({ studentId, status: "approved" }).sort({ approvedAt: -1 }).lean();
}
