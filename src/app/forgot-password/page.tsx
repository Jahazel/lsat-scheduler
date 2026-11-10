"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { FailureNotice } from "@/components/FailureNotice";
import { CheckEmailTips } from "@/components/signIn/CheckEmailTips";
import { SubmitButton } from "@/components/signIn/PasswordFormParts";
import { SignInFrame, SwitchPageLink } from "@/components/signIn/SignInFrame";
import { TodayPreview } from "@/components/signIn/TodayPreview";
import { TextInput } from "@/components/ui/TextInput";
import { callAction } from "@/lib/callAction";
import { isUnexpectedFailure, type Answer } from "@/lib/unexpectedFailure";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";

const initialState: Answer<ForgotPasswordState> = { kind: "form" };

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(callAction(requestPasswordReset), initialState);
  const notice = <FailureNotice answer={state} />;

  if (!isUnexpectedFailure(state) && state.kind === "sent") {
    return (
      <>
        {notice}
        <SignInFrame
          title="Check your email"
          lead={`If ${state.email} has a DrillMap Account, we sent it an email with your next step.`}
          preview={<TodayPreview />}
        >
          <CheckEmailTips linkLife="A reset link works for 30 minutes." />
          <SwitchPageLink question="Back to" href="/login" label="Log in" />
        </SignInFrame>
      </>
    );
  }

  // Submitting by hand keeps the typed email: a form action would clear the form when the send fails.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <>
      {notice}
      <SignInFrame
        title="Reset your password"
        lead="Type the email you use for DrillMap. We'll send you a link to set a new password."
        preview={<TodayPreview />}
      >
        <form onSubmit={submit} className="flex flex-col gap-8">
          <TextInput label="Email" name="email" type="email" autoComplete="email" required error={isUnexpectedFailure(state) ? undefined : state.error} />
          <SubmitButton label="Send reset link" workingLabel="Sending…" pending={pending} />
        </form>
        <SwitchPageLink question="Remember it?" href="/login" label="Log in" />
      </SignInFrame>
    </>
  );
}
