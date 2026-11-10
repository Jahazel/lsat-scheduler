"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FOCUS, FOCUS_INSET, cx } from "@/components/ui/classes";
import CalmProse from "../body/CalmProse";
import { useProtoView } from "../../protoContext";
import { EditorialHeader } from "../header/Editorial";
import { RAIL_RIGHT } from "./columns";
import { jumpTo, useActiveSection } from "./sectionNav";

const LINK = "transition-colors duration-(--duration-fast) ease-[ease] pointer-hover:text-ink motion-reduce:transition-none aria-[current]:text-ink";

export default function JumpBar() {
  const { page } = useProtoView();
  const sections = useMemo(() => page.sections ?? [], [page.sections]);
  const ids = useMemo(() => sections.map((section) => section.id), [sections]);
  const [wide, setWide] = useState(true);
  const active = useActiveSection(ids, wide ? 32 : 64);
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const markedPage = useRef(page.id);
  const list = useRef<HTMLOListElement>(null);
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const query = matchMedia("(min-width: 1024px)");
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        setOpen(false);
        toggle.current?.focus();
      } else if (!bar.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  useLayoutEffect(() => {
    const item = list.current?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!item || !marker.current) return;
    const newPage = markedPage.current !== page.id;
    markedPage.current = page.id;
    marker.current.style.transition = newPage ? "none" : "";
    marker.current.style.transform = `translateY(${item.offsetTop}px) scaleY(${item.offsetHeight})`;
    if (newPage) {
      void marker.current.offsetHeight;
      marker.current.style.transition = "";
    }
  }, [active, ids, wide, page.id]);

  const current = sections.find((section) => section.id === active);
  const pick = (id: string) => {
    setOpen(false);
    jumpTo(id);
  };

  return (
    <div data-page-section className="max-lg:[&_section]:scroll-mt-[calc(var(--site-header)+4rem)]">
      <EditorialHeader column={RAIL_RIGHT.header} />
      {sections.length > 0 && (
        <div ref={bar} className="sticky top-(--site-header) z-30 border-b border-vellum-line bg-paper px-6 lg:hidden">
          <button
            ref={toggle}
            type="button"
            aria-expanded={open}
            aria-controls="jump-list"
            onClick={() => setOpen((value) => !value)}
            className={cx("mx-auto flex h-12 w-full max-w-2xl touch-manipulation items-center gap-3 text-left select-none [-webkit-touch-callout:none] active:opacity-70", FOCUS_INSET)}
          >
            <span className="shrink-0 font-mono text-label uppercase text-smoke">On this page</span>
            <span className="min-w-0 flex-1 truncate text-small font-medium text-ink">{current?.title}</span>
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              className={cx("size-4 shrink-0 text-smoke transition-transform duration-(--duration-base) ease-(--ease-out-strong) motion-reduce:transition-none", open && "rotate-180")}
            >
              <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div
            id="jump-list"
            data-open={open || undefined}
            className={cx(
              "absolute inset-x-0 top-full origin-top border-b border-vellum-line bg-paper shadow-e1",
              "transition-[opacity,transform,visibility] duration-(--duration-base) ease-(--ease-out-strong) motion-reduce:transition-none",
              "invisible -translate-y-1 opacity-0 data-open:visible data-open:translate-y-0 data-open:opacity-100",
            )}
          >
            <ol className="mx-auto max-h-[60dvh] max-w-2xl overflow-y-auto overscroll-contain px-6 py-2 md:px-0">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    aria-current={section.id === active ? "location" : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      pick(section.id);
                    }}
                    className={cx("flex min-h-11 touch-manipulation select-none items-center rounded-xs [-webkit-touch-callout:none] text-small text-smoke active:text-ink aria-[current]:font-medium", LINK, FOCUS)}
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
      <div className="px-6 pt-12 pb-16">
        <div className={RAIL_RIGHT.grid}>
          {sections.length > 0 && (
            <nav aria-label="On this page" className="hidden lg:sticky lg:top-[calc(var(--site-header)+2rem)] lg:col-start-2 lg:row-start-1 lg:block lg:self-start">
              <p className="font-mono text-label uppercase text-smoke">On this page</p>
              <div className="relative mt-4">
                <span
                  ref={marker}
                  aria-hidden
                  className="absolute top-0 left-0 z-10 h-px w-0.5 origin-top bg-ink transition-transform duration-(--duration-base) ease-(--ease-out-strong) motion-reduce:transition-none"
                />
                <ol ref={list} className="border-l border-vellum-line">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        aria-current={section.id === active ? "location" : undefined}
                        onClick={(event) => {
                          event.preventDefault();
                          jumpTo(section.id);
                        }}
                        className={cx("block touch-manipulation select-none rounded-r-xs py-1.5 pl-4 text-small text-smoke [-webkit-touch-callout:none] active:text-ink", LINK, FOCUS)}
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </nav>
          )}
          <div className={RAIL_RIGHT.text}>
            <CalmProse page={page} />
          </div>
        </div>
      </div>
    </div>
  );
}
