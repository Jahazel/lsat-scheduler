"use client";

import { useEffect, useLayoutEffect } from "react";

export function StillMotion({ on }: { on: boolean }) {
  useLayoutEffect(() => {
    document.documentElement.toggleAttribute("data-proto-still", on);
  }, [on]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      parent.postMessage({ type: "key", key: event.key }, location.origin);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  return null;
}
