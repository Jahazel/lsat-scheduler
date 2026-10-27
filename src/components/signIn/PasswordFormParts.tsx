"use client";

import { useFormStatus } from "react-dom";
import { FOCUS, MOTION, cx } from "@/components/ui/classes";

export function OrWithEmail() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px grow bg-vellum-line" />
      <span className="font-mono text-label text-smoke uppercase">or with email</span>
      <span className="h-px grow bg-vellum-line" />
    </div>
  );
}

// useFormStatus never sees a form that submits by hand, so that form passes `pending`.
export function SubmitButton({ label, workingLabel, pending: submitting }: { label: string; workingLabel?: string; pending?: boolean }) {
  const pending = useFormStatus().pending || !!submitting;
  return (
    <button
      type="submit"
      disabled={pending}
      className={cx(
        "flex h-12 w-full items-center justify-center rounded-sm border border-ink bg-ink text-body leading-[20px] font-medium text-chalk",
        "hover:bg-graphite-raised disabled:opacity-muted",
        MOTION,
        FOCUS,
      )}
    >
      {pending && workingLabel ? workingLabel : label}
    </button>
  );
}
