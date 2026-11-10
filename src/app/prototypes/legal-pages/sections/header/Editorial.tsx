"use client";

import { useLayoutEffect, useRef } from "react";
import { FOCUS_INSET, cx } from "@/components/ui/classes";
import { useProtoView } from "../../protoContext";
import { SwitcherLink } from "./SwitcherLink";

export function EditorialHeader({ column }: { column: string }) {
  const { page, pages } = useProtoView();
  const nav = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const current = nav.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav.current || !current) return;
    const { scrollLeft, clientWidth } = nav.current;
    const end = current.offsetLeft + current.offsetWidth - nav.current.offsetLeft;
    if (end > scrollLeft + clientWidth) nav.current.scrollLeft = end - clientWidth + 24;
  }, [page.id]);
  return (
      <header className="border-b border-vellum-line px-6 pt-14 md:pt-24">
        <div className={column}>
          <p className="font-mono text-label uppercase text-smoke">Legal</p>
          <h1 tabIndex={-1} className="mt-3 text-h3 font-semibold text-balance text-ink outline-none md:text-h2">{page.title}</h1>
          {page.dateLine && <p className="mt-4 text-small text-smoke">{page.dateLine}</p>}
          <nav ref={nav} aria-label="Legal pages" className="-mx-6 mt-10 flex gap-6 overflow-x-auto overscroll-x-contain px-6 [scrollbar-width:none] md:mx-0 md:gap-8 md:px-0">
            {pages.map((item) => (
              <SwitcherLink
                key={item.id}
                page={item}
                current={item.id === page.id}
                className={cx(
                  "flex h-11 shrink-0 touch-manipulation select-none items-center [-webkit-touch-callout:none] whitespace-nowrap border-b-2 text-small active:text-ink",
                  "transition-[color,border-color] duration-(--duration-fast) ease-[ease] motion-reduce:transition-none",
                  item.id === page.id ? "border-ink font-medium text-ink" : "border-transparent text-smoke pointer-hover:text-ink",
                  FOCUS_INSET,
                )}
              />
            ))}
          </nav>
        </div>
      </header>
  );
}
