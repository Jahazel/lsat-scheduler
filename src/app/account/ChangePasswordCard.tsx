"use client";

import { useActionState, useState } from "react";
import { FailureNotice } from "@/components/FailureNotice";
import { followSignOut } from "@/components/SignOutForm";
import { FOCUS, MOTION, cx } from "@/components/ui/classes";
import { isUnexpectedFailure, type Answer } from "@/lib/unexpectedFailure";
import { changePassword, type PasswordChangeRefusal } from "./actions";
import { PasswordField } from "./PasswordField";

export function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [refusal, formAction, pending] = useActionState(async (previous: Answer<PasswordChangeRefusal>, formData: FormData) => {
    const result = followSignOut(await changePassword(previous, formData));
    if (!isUnexpectedFailure(result) && result?.field === "currentPassword") setCurrentPassword("");
    return result;
  }, null);
  const shown = pending || isUnexpectedFailure(refusal) ? null : refusal;

  return (
    <section className="flex flex-col gap-8 rounded-md border border-vellum-line bg-paper p-5 md:flex-row md:justify-between md:gap-16 md:p-8">
      <div className="flex max-w-[560px] flex-col gap-2">
        <h2 className="text-h4 font-semibold text-ink">Change password</h2>
        <p className="text-body text-smoke">
          Type your current password, then a new one. This signs you out on all your devices, including this one.
        </p>
      </div>
      <form action={formAction} className="flex shrink-0 flex-col gap-4 md:w-[360px]">
        <PasswordField
          label="Current password"
          name="currentPassword"
          autoComplete="current-password"
          value={currentPassword}
          onChange={setCurrentPassword}
          readOnly={pending}
          error={shown?.field === "currentPassword" ? shown.message : undefined}
        />
        <PasswordField
          label="New password"
          name="newPassword"
          autoComplete="new-password"
          value={newPassword}
          onChange={setNewPassword}
          readOnly={pending}
          helper="At least 8 characters. A long phrase works well."
          error={shown?.field === "newPassword" ? shown.message : undefined}
        />
        <button
          type="submit"
          disabled={pending}
          className={cx(
            "flex h-11 items-center justify-center rounded-sm border border-vellum-line bg-paper text-body leading-[20px] font-medium text-ink",
            "hover:bg-vellum disabled:opacity-strong",
            MOTION,
            FOCUS,
          )}
        >
          {pending ? "Changing password…" : "Change password"}
        </button>
        <FailureNotice answer={refusal} />
      </form>
    </section>
  );
}
