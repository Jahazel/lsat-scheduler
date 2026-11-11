"use client";

import { useLayoutEffect, useRef } from "react";

export function NightBand() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const band = ref.current;
    const grid = band?.closest<HTMLElement>(".line-grid");
    if (!band || !grid) return;
    const putDotsOnPageRows = () => {
      const offset = band.getBoundingClientRect().top - grid.getBoundingClientRect().top;
      band.style.setProperty("--dot-y", `${-offset}px`);
    };
    putDotsOnPageRows();
    const resizes = new ResizeObserver(putDotsOnPageRows);
    resizes.observe(grid);
    return () => resizes.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="start-band pointer-events-none absolute inset-y-0 left-1/2 -z-[5] w-[100cqw] -translate-x-1/2">
      <div className="start-band-light line-grid-dots absolute inset-0" />
      <div className="start-band-light line-grid-lines line-grid-edges" />
      <div className="start-band-light line-grid-lines start-band-middle" />
    </div>
  );
}
