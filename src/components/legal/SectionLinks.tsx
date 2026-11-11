"use client";

import { createContext, use, useEffect, useRef, useState, type ReactNode } from "react";
import { FOCUS, cx } from "@/components/ui/classes";
import type { LegalPageId } from "./pages";

type CopyResult = "copied" | "failed";

const RESULT_MS = 1600;
const ANNOUNCEMENT: Record<CopyResult, string> = { copied: "Link copied", failed: "Could not copy the link" };

const CopyContext = createContext<{ page: LegalPageId; announce: (result: CopyResult) => void } | null>(null);

export function SectionLinks({ page, children }: { page: LegalPageId; children: ReactNode }) {
  const [announcement, setAnnouncement] = useState<{ result: CopyResult; at: number } | null>(null);

  useEffect(() => {
    const id = location.hash.slice(1);
    if (id) document.getElementById(id)?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!announcement) return;
    const timer = setTimeout(() => setAnnouncement(null), RESULT_MS);
    return () => clearTimeout(timer);
  }, [announcement]);

  return (
    <CopyContext value={{ page, announce: (result) => setAnnouncement({ result, at: Date.now() }) }}>
      {children}
      <div role="status" className="sr-only">
        {announcement && <span key={announcement.at}>{ANNOUNCEMENT[announcement.result]}</span>}
      </div>
    </CopyContext>
  );
}

const SWAP = "transition-[opacity,scale] duration-(--duration-fast) ease-(--ease-out-strong) motion-reduce:transition-none";

export function CopySectionLink({ id, title }: { id: string; title: string }) {
  const { page, announce } = use(CopyContext)!;
  const [result, setResult] = useState<CopyResult | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    history.replaceState(history.state, "", `#${id}`);
    let next: CopyResult = "copied";
    try {
      await navigator.clipboard.writeText(`${location.origin}/legal/${page}#${id}`);
    } catch {
      next = "failed";
    }
    clearTimeout(timer.current);
    setResult(next);
    announce(next);
    timer.current = setTimeout(() => setResult(null), RESULT_MS);
  }

  return (
    <button
      type="button"
      aria-label={`Copy link to ${title}`}
      onClick={copy}
      className={cx(
        "relative mt-1 flex h-7 shrink-0 touch-manipulation items-center gap-1.5 rounded-xs px-1.5 text-fog select-none",
        "[-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] active:text-ink pointer-hover:text-ink before:absolute before:-inset-2",
        "transition-opacity duration-(--duration-fast) ease-[ease]",
        result ? "opacity-100" : "pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100",
        FOCUS,
      )}
    >
      <span className="grid size-4 place-items-center">
        <LinkIcon className={cx("col-start-1 row-start-1 size-4", SWAP, result === "copied" && "scale-75 opacity-0")} />
        <CheckIcon className={cx("col-start-1 row-start-1 size-4 text-success-ink", SWAP, result !== "copied" && "scale-75 opacity-0")} />
      </span>
      {result && (
        <span
          aria-hidden
          className={cx(
            "animate-[legal-copy-label-in_var(--duration-fast)_var(--ease-out-strong)] text-caption whitespace-nowrap motion-reduce:animate-none",
            result === "copied" ? "text-success-ink" : "text-danger-ink",
          )}
        >
          {result === "copied" ? "Copied" : "Couldn’t copy"}
        </span>
      )}
    </button>
  );
}

function LinkIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className}>
      <path d="M6.5 9.5l3-3M7 4.5l1-1a2.83 2.83 0 014 4l-1 1M9 11.5l-1 1a2.83 2.83 0 01-4-4l1-1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className}>
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
