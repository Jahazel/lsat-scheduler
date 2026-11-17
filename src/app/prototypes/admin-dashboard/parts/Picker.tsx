"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function Picker({ names, active, onPick, onReplay }: { names: string[]; active: number; onPick: (i: number) => void; onReplay?: () => void }) {
  const nav = useRef<HTMLElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const [highlight, setHighlight] = useState({ x: 0, w: 0 });
  const [ready, setReady] = useState(false);
  const [top, setTop] = useState(false);
  useEffect(() => {
    const phone = matchMedia("(max-width: 767px)");
    const update = () => setTop(phone.matches);
    update();
    phone.addEventListener("change", update);
    return () => phone.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    const measure = () => {
      const el = items.current[active];
      if (el) setHighlight({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    addEventListener("resize", measure);
    return () => removeEventListener("resize", measure);
  }, [active]);

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= names.length) onPick(num - 1);
      else if (e.key === "ArrowRight") onPick((active + 1) % names.length);
      else if (e.key === "ArrowLeft") onPick((active - 1 + names.length) % names.length);
      else if ((e.key === "r" || e.key === "R") && onReplay) onReplay();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [active, names.length, onPick, onReplay]);

  return (
    <nav ref={nav} className="proto-picker" data-position={top ? "above-tabs" : undefined} aria-label="Prototype variants" data-ready={ready || undefined}>
      <span className="proto-picker-highlight" aria-hidden style={{ width: highlight.w, transform: `translateX(${highlight.x}px)` }} />
      {names.map((name, i) => (
        <button key={name} ref={(el) => { items.current[i] = el; }} type="button" className="proto-picker-item" data-active={i === active || undefined} aria-current={i === active ? "true" : undefined} onClick={() => onPick(i)}>
          {name}
        </button>
      ))}
      {onReplay && <>
        <span className="proto-picker-divider" aria-hidden />
        <button type="button" className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" onClick={onReplay}>↻</button>
      </>}
    </nav>
  );
}
