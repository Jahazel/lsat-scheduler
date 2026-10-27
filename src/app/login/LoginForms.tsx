"use client";

import Link from "next/link";
import { useActionState } from "react";
import { GoogleButton } from "@/components/signIn/GoogleButton";
import { OrWithEmail, SubmitButton } from "@/components/signIn/PasswordFormParts";
import { Notice } from "@/components/signIn/SignInFrame";
import { TextInput } from "@/components/ui/TextInput";
import { FOCUS, cx } from "@/components/ui/classes";
import type { LoginNotice } from "@/lib/loginNotice";
import { logInWithPassword, signInWithGoogle } from "./actions";

export function LoginForms({ urlNotice }: { urlNotice: LoginNotice | null }) {
  const [refused, logInAction] = useActionState(logInWithPassword, null);
  const notice = refused ? refused.notice : urlNotice;
  return (
    <>
      {notice?.place === "aboveGoogle" && <Notice notice={notice} />}
      <form action={signInWithGoogle}>
        <GoogleButton look="light" />
      </form>
      <OrWithEmail />
      <form action={logInAction} className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          {notice?.place === "aboveEmail" && <Notice notice={notice} />}
          <TextInput label="Email" name="email" type="email" autoComplete="email" required defaultValue={refused?.email} />
          <TextInput
            label="Password"
            labelAside={<Link href="/forgot-password" className={cx("rounded-xs text-small font-medium text-accent hover:text-ink", FOCUS)}>Forgot password?</Link>}
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
