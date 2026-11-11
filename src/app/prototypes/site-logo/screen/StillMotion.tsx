"use client";

import { useLayoutEffect } from "react";

export function StillMotion({ on }: { on: boolean }) {
  useLayoutEffect(() => {
    document.documentElement.toggleAttribute("data-proto-still", on);
  }, [on]);

  return null;
}
