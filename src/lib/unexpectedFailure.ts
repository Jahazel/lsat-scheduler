export const UNEXPECTED_FAILURE_MESSAGE = "Something went wrong. Try again.";

/** Eight hex characters. The security log holds the same code beside the route and error type. */
export type FailureCode = string & { readonly __brand: "FailureCode" };

/** What a Server Action answers when it fails unexpectedly. Planned refusals never use this key. */
export type UnexpectedFailure = { unexpectedFailure: FailureCode };

export type Answer<T> = T | UnexpectedFailure;

/** The state of a form whose action only redirects when it works. */
export type FormState = UnexpectedFailure | null;

export function isUnexpectedFailure(value: unknown): value is UnexpectedFailure {
  return typeof value === "object" && value !== null && "unexpectedFailure" in value
    && typeof value.unexpectedFailure === "string" && /^[0-9a-f]{8}$/.test(value.unexpectedFailure);
}

export const failureText = ({ unexpectedFailure }: UnexpectedFailure) =>
  `${UNEXPECTED_FAILURE_MESSAGE} Error code: ${unexpectedFailure}`;
