import { useEffect, useRef } from "react";

export function usePinnedBarHeight() {
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
