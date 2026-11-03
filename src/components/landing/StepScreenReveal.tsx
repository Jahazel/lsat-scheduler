"use client";

import { useEffect, useRef, type ReactNode } from "react";

const HIDDEN = "inset(100% 0 0 0)";
const SHOWN_WITH_SHADOW_ROOM = "inset(-40px -64px -88px -64px)";

function isAbove(screen: Element, hash: string) {
  const target = hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
  return !!target && screen.getBoundingClientRect().top < target.getBoundingClientRect().top;
}

export function StepScreenReveal({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const screen = ref.current;
    if (!screen) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (screen.getBoundingClientRect().top <= innerHeight || isAbove(screen, location.hash)) return;

    screen.style.clipPath = HIDDEN;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        stop();
        screen.style.transition = "clip-path var(--duration-reveal) var(--ease-out-strong)";
        screen.style.clipPath = SHOWN_WITH_SHADOW_ROOM;
      },
      { rootMargin: "0px 0px -100px 0px" },
    );
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement)) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname) return;
      if (!isAbove(screen, url.hash)) return;
      stop();
      screen.style.clipPath = "";
    };
    const stop = () => {
      observer.disconnect();
      document.removeEventListener("click", onClick);
    };
    observer.observe(screen);
    document.addEventListener("click", onClick);
    return stop;
  }, []);

  return (
    <div ref={ref} data-testid="step-screen" className={className}>
      {children}
    </div>
  );
}
