import mongoose from "mongoose";

class UserRefusalError extends Error {}

export function getMongoHost(uri) {
  const authority = uri.match(/^mongodb(?:\+srv)?:\/\/([^/?#]+)/)?.[1];
  if (!authority) throw new Error("Invalid MONGODB_URI");
  return authority.slice(authority.lastIndexOf("@") + 1);
}

export async function makeAdmin(collection, email) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await collection.findOne({ email: normalizedEmail });
  if (!user) throw new UserRefusalError(`No account found for ${normalizedEmail}`);
  if (user.role === "admin") return { status: "already-admin", normalizedEmail };

  const result = await collection.updateOne({ _id: user._id }, { $set: { role: "admin" } });
  if (result.matchedCount !== 1) {
    throw new UserRefusalError(`No account updated for ${normalizedEmail}`);
  }
  return { status: "promoted", normalizedEmail };
}

export function withHostOnRefusal(error, host) {
  if (!(error instanceof UserRefusalError)) return error;
  return new UserRefusalError(`${error.message} on ${host}`, { cause: error });
}

async function main() {
  const email = process.argv[2];
  if (process.argv.length !== 3 || !email.trim()) {
    throw new Error("Usage: npm run make-admin -- <email>");
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Set it to the target database.");
  const host = getMongoHost(uri);

  await mongoose.connect(uri, { dbName: "lsat-scheduler" });
  try {
    let result;
    try {
      result = await makeAdmin(mongoose.connection.collection("users"), email);
    } catch (error) {
      throw withHostOnRefusal(error, host);
    }
    if (result.status === "already-admin") {
      console.log(`${result.normalizedEmail} is already an admin on ${host}.`);
    } else {
      console.log(`Made ${result.normalizedEmail} an admin on ${host}.`);
    }
    console.log("Sign out and back in before the admin controls appear.");
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
