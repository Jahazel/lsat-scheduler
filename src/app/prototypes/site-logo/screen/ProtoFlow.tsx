"use client";

import { useEffect } from "react";
import { durationMs, motionToken, reducedMotion } from "@/lib/motion";
import type { Scene } from "../view";

const KEY = "site-logo-glide-from";
const TARGETS: Record<string, Scene> = { "/": "bars", "/dashboard": "bars", "/admin": "bars", "/login": "login", "/signup": "signup" };

const visibleLogo = () => [...document.querySelectorAll<HTMLElement>("[data-proto-scene] [data-page-logo]")].find((logo) => logo.getBoundingClientRect().width > 0);

export function ProtoFlow() {
  useEffect(() => {
    const from = sessionStorage.getItem(KEY);
    const frame = requestAnimationFrame(() => {
      sessionStorage.removeItem(KEY);
      const logo = visibleLogo();
      if (!from || !logo || reducedMotion() || document.documentElement.hasAttribute("data-proto-still")) return;
      const rect = JSON.parse(from) as { left: number; top: number };
      const to = logo.getBoundingClientRect();
      const x = rect.left - to.left;
      const y = rect.top - to.top;
      if (Math.abs(x) + Math.abs(y) < 0.5) return;
      logo.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: "none" }], {
        duration: durationMs("--duration-base"),
        easing: motionToken("--ease-standard"),
      });
    });

    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("[data-proto-scene] a[href]");
      if (!link) return;
      event.preventDefault();
      const scene = TARGETS[new URL(link.href).pathname];
      if (!scene) return;
      const now = visibleLogo()?.getBoundingClientRect();
      if (now) sessionStorage.setItem(KEY, JSON.stringify({ left: now.left, top: now.top }));
      if (parent !== window) parent.postMessage({ type: "scene", scene }, location.origin);
      else location.search = `?scene=${scene}`;
    };
    document.addEventListener("click", onClick, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
