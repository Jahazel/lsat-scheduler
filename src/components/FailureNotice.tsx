"use client";

import { useActionState, type ComponentProps } from "react";
import { failureText, isUnexpectedFailure, type FormState, type SignOutAnswer } from "@/lib/unexpectedFailure";

export function FailureNotice({ answer, className }: { answer: unknown; className?: string }) {
  if (!isUnexpectedFailure(answer)) return null;
  return <p role="alert" className={className ?? "text-small text-danger-ink"}>{failureText(answer)}</p>;
}

export function ActionForm({ action, children, ...props }: Omit<ComponentProps<"form">, "action"> & {
  action: () => Promise<FormState>;
}) {
  const [failure, formAction] = useActionState(action, null);
  return (
    <form action={formAction} {...props}>
      {children}
      <FailureNotice answer={failure} />
    </form>
  );
}

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
    return new Promise<never>(() => {});
  }, null);
  return (
    <form action={formAction} {...props}>
      {children}
      <FailureNotice answer={failure} />
    </form>
  );
}
