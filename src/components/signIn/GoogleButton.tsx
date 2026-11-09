"use client";

import Image from "next/image";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { FOCUS, MOTION, cx } from "@/components/ui/classes";
import { noteGoogleArrival } from "@/lib/googleArrival";

const LOOKS = {
  dark: "border-ink bg-ink text-chalk hover:bg-graphite-raised",
  light: "border-vellum-line bg-paper text-ink hover:bg-vellum",
};

export function GoogleButton({ look = "dark", fadesNextPage = false }: { look?: keyof typeof LOOKS; fadesNextPage?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="bare"
      waiting={pending}
      onClick={fadesNextPage ? noteGoogleArrival : undefined}
      className={cx(
        "flex h-12 w-full items-center justify-center rounded-sm border text-body leading-[20px] font-medium",
        LOOKS[look],
        MOTION,
        FOCUS,
      )}
    >
      <span className="inline-flex items-center gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-paper">
          <Image src="/google-g.svg" alt="" width={14} height={14} />
        </span>
        Continue with Google
      </span>
    </Button>
  );
}
