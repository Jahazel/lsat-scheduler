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
        observer.disconnect();
        section.dataset.reveal = "shown";
      },
      { threshold },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <section ref={ref} {...props}>
      {children}
    </section>
  );
}
