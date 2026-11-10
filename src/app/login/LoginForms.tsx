"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { ActionForm, FailureNotice, FailureNoticeOnArrival } from "@/components/FailureNotice";
import { GoogleButton } from "@/components/signIn/GoogleButton";
import { OrWithEmail, SubmitButton } from "@/components/signIn/PasswordFormParts";
import { Notice } from "@/components/signIn/SignInFrame";
import { TextInput } from "@/components/ui/TextInput";
import { FOCUS, cx } from "@/components/ui/classes";
import { callAction } from "@/lib/callAction";
import type { LoginNotice } from "@/lib/loginNotice";
import { isUnexpectedFailure, type Answer, type FailureCode } from "@/lib/unexpectedFailure";
import { logInWithPassword, signInWithGoogle, type LoginState } from "./actions";

export function LoginForms({ urlNotice, googleFailure }: { urlNotice: LoginNotice | null; googleFailure: FailureCode | null }) {
  const [password, setPassword] = useState("");
  const [answer, logInAction, pending] = useActionState(async (previous: Answer<LoginState> | null, formData: FormData) => {
    const result = await callAction(logInWithPassword)(previous, formData);
    if (result && !isUnexpectedFailure(result)) setPassword("");
    return result;
  }, null);
  const refused = isUnexpectedFailure(answer) ? null : answer;
  const notice = answer ? refused?.notice ?? null : urlNotice;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => logInAction(formData));
  }
  return (
    <>
      {googleFailure && <FailureNoticeOnArrival code={googleFailure} />}
      {notice?.place === "aboveGoogle" && <Notice notice={notice} />}
      <ActionForm action={signInWithGoogle}>
        <GoogleButton look="light" fadesNextPage />
      </ActionForm>
      <OrWithEmail />
      <form onSubmit={submit} className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          {notice?.place === "aboveEmail" && <Notice notice={notice} />}
          <TextInput label="Email" name="email" type="email" autoComplete="email" required />
          <TextInput
            label="Password"
            labelAside={<Link href="/forgot-password" className={cx("rounded-xs text-small font-medium text-accent hover:text-ink", FOCUS)}>Forgot password?</Link>}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={refused?.passwordError ?? undefined}
          />
        </div>
        <FailureNotice answer={answer} />
        <SubmitButton label="Log in" pending={pending} />
      </form>
    </>
  );
}
