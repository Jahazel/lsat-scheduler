"use client";

import { useActionState } from "react";
import { CheckEmailTips } from "@/components/signIn/CheckEmailTips";
import { SubmitButton } from "@/components/signIn/PasswordFormParts";
import { SignInFrame, SwitchPageLink } from "@/components/signIn/SignInFrame";
import { TodayPreview } from "@/components/signIn/TodayPreview";
import { TextInput } from "@/components/ui/TextInput";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = { kind: "form" };

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(requestPasswordReset, initialState);

  if (state.kind === "sent") {
    return (
      <SignInFrame
        title="Check your email"
        lead={`If ${state.email} has a DrillMap Account, we sent it an email with your next step.`}
        preview={<TodayPreview />}
      >
        <CheckEmailTips linkLife="A reset link works for 30 minutes." />
        <SwitchPageLink question="Back to" href="/login" label="Log in" />
      </SignInFrame>
    );
  }

  return (
    <SignInFrame
      title="Reset your password"
      lead="Type the email you use for DrillMap. We'll send you a link to set a new password."
      preview={<TodayPreview />}
    >
      <form action={formAction} className="flex flex-col gap-8">
        <TextInput label="Email" name="email" type="email" autoComplete="email" required error={state.error} />
        <SubmitButton label="Send reset link" workingLabel="Sending…" />
      </form>
      <SwitchPageLink question="Remember it?" href="/login" label="Log in" />
    </SignInFrame>
  );
}
