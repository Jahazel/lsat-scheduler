"use client";

import { useActionState } from "react";
import { GoogleButton } from "@/components/signIn/GoogleButton";
import { OrWithEmail, SubmitButton } from "@/components/signIn/PasswordFormParts";
import { Notice } from "@/components/signIn/SignInFrame";
import { TextInput } from "@/components/ui/TextInput";
import type { LoginNotice } from "@/lib/loginNotice";
import { logInWithPassword, signInWithGoogle } from "./actions";

export function LoginForms({ urlNotice }: { urlNotice: LoginNotice | null }) {
  const [refused, logInAction] = useActionState(logInWithPassword, null);
  const urlNoticeInForm = urlNotice?.tone === "success";
  const topNotice = refused || urlNoticeInForm ? null : urlNotice;
  const formNotice = refused ? refused.notice : urlNoticeInForm && urlNotice;
  return (
    <>
      {topNotice && <Notice notice={topNotice} />}
      <form action={signInWithGoogle}>
        <GoogleButton look="light" />
      </form>
      <OrWithEmail />
      <form action={logInAction} className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          {formNotice && <Notice notice={formNotice} />}
          <TextInput label="Email" name="email" type="email" autoComplete="email" required defaultValue={refused?.email} />
          <TextInput
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            error={refused?.passwordError ?? undefined}
          />
        </div>
        <SubmitButton label="Log in" />
      </form>
    </>
  );
}
