"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FOCUS_INSET, cx } from "@/components/ui/classes";

type Card = {
  side: "left" | "right";
  place: string;
  width: string;
  dark?: boolean;
  motion: { delay: number; phoneDelay?: number; phase: number; rise: number };
  body: (t: ToneClasses) => ReactNode;
};

type ToneClasses = { face: string; dark: string; label: string; title: string; detail: string; muted: string; track: string; done: string; tick: string; tickStroke: string };

const T: ToneClasses = {
  face: "border-[#D9D9D9] bg-paper text-[#0B0B0B]",
  dark: "border-[#2B3B79] bg-[#2B3B79] text-paper",
  label: "text-[#5C5C5C]",
  title: "text-[#0B0B0B]",
  detail: "text-[#5C5C5C]",
  muted: "text-[#8A8A8A]",
  track: "bg-[#E4E4E4]",
  done: "text-success-ink",
  tick: "bg-[#0B0B0B]",
  tickStroke: "stroke-paper",
};

const LABEL = "flex items-center gap-2 font-mono text-caption tracking-[0.06em] uppercase";
const TITLE = "text-h5 font-semibold";
const DETAIL = "text-small text-balance";
const BIG = "text-[36px]/[40px] font-semibold tracking-[-0.03em]";
const DOT = { blue: "bg-[#7C8FD6]", silver: "bg-[#C9CED9]", deep: "bg-[#2B3B79]" };

function Label({ t, dot, children }: { t: ToneClasses; dot?: string; children: ReactNode }) {
  return (
    <p className={cx(LABEL, t.label)}>
      {dot && <span className={cx("size-2.5 shrink-0 rounded-pill", dot)} />}
      {children}
    </p>
  );
}

const CARDS: Card[] = [
  {
    side: "left",
    place: "-rotate-3 md:top-7 md:left-7 md:-rotate-6 min-[1360px]:top-[132px] min-[1360px]:left-[calc(50%-656px)]",
    width: "w-[200px] md:w-[216px] min-[1360px]:w-[236px]",
    motion: { delay: 120, phase: 0, rise: -60 },
    body: (t) => (
      <>
        <Label t={t} dot={DOT.blue}>Monday</Label>
        <p className={cx(TITLE, t.title)}>Sufficient assumption</p>
        <p className={cx(DETAIL, t.detail)}>3 drills · 45 min</p>
      </>
    ),
  },
  {
    side: "left",
    place: "rotate-2 md:top-[548px] md:left-3.5 md:rotate-4 min-[1360px]:top-[348px] min-[1360px]:left-[calc(50%-672px)]",
    width: "w-[210px] md:w-[214px] min-[1360px]:w-[212px]",
    motion: { delay: 240, phoneDelay: 180, phase: -2.8, rise: -110 },
    body: (t) => (
      <>
        <Label t={t}>PT score</Label>
        <p className={cx(BIG, t.title, "max-md:text-[30px]/[34px]")}>158 <span className={cx("font-regular", t.muted)}>→</span> 165</p>
        <p className={cx(DETAIL, t.detail)}>Goal by the January test</p>
      </>
    ),
  },
  {
    side: "left",
    place: "hidden min-[1360px]:block min-[1360px]:top-[546px] min-[1360px]:left-[calc(50%-624px)] min-[1360px]:-rotate-3",
    width: "w-max min-w-[228px] !flex-row items-center !gap-3 !px-4 !py-3.5",
    motion: { delay: 360, phase: -3.6, rise: -150 },
    body: (t) => (
      <>
        <span className={cx("grid size-6 shrink-0 place-items-center rounded-sm", t.tick)}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M3 7.2 L5.8 10 L11 4.2" fill="none" className={t.tickStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span>
          <span className={cx("block text-[15px]/[20px] font-medium whitespace-nowrap", t.title)}>Weaken · 12 questions</span>
          <span className={cx("block text-[13px]/[18px]", t.done)}>Done Tuesday</span>
        </span>
      </>
    ),
  },
  {
    side: "right",
    place: "hidden md:block md:top-5 md:right-7 md:rotate-5 min-[1360px]:top-[120px] min-[1360px]:right-auto min-[1360px]:left-[calc(50%+420px)]",
    width: "md:w-[220px] min-[1360px]:w-[252px]",
    motion: { delay: 180, phase: -1.4, rise: -80 },
    body: (t) => (
      <>
        <Label t={t} dot={DOT.silver}>Saturday</Label>
        <p className={cx(TITLE, t.title)}>Timed section</p>
        <p className="flex items-center gap-2">
          <span className={cx("h-1.5 w-24 overflow-hidden rounded-pill", t.track)}>
            <span className="block h-full w-3/5 rounded-pill bg-[#7C8FD6]" />
          </span>
          <span className={cx("font-mono text-caption whitespace-nowrap", t.detail)}>21 of 35 min</span>
        </p>
      </>
    ),
  },
  {
    side: "right",
    place: "hidden min-[1360px]:block min-[1360px]:top-[340px] min-[1360px]:left-[calc(50%+484px)] min-[1360px]:-rotate-5",
    width: "w-[188px] !gap-1 !p-[18px]",
    dark: true,
    motion: { delay: 300, phase: -0.7, rise: -130 },
    body: () => (
      <>
        <p className="text-[44px]/[46px] font-semibold tracking-[-0.03em]">125</p>
        <p className="text-small text-paper/72">days to test</p>
      </>
    ),
  },
  {
    side: "right",
    place: "-rotate-2 md:top-[594px] md:right-4 md:rotate-3 min-[1360px]:top-[536px] min-[1360px]:right-auto min-[1360px]:left-[calc(50%+400px)]",
    width: "w-[200px] md:w-[232px] min-[1360px]:w-[236px]",
    motion: { delay: 420, phoneDelay: 240, phase: -2.1, rise: -160 },
    body: (t) => (
      <>
        <Label t={t} dot={DOT.deep}>Weakest type</Label>
        <p className={cx(TITLE, t.title)}>Flaw</p>
        <p className={cx(DETAIL, t.detail)}>Missed 4 of 10 on your last PT</p>
      </>
    ),
  },
];

