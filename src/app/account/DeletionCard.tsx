"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { GoogleButton } from "@/components/signIn/GoogleButton";
import { FOCUS, MOTION, cx } from "@/components/ui/classes";
import { ADMIN_RESTRICTED_ACTION_MESSAGE } from "@/lib/accessControl";
import { deleteAccount, signInAgainToDelete } from "./actions";

const REMOVED = ["Your profile", "Approved and legacy analytics snapshots", "Weekly schedules", "Activity check-ins"];

export function DeletionCard({ admin, signedInRecently }: { admin: boolean; signedInRecently: boolean }) {
  return (
    <section
      id="delete-account"
      className="flex flex-col gap-8 rounded-md border border-vellum-line bg-paper p-5 md:flex-row md:justify-between md:gap-16 md:p-8"
    >
      <div className="flex max-w-[560px] grow flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-h4 font-semibold text-danger-ink">Delete account</h2>
          <p className="text-body text-smoke">This permanently removes from active storage:</p>
        </div>
        <ul className="border-t border-vellum-line">
          {REMOVED.map((item) => (
            <li key={item} className="border-b border-vellum-line py-3 text-body text-ink">
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex shrink-0 flex-col justify-end md:w-[360px]">
        {admin ? <AdminNotice /> : <DeletionForm signedInRecently={signedInRecently} />}
      </div>
    </section>
  );
}

function AdminNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xs bg-vellum p-5">
      <svg aria-hidden width="20" height="20" viewBox="0 0 16 16" className="shrink-0 stroke-smoke" fill="none" strokeWidth="1.1" strokeLinecap="round">
        <circle cx="8" cy="8" r="6.5" />
        <path d="M8 7.25V11" />
        <circle cx="8" cy="5" r="0.75" className="fill-smoke stroke-none" />
      </svg>
      <div className="flex flex-col gap-1">
        <p className="text-body leading-[20px] font-medium text-ink">Admin account</p>
        <p className="text-small leading-[20px] text-smoke">{ADMIN_RESTRICTED_ACTION_MESSAGE}</p>
      </div>
    </div>
  );
}

function DeletionForm({ signedInRecently }: { signedInRecently: boolean }) {
  const [refusal, formAction] = useActionState(deleteAccount, null);

  if (!signedInRecently || refusal === "sign-in-too-old") {
    return (
      <form action={signInAgainToDelete} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-body font-medium text-ink">Sign in again to delete</p>
          <p className="text-small leading-[20px] text-smoke">
            Deleting your account needs a Google sign-in from the last 10 minutes.
          </p>
        </div>
        <GoogleButton />
      </form>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <ConfirmationFields wrongText={refusal === "wrong-text"} />
    </form>
  );
}

function ConfirmationFields({ wrongText }: { wrongText: boolean }) {
  const { pending } = useFormStatus();
  const [confirmation, setConfirmation] = useState("");
  const invalid = wrongText && !pending;
  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor="deletion-confirmation" className="text-small font-medium text-ink">
          Type DELETE to confirm
        </label>
        <input
          id="deletion-confirmation"
          name="confirmation"
          autoComplete="off"
          placeholder="DELETE"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          readOnly={pending}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "deletion-confirmation-message" : undefined}
          className={cx(
            "h-11 rounded-sm border px-3 font-mono text-body text-ink placeholder:text-fog read-only:bg-vellum read-only:text-fog",
            invalid ? "border-danger-ink" : "border-vellum-line",
            FOCUS,
          )}
        />
        {invalid && (
          <p id="deletion-confirmation-message" className="text-small text-danger-ink">
            Type DELETE in capital letters to confirm.
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className={cx(
          "flex h-11 items-center justify-center rounded-sm border border-danger bg-paper text-body leading-[20px] font-medium text-danger-ink",
          "hover:bg-danger/faint disabled:opacity-strong",
          MOTION,
          FOCUS,
        )}
      >
        {pending ? "Deleting…" : "Delete account"}
      </button>
      {pending && <p className="text-small text-smoke">Deleting your account. This takes a few seconds.</p>}
    </>
  );
}
