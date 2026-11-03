"use client";

import Image from "next/image";
import { useState, type KeyboardEvent } from "react";
import { FOCUS, cx } from "@/components/ui/classes";

const SCREENS = [
  {
    id: "week",
    tab: "This week",
    src: "/landing/hero-this-week.png",
    alt: "This week screen: Saturday and Sunday drills with check boxes",
  },
  {
    id: "progress",
    tab: "Progress",
    src: "/landing/hero-progress.png",
    alt: "Progress screen: past weekly schedules by month, each with a done count",
  },
] as const;

const PILL_CLIP_BY_TAB = ["inset(0 calc(50% + 2px) 0 0 round var(--radius-sm))", "inset(0 0 0 calc(50% + 2px) round var(--radius-sm))"];

const TAB = "flex h-9 items-center justify-center rounded-sm px-5 text-small leading-[18px] font-medium";

export function HeroScreens() {
  const [shown, setShown] = useState({ index: 0, reduced: false });

  function select(index: number) {
    setShown({ index, reduced: matchMedia("(prefers-reduced-motion: reduce)").matches });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const count = SCREENS.length;
    const to = { ArrowRight: (shown.index + 1) % count, ArrowLeft: (shown.index + count - 1) % count, Home: 0, End: count - 1 }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    document.getElementById(`hero-tab-${SCREENS[to].id}`)?.focus();
    select(to);
  }

  const fade = shown.reduced ? "var(--duration-fast)" : "var(--duration-base)";

  return (
    <>
      <div className="pb-5">
        <div role="tablist" aria-label="Inside the app" onKeyDown={onKeyDown} className="relative grid grid-cols-2 gap-1 rounded-xs bg-vellum-line p-1">
          {SCREENS.map(({ id, tab }, index) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`hero-tab-${id}`}
              aria-controls={`hero-panel-${id}`}
              aria-selected={index === shown.index}
              tabIndex={index === shown.index ? 0 : -1}
              onClick={() => select(index)}
              className={cx(TAB, "text-smoke", FOCUS)}
            >
              {tab}
            </button>
          ))}
          <div
            aria-hidden="true"
            data-testid="hero-tab-pill"
            className="pointer-events-none absolute inset-1 grid grid-cols-2 gap-1"
            style={{
              clipPath: PILL_CLIP_BY_TAB[shown.index],
              transition: shown.reduced ? "none" : "clip-path var(--duration-base) var(--ease-in-out-strong)",
            }}
          >
            {SCREENS.map(({ id, tab }) => (
              <span key={id} className={cx(TAB, "bg-paper text-ink shadow-control")}>{tab}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="relative flex w-full justify-center">
        <div aria-hidden="true" className="hero-glow pointer-events-none absolute top-1/2 left-1/2 -z-10 w-screen -translate-1/2" />
        <div className="relative h-[460px] w-full overflow-clip rounded-md bg-paper shadow-e2 md:h-[432px] md:w-[672px] lg:h-[720px] lg:w-[min(1120px,calc(100%-48px))]">
          {SCREENS.map(({ id, src, alt }, index) => {
            const on = index === shown.index;
            return (
              <div
                key={id}
                id={`hero-panel-${id}`}
                role="tabpanel"
                aria-labelledby={`hero-tab-${id}`}
                tabIndex={on ? 0 : -1}
                className={cx("absolute inset-0", FOCUS)}
                style={{
                  opacity: on ? 1 : 0,
                  visibility: on ? "visible" : "hidden",
                  transition: `opacity ${fade} var(--ease-out-strong), visibility 0s linear ${on ? "0s" : fade}`,
                }}
              >
                <Image
                  src={src}
                  alt={alt}
                  width={1440}
                  height={926}
                  sizes="(min-width: 1024px) 1120px, (min-width: 768px) 672px, 840px"
                  loading={index === 0 ? "eager" : "lazy"}
                  className="h-auto w-[840px] max-w-none md:w-[672px] lg:w-[1120px]"
                />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
