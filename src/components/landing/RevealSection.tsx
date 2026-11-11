"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";

type RevealSectionProps = ComponentPropsWithoutRef<"section"> & { threshold: number };

export function RevealSection({ threshold, children, ...props }: RevealSectionProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section || section.getBoundingClientRect().top < innerHeight) return;

    section.dataset.reveal = "waiting";
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        stop();
        section.dataset.reveal = "shown";
      },
      { threshold },
    );
    const showOnJump = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (!section.id || link?.hash !== `#${section.id}` || link.pathname !== location.pathname) return;
      stop();
      delete section.dataset.reveal;
    };
    const stop = () => {
      observer.disconnect();
      document.removeEventListener("click", showOnJump);
    };
    observer.observe(section);
    document.addEventListener("click", showOnJump);
    return stop;
  }, [threshold]);

  return (
    <section ref={ref} {...props}>
      {children}
    </section>
  );
}
