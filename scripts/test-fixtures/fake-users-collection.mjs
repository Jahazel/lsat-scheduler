import { readFileSync, writeFileSync } from "node:fs";
import mongoose from "mongoose";

// The child runs the real command entry point against a users collection kept in a JSON file.
// Each run reads and writes the same file, so tests can check the result of repeated runs.
// This fixture is loaded only by tests, never by a package command.
const usersFile = process.env.FAKE_USERS_FILE;
const readUsers = () => JSON.parse(readFileSync(usersFile, "utf8"));

mongoose.connect = async () => {};
mongoose.disconnect = async () => {};
mongoose.connection.collection = () => ({
  async updateOne(filter, update, options) {
    const users = readUsers();
    const user = users.find((candidate) => Object.entries(filter).every(([key, value]) => candidate[key] === value));
    const inserted = !user && options?.upsert === true;
    if (user) Object.assign(user, update.$set);
    if (inserted) users.push({ ...filter, ...update.$setOnInsert, ...update.$set });
    writeFileSync(usersFile, JSON.stringify(users));
    return { acknowledged: true, matchedCount: user ? 1 : 0, upsertedCount: inserted ? 1 : 0 };
  },
});
