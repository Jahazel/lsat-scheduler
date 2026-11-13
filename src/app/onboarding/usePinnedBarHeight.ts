import { useEffect, useRef } from "react";

export function usePinnedBarHeight() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bar.current!;
    const root = document.documentElement;
    const update = () => root.style.setProperty("--pinned-bar", `${getComputedStyle(el).position === "sticky" ? el.offsetHeight : 0}px`);
    const observer = new ResizeObserver(update);
    observer.observe(el);
    addEventListener("resize", update);
    return () => {
      observer.disconnect();
      removeEventListener("resize", update);
      root.style.removeProperty("--pinned-bar");
    };
  }, []);
  return bar;
}
