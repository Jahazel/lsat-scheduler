import type { SignedOut } from "@/lib/requestPolicy";
import { NO_CONNECTION, type UnexpectedFailure } from "@/lib/unexpectedFailure";

const isSignedOut = (answer: unknown): answer is SignedOut => typeof answer === "object" && answer !== null && "goTo" in answer;

type Followed<T> = T extends SignedOut ? null : T;

const neverReachedServer = (error: unknown) => error instanceof TypeError;

export function callAction<A extends unknown[], T>(action: (...args: A) => Promise<T>) {
  return async (...args: A): Promise<Followed<T> | UnexpectedFailure> => {
    let answer: T;
    try {
      answer = await action(...args);
    } catch (error) {
      if (neverReachedServer(error)) return { unexpectedFailure: NO_CONNECTION };
      throw error;
    }
    if (!isSignedOut(answer)) return answer as Followed<T>;
    // A Server Action redirect is an in-page navigation, and Back would show the signed-out pages again from the router's memory.
    const pageHides = new Promise((resolve) => addEventListener("pagehide", resolve, { once: true }));
    window.location.assign(answer.goTo);
    await pageHides;
    return null as Followed<T>;
  };
}
