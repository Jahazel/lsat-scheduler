import { createPostgresTestDatabase } from "./testDatabase";

export default async function setup() {
  const database = await createPostgresTestDatabase();
  // Vitest passes this generated setting to its workers. No env file is read.
  process.env.DATABASE_URL = database.setting;
  return database.cleanup;
}
