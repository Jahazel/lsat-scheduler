import mongoose from "mongoose";
import { SNAPSHOT_INDEX, SNAPSHOT_INDEX_NAME } from "./migrate-analytics-snapshots.mjs";
import { WEEKLY_SCHEDULE_INDEX, WEEKLY_SCHEDULE_INDEX_NAME } from "./weeklyScheduleIndex.mjs";
import { ACTIVITY_CHECK_IN_INDEX, ACTIVITY_CHECK_IN_INDEX_NAME } from "./activityCheckInIndex.mjs";

function sameIndexKey(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function requiredIndex(indexes, { name, key, unique = false }) {
  const index = indexes.find((candidate) => candidate.name === name);
  if (!index || !sameIndexKey(index.key, key) || Boolean(index.unique) !== unique) {
    throw new Error(`Required index ${name} is missing or has the wrong definition.`);
  }
}

function studentIdQueryValue(studentId) {
  return mongoose.Types.ObjectId.isValid(studentId)
    ? new mongoose.Types.ObjectId(studentId)
    : studentId;
}

export async function verifyAdaptiveScheduleRollout({
  analyticsSnapshots,
  weeklySchedules,
  activityCheckIns,
  representativeStudentId,
}) {
  const [analyticsIndexes, weeklyScheduleIndexes, activityCheckInIndexes] = await Promise.all([
    analyticsSnapshots.indexes(),
    weeklySchedules.indexes(),
    activityCheckIns.indexes(),
  ]);

  requiredIndex(analyticsIndexes, { name: SNAPSHOT_INDEX_NAME, key: SNAPSHOT_INDEX });
  requiredIndex(weeklyScheduleIndexes, {
    name: WEEKLY_SCHEDULE_INDEX_NAME,
    key: WEEKLY_SCHEDULE_INDEX,
    unique: true,
  });
  requiredIndex(activityCheckInIndexes, {
    name: ACTIVITY_CHECK_IN_INDEX_NAME,
    key: ACTIVITY_CHECK_IN_INDEX,
    unique: true,
  });

  if (
    analyticsIndexes.some(
      (index) => index.unique && sameIndexKey(index.key, { studentId: 1 }),
    )
  ) {
    throw new Error("The legacy unique analytics index remains and blocks append-only snapshot history.");
  }

  const legacyAnalyticsRecords = await analyticsSnapshots.countDocuments({ status: "legacy" });
  if (representativeStudentId) {
    const studentId = studentIdQueryValue(representativeStudentId);
    const legacySnapshot = await analyticsSnapshots.findOne({
      studentId,
      status: "legacy",
    });
    if (
      !legacySnapshot ||
      legacySnapshot.legacy?.source !== "single-snapshot-storage" ||
      !(legacySnapshot.legacy?.migratedAt instanceof Date)
    ) {
      throw new Error("Representative legacy analytics record is missing migration provenance.");
    }

    const approvedSnapshot = await analyticsSnapshots.findOne({
      studentId,
      status: "approved",
    });
    if (!approvedSnapshot) throw new Error("Representative student has no approved analytics snapshot.");

    const schedule = await weeklySchedules.findOne({ studentId });
    if (
      !schedule ||
      !Array.isArray(schedule.sourceSnapshotIds) ||
      schedule.sourceSnapshotIds.length === 0 ||
      !schedule.policyVersion ||
      !schedule.generationInputs
    ) {
      throw new Error("Representative weekly schedule is incomplete.");
    }
    const sourceSnapshotIds = schedule.sourceSnapshotIds.map(String);
    if (
      !sourceSnapshotIds.includes(String(approvedSnapshot._id)) ||
      sourceSnapshotIds.includes(String(legacySnapshot._id))
    ) {
      throw new Error("Representative weekly schedule does not use approved analytics sources only.");
    }

    const checkIn = await activityCheckIns.findOne({ scheduleId: schedule._id });
    if (!checkIn?.activityId || !checkIn.status) {
      throw new Error("Representative weekly schedule has no activity check-in.");
    }
  }

  return { legacyAnalyticsRecords };
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  const representativeStudentId = process.env.ADAPTIVE_SCHEDULE_REPRESENTATIVE_STUDENT_ID;
  if (!representativeStudentId) {
    throw new Error("ADAPTIVE_SCHEDULE_REPRESENTATIVE_STUDENT_ID is required for rollout verification.");
  }
  if (!mongoose.Types.ObjectId.isValid(representativeStudentId)) {
    throw new Error("ADAPTIVE_SCHEDULE_REPRESENTATIVE_STUDENT_ID must be a MongoDB ObjectId.");
  }

  await mongoose.connect(uri, { dbName: "lsat-scheduler" });
  try {
    const result = await verifyAdaptiveScheduleRollout({
      analyticsSnapshots: mongoose.connection.collection("analyticssnapshots"),
      weeklySchedules: mongoose.connection.collection("weeklyschedules"),
      activityCheckIns: mongoose.connection.collection("activitycheckins"),
      representativeStudentId,
    });
    console.log(`Adaptive schedule rollout verified; retained legacy analytics records: ${result.legacyAnalyticsRecords}.`);
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
