"use client";

import { useLayoutEffect, useRef } from "react";

export function NightBand() {
  const ref = useRef<HTMLDivElement>(null);

  // The band's own light dots must sit on the page's dot rows, which start at the top of the grid.
  useLayoutEffect(() => {
    const band = ref.current;
    const grid = band?.closest<HTMLElement>(".proto-grid");
    if (!band || !grid) return;
    const align = () => {
      const offset = band.getBoundingClientRect().top - grid.getBoundingClientRect().top;
      band.style.setProperty("--dot-y", `${-offset}px`);
    };
    align();
    const resizes = new ResizeObserver(align);
    resizes.observe(grid);
    return () => resizes.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="close-band pointer-events-none absolute inset-y-0 left-1/2 -z-[5] w-[100cqw] -translate-x-1/2">
      <div className="close-band-light proto-grid-dots absolute inset-0" />
      <div className="close-band-light proto-grid-lines proto-grid-edges" />
      <div className="close-band-light proto-grid-lines close-band-middle" />
    </div>
  );
}
