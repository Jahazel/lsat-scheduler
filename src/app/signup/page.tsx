"use client";

import Link from "next/link";
import { useActionState } from "react";
import { GoogleButton } from "@/components/signIn/GoogleButton";
import { PreviewHeader, SignInFrame, SwitchPageLink } from "@/components/signIn/SignInFrame";
import { Checkbox } from "@/components/ui/Checkbox";
import { FOCUS, cx } from "@/components/ui/classes";
import { signUpWithGoogle, type SignupState } from "./actions";

const initialState: SignupState = {};
const LEGAL_LINK = cx("rounded-xs font-medium text-accent underline underline-offset-[3px] hover:text-ink", FOCUS);

export default function SignupPage() {
  const [state, formAction] = useActionState(signUpWithGoogle, initialState);

  return (
    <SignInFrame
      title="Sign up for DrillMap"
      lead="DrillMap uses Google sign-in. There is no new password to remember."
      preview={<StepsPreview />}
    >
      <form action={formAction} className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Checkbox
            name="agreedToTerms"
            invalid={!!state.error}
            aria-describedby={state.error ? "agreed-to-terms-error" : undefined}
            label={
              <span>
                I agree to the <Link href="/legal/terms" className={LEGAL_LINK}>Terms of Service</Link> and{" "}
                <Link href="/legal/privacy" className={LEGAL_LINK}>Privacy Policy</Link>
              </span>
            }
          />
          {state.error && (
            <p id="agreed-to-terms-error" className="pl-7 text-small leading-[20px] text-danger-ink">{state.error}</p>
          )}
        </div>
        <GoogleButton />
      </form>
      <SwitchPageLink question="Already have an account?" href="/login" label="Log in" />
    </SignInFrame>
  );
}

const STEPS = [
  { title: "Set your goal score", tag: "Goal" },
  { title: "Pick your study days", tag: "Week" },
  { title: "Add your 7Sage analytics", tag: "Analytics" },
  { title: "Check your first week", tag: "Review" },
];

function StepsPreview() {
  return (
    <>
      <PreviewHeader label="After you sign up" detail="4 steps" />
      <ol className="flex flex-col gap-3">
        {STEPS.map((step, index) => (
          <li key={step.tag} className="flex items-center gap-3">
            <span className={cx("w-6 shrink-0 font-mono text-mono", index === 0 ? "text-accent" : "text-fog")}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="grow text-body leading-[20px] text-ink">{step.title}</span>
            <span className="font-mono text-mono text-smoke">{step.tag}</span>
          </li>
        ))}
      </ol>
      <p className="border-t border-vellum-line pt-4 text-small font-medium text-accent">Then your weekly plan is ready.</p>
    </>
  );
}
