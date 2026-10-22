"use client";

import Image from "next/image";
import { useFormStatus } from "react-dom";
import { FOCUS, MOTION, cx } from "@/components/ui/classes";

export function GoogleButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cx(
        "flex h-12 w-full items-center justify-center gap-3 rounded-sm border border-ink bg-ink text-body leading-[20px] font-medium text-chalk",
        "hover:bg-graphite-raised disabled:opacity-muted",
        MOTION,
        FOCUS,
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-paper">
        <Image src="/google-g.svg" alt="" width={14} height={14} />
      </span>
      Continue with Google
    </button>
  );
}
