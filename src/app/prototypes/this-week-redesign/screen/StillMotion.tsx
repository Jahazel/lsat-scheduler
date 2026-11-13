"use client";

import { useLayoutEffect } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function StillMotion({ on }: { on: boolean }) {
  useLayoutEffect(() => {
    document.documentElement.toggleAttribute("data-proto-still", on);
    if (!on) return;
    const real = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => (query.includes("prefers-reduced-motion") ? { ...real(query), matches: query.includes("reduce"), media: QUERY } : real(query));
    return () => {
      window.matchMedia = real;
    };
  }, [on]);

  return null;
}
