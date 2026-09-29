import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

// Cached across hot reloads in dev so we don't open a new connection on
// every file save.
const cache: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cache;

export async function connectDB() {
  if (cache.conn) return cache.conn;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, { dbName: "lsat-scheduler" });
  }

  const promise = cache.promise;
  try {
    cache.conn = await promise;
    return cache.conn;
  } catch (error) {
    if (cache.promise === promise) cache.promise = null;
    throw error;
  }
}
