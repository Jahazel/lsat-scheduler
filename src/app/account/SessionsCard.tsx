"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { SignOutForm } from "@/components/FailureNotice";
import { FOCUS, MOTION, cx } from "@/components/ui/classes";
import { signOutAllDevices } from "./actions";

const BUTTON = "flex h-11 shrink-0 items-center justify-center rounded-sm px-5 text-body leading-[20px] font-medium";
const OUTLINE = cx(BUTTON, "border border-vellum-line bg-paper text-ink hover:bg-vellum disabled:text-fog", MOTION, FOCUS);

export function SessionsCard() {
  const [confirming, setConfirming] = useState(false);
  return (
    <section className="flex flex-col gap-6 rounded-md border border-vellum-line bg-paper p-5 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-16">
        <div className="flex flex-col gap-2">
          <h2 className="text-h4 font-semibold text-ink">Sessions</h2>
          <p className="text-body text-smoke">Sign out of every browser and device where you use DrillMap, including this one.</p>
        </div>
        {!confirming && (
          <button type="button" onClick={() => setConfirming(true)} className={OUTLINE}>
            Sign out of all devices
          </button>
        )}
      </div>
      {confirming && (
        <SignOutForm
          action={signOutAllDevices}
          className="flex flex-col gap-4 rounded-xs bg-vellum px-6 py-5 md:flex-row md:items-center md:justify-between md:gap-8"
        >
          <div className="flex flex-col gap-1">
            <p className="text-body font-medium text-ink">Sign out of all devices?</p>
            <p className="text-small text-smoke">You will need to sign in again on each one, including this browser.</p>
          </div>
          <ConfirmButtons onCancel={() => setConfirming(false)} />
        </SignOutForm>
      )}
    </section>
  );
}

function ConfirmButtons({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex shrink-0 flex-col-reverse gap-3 sm:flex-row">
      <button type="button" onClick={onCancel} disabled={pending} className={cx(OUTLINE, "sm:w-28")}>
        Cancel
      </button>
      <button
        type="submit"
        disabled={pending}
        className={cx(BUTTON, "sm:min-w-52 bg-ink text-chalk hover:bg-graphite-raised disabled:opacity-strong", MOTION, FOCUS)}
      >
        {pending ? "Signing out…" : "Sign out of all devices"}
      </button>
    </div>
  );
}
