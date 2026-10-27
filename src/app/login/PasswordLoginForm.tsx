"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/signIn/PasswordFormParts";
import { Notice } from "@/components/signIn/SignInFrame";
import { TextInput } from "@/components/ui/TextInput";
import type { LoginNotice } from "@/lib/loginNotice";
import { logInWithPassword } from "./actions";

export function PasswordLoginForm({ urlNotice }: { urlNotice: LoginNotice | null }) {
  const [state, formAction] = useActionState(logInWithPassword, { email: "", notice: urlNotice, passwordError: null });
  return (
    <form action={formAction} className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        {state.notice && <Notice notice={state.notice} />}
        <TextInput label="Email" name="email" type="email" autoComplete="email" required defaultValue={state.email} />
        <TextInput
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={state.passwordError ?? undefined}
        />
      </div>
      <SubmitButton label="Log in" />
    </form>
  );
}
