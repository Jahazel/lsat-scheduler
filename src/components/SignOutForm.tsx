"use client";

import { createContext, useContext, useState, useTransition, type ComponentProps, type FormEvent } from "react";
import { FailureNotice } from "@/components/FailureNotice";
import { Button } from "@/components/ui/Button";
import { callAction } from "@/lib/callAction";
import { leavePage } from "@/lib/leavePage";
import type { SignOutAnswer } from "@/lib/requestPolicy";
import { isUnexpectedFailure } from "@/lib/unexpectedFailure";

const SigningOut = createContext(false);

export const useSigningOut = () => useContext(SigningOut);

export function SignOutForm({ action, children, ...props }: Omit<ComponentProps<"form">, "action" | "onSubmit"> & {
  action: () => Promise<SignOutAnswer>;
}) {
  const [answer, setAnswer] = useState<unknown>(null);
  const [pending, startTransition] = useTransition();

  function signOut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const control = (event.nativeEvent as SubmitEvent).submitter ?? event.currentTarget;
    void leavePage(control, () => new Promise((resolve) => startTransition(async () => {
      try {
        const next = await callAction(action)();
        startTransition(() => setAnswer(next));
        resolve(isUnexpectedFailure(next) ? "failed" : "left");
      } catch (error) {
        resolve("failed");
        throw error;
      }
    })));
  }

  return (
    <form onSubmit={signOut} {...props}>
      <SigningOut value={pending}>{children}</SigningOut>
      <FailureNotice answer={answer} />
    </form>
  );
}

export function SignOutButton(props: Omit<ComponentProps<typeof Button>, "type" | "waiting">) {
  return <Button type="submit" waiting={useSigningOut()} {...props} />;
}
