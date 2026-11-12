"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "@/components/ui/classes";

// "tall": on screens under 700 px high the bar sits at the page end, so it never hides what the button commits to.
// The failure toast sits above the pinned bar, not over Back and Continue (proto.css reads --pinned-bar).
function usePinnedBarHeight() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bar.current!;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => root.style.setProperty("--pinned-bar", `${getComputedStyle(el).position === "sticky" ? el.offsetHeight : 0}px`));
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--pinned-bar");
    };
  }, []);
  return bar;
}

export function Columns({ main, actions, aside, pin = "always" }: { main: ReactNode; actions: ReactNode; aside: ReactNode; pin?: "always" | "tall" }) {
  const bar = usePinnedBarHeight();
  return (
    <div className="lg:grid lg:min-h-[calc(100dvh-4.5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[680px_minmax(0,1fr)]">
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col md:min-h-[calc(100dvh-4.5rem)]">
        <main className="flex flex-1 justify-center px-5 py-8 md:px-10 lg:py-12">
          <div className="flex w-full max-w-[440px] flex-col gap-4">{main}</div>
        </main>
        <div ref={bar} className={cx(pin === "always" ? "sticky" : "[@media(min-height:700px)]:sticky", "bottom-0 border-t border-vellum-line bg-paper/90 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] backdrop-blur-sm md:px-10")}>
          <div className="mx-auto max-w-[440px]">{actions}</div>
        </div>
      </div>
      <aside aria-label="Preview of This week" className="hidden bg-vellum p-8 lg:block xl:p-12">
        <div className="sticky top-12">{aside}</div>
      </aside>
    </div>
  );
}
