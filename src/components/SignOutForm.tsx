"use client";

import { useActionState, type ComponentProps } from "react";
import { FailureNotice } from "@/components/FailureNotice";
import type { SignOutAnswer } from "@/lib/requestPolicy";
import { isUnexpectedFailure, type FormState } from "@/lib/unexpectedFailure";

/**
 * A Server Action redirect is an in-page navigation, and the Back button would
 * show the signed-out student's pages again from the router's memory.
 */
export function SignOutForm({ action, children, ...props }: Omit<ComponentProps<"form">, "action"> & {
  action: () => Promise<SignOutAnswer>;
}) {
  const [failure, formAction] = useActionState(async (): Promise<FormState> => {
    const answer = await action();
    if (isUnexpectedFailure(answer)) return answer;
    window.location.assign(answer.goTo);
    return null;
  }, null);
  return (
    <form action={formAction} {...props}>
      {children}
      <FailureNotice answer={failure} />
    </form>
  );
}
