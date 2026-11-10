"use client";

import { useEffect, useState, type ReactNode } from "react";
import { setAddress, useProtoView } from "../../protoContext";

export type CopyState = "idle" | "copied" | "failed";

export function CopyLink({ id, title, className, children }: { id: string; title: string; className: string; children: (state: CopyState) => ReactNode }) {
  const { page } = useProtoView();
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 1600);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    setAddress(id);
    try {
      await navigator.clipboard.writeText(`${location.origin}/legal/${page.id}#${id}`);
      setState("copied");
    } catch {
      setState("failed");
    }
  };

  return (
    <>
      <button type="button" data-state={state} aria-label={`Copy link to “${title}”`} onClick={copy} className={className}>
        {children(state)}
      </button>
      <span role="status" className="sr-only">
        {state === "copied" ? "Link copied" : state === "failed" ? "Could not copy the link" : ""}
      </span>
    </>
  );
}

export function LinkIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className}>
      <path d="M6.5 9.5l3-3M7 4.5l1-1a2.83 2.83 0 014 4l-1 1M9 11.5l-1 1a2.83 2.83 0 01-4-4l1-1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className}>
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
