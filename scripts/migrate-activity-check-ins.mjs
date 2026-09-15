import mongoose from "mongoose";
import { ACTIVITY_CHECK_IN_INDEX, ACTIVITY_CHECK_IN_INDEX_NAME } from "./activityCheckInIndex.mjs";

export { ACTIVITY_CHECK_IN_INDEX, ACTIVITY_CHECK_IN_INDEX_NAME };

function matchesActivityCheckInIndex(index) {
  return (
    index.name === ACTIVITY_CHECK_IN_INDEX_NAME &&
    index.unique === true &&
    JSON.stringify(index.key) === JSON.stringify(ACTIVITY_CHECK_IN_INDEX)
  );
}

export async function migrateActivityCheckIns(collection) {
  const indexes = await collection.indexes();
  const namedActivityCheckInIndex = indexes.find((index) => index.name === ACTIVITY_CHECK_IN_INDEX_NAME);
  if (namedActivityCheckInIndex && !matchesActivityCheckInIndex(namedActivityCheckInIndex)) {
    await collection.dropIndex(ACTIVITY_CHECK_IN_INDEX_NAME);
  }
  if (!indexes.some(matchesActivityCheckInIndex)) {
    await collection.createIndex(ACTIVITY_CHECK_IN_INDEX, {
      unique: true,
      name: ACTIVITY_CHECK_IN_INDEX_NAME,
    });
  }
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(uri, { dbName: "lsat-scheduler" });
  try {
    await migrateActivityCheckIns(mongoose.connection.collection("activitycheckins"));
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
