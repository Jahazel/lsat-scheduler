"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export const SIGN_IN_EXPIRED = "Your sign-in expired. Sign in again, then upload your screenshot again.";

export function SignInAgainLink({ className, ref }: { className: string; ref?: React.Ref<HTMLAnchorElement> }) {
  return (
    <Link ref={ref} href="/login" className={className}>
      Sign in again
    </Link>
  );
}

export default function SignInExpired() {
  const link = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const focus = document.activeElement;
    if (focus === document.body || link.current?.closest("section")?.contains(focus)) link.current?.focus();
  }, []);

  return (
    <p role="alert" className="text-sm text-red-600">
      {SIGN_IN_EXPIRED}{" "}
      <SignInAgainLink ref={link} className="font-medium text-ink-900 underline underline-offset-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600" />
    </p>
  );
}
