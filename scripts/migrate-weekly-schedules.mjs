import mongoose from "mongoose";
import { WEEKLY_SCHEDULE_INDEX, WEEKLY_SCHEDULE_INDEX_NAME } from "./weeklyScheduleIndex.mjs";

export { WEEKLY_SCHEDULE_INDEX, WEEKLY_SCHEDULE_INDEX_NAME };

export async function migrateWeeklySchedules(collection) {
  const indexes = await collection.indexes();
  const hasWeeklyScheduleIndex = indexes.some((index) => index.name === WEEKLY_SCHEDULE_INDEX_NAME);
  if (!hasWeeklyScheduleIndex) {
    await collection.createIndex(WEEKLY_SCHEDULE_INDEX, {
      unique: true,
      name: WEEKLY_SCHEDULE_INDEX_NAME,
    });
  }
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

  await mongoose.connect(uri, { dbName: "lsat-scheduler" });
  try {
    await migrateWeeklySchedules(mongoose.connection.collection("weeklyschedules"));
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
