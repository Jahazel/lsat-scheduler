"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { FOCUS_INSET, cx } from "@/components/ui/classes";

export type LegalPageId = "terms" | "privacy" | "ai-disclosure";

const TABS: { id: LegalPageId; label: string }[] = [
  { id: "terms", label: "Terms" },
  { id: "privacy", label: "Privacy" },
  { id: "ai-disclosure", label: "AI disclosure" },
];

const TAB_END_ROOM_PX = 24;

export function LegalTabs({ current }: { current: LegalPageId }) {
  const nav = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const bar = nav.current;
    const tab = bar?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!bar || !tab) return;
    const end = tab.offsetLeft + tab.offsetWidth - bar.offsetLeft;
    if (end > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = end - bar.clientWidth + TAB_END_ROOM_PX;
  }, [current]);

  return (
    <nav
      ref={nav}
      aria-label="Legal pages"
      className="-mx-6 mt-10 flex gap-6 overflow-x-auto overscroll-x-contain px-6 [scrollbar-width:none] md:mx-0 md:gap-8 md:px-0"
    >
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={`/legal/${tab.id}`}
          aria-current={tab.id === current ? "page" : undefined}
          className={cx(
            "flex h-11 shrink-0 touch-manipulation items-center border-b-2 text-small whitespace-nowrap select-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] active:text-ink",
            "transition-[color,border-color] duration-(--duration-fast) ease-[ease] motion-reduce:transition-none",
            tab.id === current ? "border-ink font-medium text-ink" : "border-transparent text-smoke pointer-hover:text-ink",
            FOCUS_INSET,
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
