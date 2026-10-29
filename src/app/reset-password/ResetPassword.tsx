"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { FailureNotice } from "@/components/FailureNotice";
import { SubmitButton } from "@/components/signIn/PasswordFormParts";
import { SignInFrame, SwitchPageLink } from "@/components/signIn/SignInFrame";
import { TodayPreview } from "@/components/signIn/TodayPreview";
import { ButtonLink } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { isUnexpectedFailure, type Answer } from "@/lib/unexpectedFailure";
import { resetPassword, type ResetPasswordState } from "./actions";

const initialState: Answer<ResetPasswordState> = { kind: "form" };

export function ResetPassword({ token }: { token: string | null }) {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);

  if (!token || (!isUnexpectedFailure(state) && state.kind === "linkDoesNotWork")) {
    return (
      <SignInFrame
        title="This link doesn't work"
        lead="It may have expired, been used already, or been replaced by a newer link. A reset link works once, for 30 minutes."
        preview={<TodayPreview />}
      >
        <ButtonLink href="/forgot-password" className="w-full rounded-sm">Get a new link</ButtonLink>
        <SwitchPageLink question="Back to" href="/login" label="Log in" />
      </SignInFrame>
    );
  }

  // Submitting by hand keeps the typed password: a form action would clear the form when it returns an error.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <SignInFrame
      title="Set a new password"
      lead="Choose a new password. Saving it signs you out on all your devices."
      preview={<TodayPreview />}
    >
      <form onSubmit={submit} className="flex flex-col gap-8">
        <input type="hidden" name="token" value={token} />
        <TextInput
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          helper="At least 8 characters. A long phrase works well."
          error={isUnexpectedFailure(state) || state.kind !== "form" ? undefined : state.error}
        />
        <FailureNotice answer={state} />
        <SubmitButton label="Save new password" workingLabel="Saving…" pending={pending} />
      </form>
    </SignInFrame>
  );
}
