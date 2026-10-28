import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { getPostgresDatabase } from "./postgres";

type SecurityLogRoute = `/${string}`;

const SAFE_ERROR_TYPE = /^[A-Za-z0-9_.:]{1,80}$/;

export function errorTypeOf(error: unknown) {
  if (!(error instanceof Error)) return "unknown";
  const cause = error.cause instanceof Error ? error.cause : error;
  const code = "code" in cause && typeof cause.code === "string" && /^([0-9A-Z]{5}|E[A-Z]+)$/.test(cause.code)
    ? `:${cause.code}` : "";
  const type = `${error.name}${code}`;
  return SAFE_ERROR_TYPE.test(type) ? type : "unknown";
}

export async function recordUnexpectedFailure(route: SecurityLogRoute, error: unknown) {
  const code = randomBytes(4).toString("hex");
  const errorType = errorTypeOf(error);
  console.error(`Unexpected failure on ${route} (${code}): ${errorType}`);
  try {
    await getPostgresDatabase().execute(sql`
      insert into security_log (event, route, error_code, error_type) values ('unexpected_failure', ${route}, ${code}, ${errorType})
    `);
  } catch (logError) {
    console.error(`Security log write failed (${code}): ${errorTypeOf(logError)}`);
  }
  return { error: "Something went wrong. Try again.", code };
}
