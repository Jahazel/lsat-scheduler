"use client";

import { useEffect, useState } from "react";
import { setAddress } from "../../protoContext";

const JUMP = "legal:jump";
const stillMotion = () => !!document.querySelector("[data-rm]") || matchMedia("(prefers-reduced-motion: reduce)").matches;

const headerHeight = () => document.querySelector<HTMLElement>("[data-site-header]")?.offsetHeight ?? 0;

export function useActiveSection(ids: string[], readingLine: number) {
  const [active, setActive] = useState(ids[0] ?? "");
  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>("[data-stage]");
    if (!scroller || !ids.length) return;
    let tapped: string | null = null;
    const update = () => {
      if (tapped) return setActive(tapped);
      const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
      const line = atEnd ? scroller.getBoundingClientRect().bottom : scroller.getBoundingClientRect().top + headerHeight() + readingLine + 1;
      let current = ids[0];
      for (const id of ids) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= line) current = id;
      }
      setActive(current);
    };
    const onJump = (event: Event) => {
      tapped = (event as CustomEvent<string>).detail;
      update();
    };
    const release = () => {
      tapped = null;
    };
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener(JUMP, onJump);
    for (const type of ["wheel", "touchmove", "keydown"]) window.addEventListener(type, release, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", update);
      window.removeEventListener(JUMP, onJump);
      for (const type of ["wheel", "touchmove", "keydown"]) window.removeEventListener(type, release);
    };
  }, [ids, readingLine]);
  return active;
}

export const markSection = (id: string) => window.dispatchEvent(new CustomEvent(JUMP, { detail: id }));

export function jumpTo(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  markSection(id);
  section.scrollIntoView({ behavior: stillMotion() ? "auto" : "smooth", block: "start" });
  setAddress(id);
  section.querySelector("h2")?.focus({ preventScroll: true });
}
