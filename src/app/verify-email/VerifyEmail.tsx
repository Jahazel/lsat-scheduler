"use client";

import { useActionState } from "react";
import { FailureNotice } from "@/components/FailureNotice";
import { SubmitButton } from "@/components/signIn/PasswordFormParts";
import { SignInFrame, SwitchPageLink } from "@/components/signIn/SignInFrame";
import { StepsPreview } from "@/components/signIn/StepsPreview";
import { ButtonLink } from "@/components/ui/Button";
import { isUnexpectedFailure, type Answer } from "@/lib/unexpectedFailure";
import { verifyEmail, type VerifyEmailState } from "./actions";

const initialState: Answer<VerifyEmailState> = { linkDoesNotWork: false };

export function VerifyEmail({ token }: { token: string }) {
  const [state, formAction] = useActionState(verifyEmail, initialState);

  if (!token || (!isUnexpectedFailure(state) && state.linkDoesNotWork)) {
    return (
      <SignInFrame
        title="This link doesn't work"
        lead="It may have expired, been used already, or been copied wrong. A link works once, for 24 hours."
        preview={<StepsPreview />}
      >
        <ButtonLink href="/signup" className="w-full rounded-sm">Sign up again</ButtonLink>
        <SwitchPageLink question="Already verified?" href="/login" label="Log in" />
      </SignInFrame>
    );
  }

  return (
    <SignInFrame title="Verify your email" lead="Press the button to finish signing up." preview={<StepsPreview />}>
      <form action={formAction}>
        <input type="hidden" name="token" value={token} />
        <FailureNotice answer={state} />
        <SubmitButton label="Verify my email" workingLabel="Verifying…" />
      </form>
    </SignInFrame>
  );
}
