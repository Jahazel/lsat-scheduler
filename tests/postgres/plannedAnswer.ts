import { sql } from "drizzle-orm";
import { expect } from "vitest";
import { isUnexpectedFailure, type Answer } from "../../src/lib/unexpectedFailure";
import type { setUpAppTestDatabase } from "./appTestDatabase";

export function planned<T>(answer: Answer<T>): T {
  if (isUnexpectedFailure(answer)) throw new Error(`The action failed unexpectedly (${answer.unexpectedFailure}).`);
  return answer;
}

/** Checks that an action answered with an error code, and that the security log holds that code with the error type. */
export async function expectUnexpectedFailure(
  database: ReturnType<typeof setUpAppTestDatabase>,
  answer: Promise<unknown>,
  errorType: string,
) {
  const reply = await answer;
  if (!isUnexpectedFailure(reply)) throw new Error(`Expected an unexpected failure, not ${JSON.stringify(reply)}.`);
  const logged = await database.owner.execute(sql`select error_type from security_log where error_code = ${reply.unexpectedFailure}`);
  expect(logged.rows).toEqual([{ error_type: errorType }]);
}
