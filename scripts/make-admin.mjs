import mongoose from "mongoose";

export function getMongoHost(uri) {
  if (!uri) throw new Error("MONGODB_URI is not set. Set it to the target database.");
  const authority = uri.match(/^mongodb(?:\+srv)?:\/\/([^/?#]+)/)?.[1];
  if (!authority) throw new Error("Invalid MONGODB_URI");
  return authority.slice(authority.lastIndexOf("@") + 1);
}

export async function makeAdmin(collection, email) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await collection.findOne({ email: normalizedEmail });
  if (!user) throw new Error(`No account found for ${normalizedEmail}`);
  if (user.role === "admin") return { status: "already-admin", normalizedEmail };

  const result = await collection.updateOne({ _id: user._id }, { $set: { role: "admin" } });
  if (result.matchedCount === 0) {
    throw new Error(`No account updated for ${normalizedEmail}`);
  }
  return { status: "promoted", normalizedEmail };
}

async function main() {
  const email = process.argv[2];
  if (process.argv.length !== 3 || !email.trim()) {
    throw new Error("Usage: npm run make-admin -- <email>");
  }

  const uri = process.env.MONGODB_URI;
  const host = getMongoHost(uri);

  await mongoose.connect(uri, { dbName: "lsat-scheduler" });
  try {
    let result;
    try {
      result = await makeAdmin(mongoose.connection.collection("users"), email);
    } catch (error) {
      throw new Error(`${error.message} on ${host}`, { cause: error });
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
