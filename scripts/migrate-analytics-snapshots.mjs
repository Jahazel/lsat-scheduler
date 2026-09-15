import mongoose from "mongoose";

export const SNAPSHOT_INDEX = { studentId: 1, status: 1, approvedAt: -1 };
export const SNAPSHOT_INDEX_NAME = "studentId_1_status_1_approvedAt_-1";

export async function migrateAnalyticsSnapshots(collection, migratedAt = new Date()) {
  const indexes = await collection.indexes();
  const oldUniqueIndex = indexes.find(
    (index) => index.unique && JSON.stringify(index.key) === JSON.stringify({ studentId: 1 }),
  );
  if (oldUniqueIndex) {
    await collection.dropIndex(oldUniqueIndex.name);
  }

  await collection.updateMany(
    { status: { $exists: false } },
    {
      $set: {
        status: "legacy",
        legacy: { migratedAt, source: "single-snapshot-storage" },
      },
    },
  );

  const hasSnapshotIndex = indexes.some((index) => index.name === SNAPSHOT_INDEX_NAME);
  if (!hasSnapshotIndex) {
    await collection.createIndex(SNAPSHOT_INDEX, { name: SNAPSHOT_INDEX_NAME });
  }
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

  await mongoose.connect(uri, { dbName: "lsat-scheduler" });
  try {
    await migrateAnalyticsSnapshots(mongoose.connection.collection("analyticssnapshots"));
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
