"use client";

import { startTransition, useActionState, useRef, type FormEvent } from "react";
import { callAction, type Followed } from "@/lib/callAction";
import { isUnexpectedFailure, type UnexpectedFailure } from "@/lib/unexpectedFailure";

type Called<T> = Followed<T> | UnexpectedFailure;
type Refusal<T> = Exclude<Followed<T>, UnexpectedFailure>;

/**
 * Runs a Server Action from a form that keeps what the student typed after a planned refusal.
 * React empties an uncontrolled form once its action finishes, so the form submits by hand.
 * `clears` names the one field to empty after a planned refusal; every other field keeps its value.
 */
export function useRefusableForm<T, Initial = never>(
  action: (previous: Called<T> | Initial, formData: FormData) => Promise<T>,
  initial: Called<T> | Initial,
  clears?: (refusal: Refusal<T>) => string | undefined,
) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [answer, formAction, pending] = useActionState<Called<T> | Initial, FormData>(async (previous: Called<T> | Initial, formData: FormData) => {
    const result = await callAction(action)(previous, formData);
    const field = isUnexpectedFailure(result) ? undefined : clears?.(result as Refusal<T>);
    const input = field ? formRef.current?.elements.namedItem(field) : null;
    if (input instanceof HTMLInputElement) input.value = "";
    return result;
  }, initial as Awaited<Called<T> | Initial>);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    formRef.current = event.currentTarget;
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return { answer, pending, form: { action: formAction, onSubmit } };
}
