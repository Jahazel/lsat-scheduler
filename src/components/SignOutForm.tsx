"use client";

import { useActionState, type ComponentProps } from "react";
import { FailureNotice } from "@/components/FailureNotice";
import type { SignedOut, SignOutAnswer } from "@/lib/requestPolicy";
import type { FormState } from "@/lib/unexpectedFailure";

const isSignedOut = (answer: unknown): answer is SignedOut => typeof answer === "object" && answer !== null && "goTo" in answer;

/**
 * A Server Action redirect is an in-page navigation, and the Back button would
 * show the signed-out student's pages again from the router's memory.
 */
export function followSignOut<T>(answer: T | SignedOut): T | null {
  if (!isSignedOut(answer)) return answer;
  window.location.assign(answer.goTo);
  return null;
}

export function SignOutForm({ action, children, ...props }: Omit<ComponentProps<"form">, "action"> & {
  action: () => Promise<SignOutAnswer>;
}) {
  const [failure, formAction] = useActionState(async (): Promise<FormState> => followSignOut(await action()), null);
  return (
    <form action={formAction} {...props}>
      {children}
      <FailureNotice answer={failure} />
    </form>
  );
}
