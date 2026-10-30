"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { ActionForm, FailureNotice } from "@/components/FailureNotice";
import { GoogleButton } from "@/components/signIn/GoogleButton";
import { OrWithEmail, SubmitButton } from "@/components/signIn/PasswordFormParts";
import { SignInFrame, SwitchPageLink } from "@/components/signIn/SignInFrame";
import { CheckEmailTips } from "@/components/signIn/CheckEmailTips";
import { StepsPreview } from "@/components/signIn/StepsPreview";
import { Checkbox } from "@/components/ui/Checkbox";
import { TextInput } from "@/components/ui/TextInput";
import { FOCUS, cx } from "@/components/ui/classes";
import { isUnexpectedFailure, type Answer } from "@/lib/unexpectedFailure";
import { signUpWithGoogle, signUpWithPassword, type SignupState } from "./actions";

const initialState: Answer<SignupState> = { kind: "form", errors: {} };
const LEGAL_LINK = cx("rounded-xs font-medium text-accent underline underline-offset-[3px] hover:text-ink", FOCUS);

export default function SignupPage() {
  const [attempt, setAttempt] = useState(0);
  return <Signup key={attempt} onSignUpAgain={() => setAttempt((count) => count + 1)} />;
}

function Signup({ onSignUpAgain }: { onSignUpAgain: () => void }) {
  const [state, formAction, pending] = useActionState(signUpWithPassword, initialState);
  const notice = <FailureNotice answer={state} />;

  if (!isUnexpectedFailure(state) && state.kind === "checkYourEmail") return <>{notice}<CheckYourEmail email={state.email} onSignUpAgain={onSignUpAgain} /></>;

  // Submitting by hand keeps the typed values: a form action would clear the form when it returns an error.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const errors = isUnexpectedFailure(state) ? {} : state.errors;
  return (
    <>
      {notice}
      <SignInFrame title="Sign up for DrillMap" lead="Use Google, or your email and a password." preview={<StepsPreview />}>
        <div className="flex flex-col gap-3">
          <ActionForm action={signUpWithGoogle}>
            <GoogleButton look="light" />
          </ActionForm>
          <p className="text-small leading-[20px] text-smoke">
            By continuing with Google, you agree to the <Link href="/legal/terms" className={LEGAL_LINK}>Terms of Service</Link> and{" "}
            <Link href="/legal/privacy" className={LEGAL_LINK}>Privacy Policy</Link>
          </p>
        </div>
        <OrWithEmail />
        <form onSubmit={submit} className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <TextInput label="Name" name="name" autoComplete="name" required error={errors.name} />
            <TextInput label="Email" name="email" type="email" autoComplete="email" required error={errors.email} />
            <TextInput
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              helper="At least 8 characters. A long phrase works well."
              error={errors.password}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Checkbox
              name="agreedToTerms"
              invalid={!!errors.terms}
              aria-describedby={errors.terms ? "agreed-to-terms-error" : undefined}
              label={
                <span>
                  I agree to the <Link href="/legal/terms" className={LEGAL_LINK}>Terms of Service</Link> and{" "}
                  <Link href="/legal/privacy" className={LEGAL_LINK}>Privacy Policy</Link>
                </span>
              }
            />
            {errors.terms && (
              <p id="agreed-to-terms-error" className="pl-7 text-small leading-[20px] text-danger-ink">{errors.terms}</p>
            )}
          </div>
          <SubmitButton label="Create account" pending={pending} />
        </form>
        <SwitchPageLink question="Already have an account?" href="/login" label="Log in" />
      </SignInFrame>
    </>
  );
}

function CheckYourEmail({ email, onSignUpAgain }: { email: string; onSignUpAgain: () => void }) {
  return (
    <SignInFrame
      title="Check your email"
      lead={`We sent an email to ${email}. Open the link in it to finish signing up.`}
      preview={<StepsPreview />}
    >
      <CheckEmailTips linkLife="The link works for 24 hours." />
      <p className="flex gap-1 text-small text-smoke">
        Wrong email?
        <button type="button" onClick={onSignUpAgain} className={cx("rounded-xs font-medium text-accent hover:text-ink", FOCUS)}>
          Sign up again
        </button>
      </p>
    </SignInFrame>
  );
}
