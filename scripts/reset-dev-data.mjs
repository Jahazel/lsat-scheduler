import mongoose from "mongoose";

// Dev only: removes every student profile and the records that hang off it,
// so dev data can be reseeded after a Student shape change. User accounts
// stay, so each person signs in and goes through onboarding again.
const COLLECTIONS = ["activitycheckins", "weeklyschedules", "analyticssnapshots", "students"];

export async function resetDevData(collection) {
  const deleted = {};
  for (const name of COLLECTIONS) {
    const result = await collection(name).deleteMany({});
    deleted[name] = result.deletedCount;
  }
  return deleted;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to reset data with NODE_ENV=production.");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  const host = new URL(uri.replace(/^mongodb(\+srv)?:/, "http:")).host;
  if (!process.argv.includes("--yes")) {
    throw new Error(`This deletes all ${COLLECTIONS.join(", ")} on ${host}. Re-run with --yes to confirm.`);
  }

  await mongoose.connect(uri, { dbName: "lsat-scheduler" });
  try {
    const deleted = await resetDevData((name) => mongoose.connection.collection(name));
    console.log(`Reset dev data on ${host}:`, deleted);
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