const PHONE_CARD_COUNT = 3;
const PULL_RADIUS = 200;
const SPRING_STIFFNESS = 0.12;
const SPRING_DAMPING = 0.72;

type Spring = { value: number; velocity: number; target: number };
type Pull = { face: HTMLElement; tilt: number; x: Spring; y: Spring; turn: Spring; near: Spring };

const spring = (): Spring => ({ value: 0, velocity: 0, target: 0 });

function stepSpring(s: Spring) {
  s.velocity = (s.velocity + (s.target - s.value) * SPRING_STIFFNESS) * SPRING_DAMPING;
  s.value += s.velocity;
  if (Math.abs(s.velocity) > 0.001 || Math.abs(s.target - s.value) > 0.001) return true;
  s.value = s.target;
  s.velocity = 0;
  return false;
}

export function HeroCards() {
  const rowRef = useRef<HTMLDivElement>(null);
  const [activeDot, setActiveDot] = useState(0);
  const [heroOffScreen, setHeroOffScreen] = useState(false);
  const [swipeRow, setSwipeRow] = useState(false);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const wide = matchMedia("(min-width: 48rem)");
    const sync = () => setSwipeRow(!wide.matches && row.scrollWidth > row.clientWidth + 1);
    const resizes = new ResizeObserver(sync);
    resizes.observe(row);
    wide.addEventListener("change", sync);
    return () => {
      resizes.disconnect();
      wide.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    const row = rowRef.current;
    const hero = row?.closest("section");
    if (!row || !hero) return;

    const visibility = new IntersectionObserver(([entry]) => setHeroOffScreen(!entry.isIntersecting));
    visibility.observe(hero);

    const pulls: Pull[] = [...row.querySelectorAll<HTMLElement>("[data-face]")].map((face) => ({
      face,
      tilt: 0,
      x: spring(),
      y: spring(),
      turn: spring(),
      near: spring(),
    }));
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;

    const pullAllowed = () =>
      innerWidth >= 768 &&
      matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !document.documentElement.hasAttribute("data-proto-still");

    function step() {
      frame = 0;
      let moving = false;
      for (const pull of pulls) {
        let strength = 0;
        let towardX = 0;
        let towardY = 0;
        const box = pull.face.getBoundingClientRect();
        if (pointer && box.width) {
          const dx = pointer.x - (box.left + box.width / 2);
          const dy = pointer.y - (box.top + box.height / 2);
          const distance = Math.hypot(dx, dy);
          const reach = Math.max(0, 1 - Math.max(0, distance - Math.min(box.width, box.height) / 2) / PULL_RADIUS);
          strength = reach * reach * (3 - 2 * reach);
          towardX = dx / (distance || 1);
          towardY = dy / (distance || 1);
        }
        pull.x.target = towardX * 5 * strength;
        pull.y.target = towardY * 5 * strength - 4 * strength;
        pull.turn.target = -pull.tilt * 0.3 * strength;
        pull.near.target = strength;
        for (const s of [pull.x, pull.y, pull.turn, pull.near]) moving = stepSpring(s) || moving;

        const { x, y, turn, near } = pull;
        pull.face.style.transform = `translate(${x.value.toFixed(2)}px, ${y.value.toFixed(2)}px) rotate(${turn.value.toFixed(2)}deg) scale(${(1 + 0.015 * near.value).toFixed(4)})`;
        pull.face.style.setProperty("--near", (0.6 * near.value).toFixed(3));
      }
      if (moving) frame = requestAnimationFrame(step);
    }

    function kick() {
      if (frame || !pullAllowed()) return;
      for (const pull of pulls) pull.tilt = parseFloat(getComputedStyle(pull.face.closest("[data-card]")!).rotate) || 0;
      frame = requestAnimationFrame(step);
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer = { x: event.clientX, y: event.clientY };
      kick();
    };
    const onLeave = () => {
      pointer = null;
      kick();
    };
    const onScroll = () => {
      if (pointer) kick();
    };

    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      visibility.disconnect();
      cancelAnimationFrame(frame);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      removeEventListener("scroll", onScroll);
    };
  }, []);

  function followSwipe() {
    const row = rowRef.current!;
    const start = row.getBoundingClientRect().left + parseFloat(getComputedStyle(row).scrollPaddingLeft);
    const offsets = [...row.querySelectorAll<HTMLElement>("[data-card]")]
      .filter((card) => card.offsetParent !== null)
      .map((card) => Math.abs(card.getBoundingClientRect().left - start));
    const atEnd = row.scrollLeft >= row.scrollWidth - row.clientWidth - 2;
    setActiveDot(atEnd ? offsets.length - 1 : offsets.indexOf(Math.min(...offsets)));
  }

  return (
    <>
      <div
        ref={rowRef}
        role="group"
        aria-label="Sample plan cards"
        tabIndex={swipeRow ? 0 : undefined}
        data-paused={heroOffScreen || undefined}
        onScroll={followSwipe}
        className={cx(
          "relative z-3 -mx-5 flex w-[calc(100%+40px)] justify-center-safe snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pt-9 pb-12 -mb-7",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          FOCUS_INSET,
          "md:pointer-events-none md:absolute md:inset-0 md:m-0 md:block md:w-auto md:overflow-visible md:p-0",
        )}
      >
        {CARDS.map(({ side, place, width, dark, motion, body }, index) => (
          <div
            key={index}
            data-card
            data-side={side}
            className={cx("relative shrink-0 snap-start md:absolute md:origin-top-left", place)}
            style={{
              "--delay": `${motion.delay}ms`,
              "--phone-delay": `${motion.phoneDelay ?? motion.delay}ms`,
              "--phase": `${motion.phase}s`,
              "--rise": `${motion.rise}px`,
            } as CSSProperties}
          >
            <div className="proto-card-drift">
              <div className="hero-card-drift">
                <div className="hero-card-float">
                  <div
                    data-face
                    className={cx(
                      "relative flex flex-col gap-2 rounded-[14px] border p-4 will-change-transform md:pointer-events-auto",
                      "shadow-e1",
                      "after:pointer-events-none after:absolute after:-inset-px after:rounded-[inherit] after:opacity-[var(--near,0)] after:shadow-e3",
                      dark ? T.dark : T.face,
                      width,
                    )}
                  >
                    {body(T)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div aria-hidden="true" className={cx("relative z-3 flex gap-1.5 md:hidden", !swipeRow && "invisible")}>
        {Array.from({ length: PHONE_CARD_COUNT }, (_, index) => (
          <span
            key={index}
            className={cx(
              "h-1.5 rounded-pill transition-[width,background-color] duration-(--duration-base) ease-(--ease-in-out-strong) motion-reduce:transition-none",
              index === activeDot ? "w-[18px] bg-[#0B0B0B]" : "w-1.5 bg-[#0B0B0B]/20",
            )}
          />
        ))}
      </div>
    </>
  );
}
