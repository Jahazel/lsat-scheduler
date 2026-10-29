"use client";

import { useActionState, type ComponentProps } from "react";
import { failureText, isUnexpectedFailure, type FormState } from "@/lib/unexpectedFailure";

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
