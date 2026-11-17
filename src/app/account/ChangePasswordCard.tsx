"use client";

import { FailureNotice } from "@/components/FailureNotice";
import { Button } from "@/components/ui/Button";
import { FOCUS, MOTION, cx } from "@/components/ui/classes";
import { isUnexpectedFailure } from "@/lib/unexpectedFailure";
import { useRefusableForm } from "@/lib/useRefusableForm";
import { changePassword } from "./actions";
import { PasswordField } from "./PasswordField";

export function ChangePasswordCard() {
  const { answer: refusal, pending, form } = useRefusableForm(changePassword, null, (refused) =>
    refused?.field === "currentPassword" ? "currentPassword" : undefined);
  const shown = pending || isUnexpectedFailure(refusal) ? null : refusal;

  return (
    <section data-page-section className="flex flex-col gap-8 rounded-md border border-vellum-line bg-paper p-5 md:flex-row md:justify-between md:gap-16 md:p-8">
      <div className="flex max-w-[560px] flex-col gap-2">
        <h2 className="text-h4 font-semibold text-ink">Change password</h2>
        <p className="text-body text-smoke">
          Type your current password, then a new one. This signs you out on all your devices, including this one.
        </p>
      </div>
      <form {...form} className="flex shrink-0 flex-col gap-4 md:w-[360px]">
        <PasswordField
          label="Current password"
          name="currentPassword"
          autoComplete="current-password"
          readOnly={pending}
          error={shown?.field === "currentPassword" ? shown.message : undefined}
        />
        <PasswordField
          label="New password"
          name="newPassword"
          autoComplete="new-password"
          readOnly={pending}
          helper="At least 8 characters. A long phrase works well."
          error={shown?.field === "newPassword" ? shown.message : undefined}
        />
        <Button
          type="submit"
          variant="bare"
          waiting={pending}
          waitLabel="Changing password…"
          className={cx(
            "flex h-11 items-center justify-center rounded-sm border border-vellum-line bg-paper text-body leading-[20px] font-medium text-ink",
            "hover:bg-vellum",
            MOTION,
            FOCUS,
          )}
        >
          Change password
        </Button>
        <FailureNotice answer={refusal} />
      </form>
    </section>
  );
}
