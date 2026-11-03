"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cx } from "@/components/ui/classes";

type Card = {
  side: "left" | "right";
  place: string;
  face: string;
  motion: { delay: number; phoneDelay?: number; phase: number; rise: number; turn: number };
  body: ReactNode;
};

const LIGHT = "flex-col gap-2 border-vellum-line bg-paper p-4 text-ink";
const LABEL = "flex items-center gap-2 font-mono text-caption tracking-[0.06em] text-smoke uppercase";
const TITLE = "text-h5 font-semibold";
const DETAIL = "text-small text-balance text-smoke";
const BIG = "text-[36px]/[40px] font-semibold tracking-[-0.03em]";

function Label({ dot, children }: { dot?: string; children: ReactNode }) {
  return (
    <p className={LABEL}>
      {dot && <span className={cx("size-2.5 shrink-0 rounded-pill", dot)} />}
      {children}
    </p>
  );
}

const CARDS: Card[] = [
  {
    side: "left",
    place: "-rotate-3 md:top-7 md:left-7 md:-rotate-6 lg:top-[132px] lg:left-[calc(50%-656px)]",
    face: cx(LIGHT, "w-[200px] md:w-[216px] lg:w-[236px]"),
    motion: { delay: 120, phase: 0, rise: -60, turn: -2 },
    body: (
      <>
        <Label dot="bg-spectrum-violet">Monday</Label>
        <p className={TITLE}>Sufficient assumption</p>
        <p className={DETAIL}>3 drills · 45 min</p>
      </>
    ),
  },
  {
    side: "left",
    place: "rotate-2 md:top-[548px] md:left-3.5 md:rotate-4 lg:top-[348px] lg:left-[calc(50%-672px)]",
    face: cx(LIGHT, "w-[210px] md:w-[214px] lg:w-[212px] lg:gap-1.5 lg:p-[18px]"),
    motion: { delay: 240, phoneDelay: 180, phase: -2.8, rise: -110, turn: 2 },
    body: (
      <>
        <Label>PT score</Label>
        <p className={cx(BIG, "max-md:text-[30px]/[34px]")}>158 <span className="font-regular text-fog">→</span> 165</p>
        <p className={DETAIL}>Goal by the January test</p>
      </>
    ),
  },
  {
    side: "left",
    place: "hidden lg:block lg:top-[546px] lg:left-[calc(50%-624px)] lg:-rotate-3",
    face: "w-max min-w-[228px] flex-row items-center gap-3 border-vellum-line bg-paper px-4 py-3.5 text-ink",
    motion: { delay: 360, phase: -3.6, rise: -150, turn: -3 },
    body: (
      <>
        <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-ink">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M3 7.2 L5.8 10 L11 4.2" fill="none" className="stroke-chalk" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span>
          <span className="block text-[15px]/[20px] font-medium whitespace-nowrap">Weaken · 12 questions</span>
          <span className="block text-[13px]/[18px] text-success-ink">Done Tuesday</span>
        </span>
      </>
    ),
  },
  {
    side: "right",
    place: "hidden md:block md:top-5 md:right-7 md:rotate-5 lg:top-[120px] lg:right-auto lg:left-[calc(50%+420px)]",
    face: cx(LIGHT, "md:w-[220px] lg:w-[252px]"),
    motion: { delay: 180, phase: -1.4, rise: -80, turn: 2 },
    body: (
      <>
        <Label dot="bg-spectrum-amber">Saturday</Label>
        <p className={TITLE}>Timed section</p>
        <p className="flex items-center gap-2">
          <span className="h-1.5 w-24 overflow-hidden rounded-pill bg-vellum">
            <span className="block h-full w-3/5 rounded-pill bg-spectrum-amber" />
          </span>
          <span className="font-mono text-caption whitespace-nowrap text-smoke">21 of 35 min</span>
        </p>
      </>
    ),
  },
  {
    side: "right",
    place: "hidden lg:block lg:top-[340px] lg:left-[calc(50%+484px)] lg:-rotate-5",
    face: "w-[188px] flex-col gap-1 border-ink bg-ink p-[18px] text-chalk",
    motion: { delay: 300, phase: -0.7, rise: -130, turn: -2 },
    body: (
      <>
        <p className="text-[44px]/[46px] font-semibold tracking-[-0.03em]">125</p>
        <p className="text-small text-chalk/72">days to test</p>
      </>
    ),
  },
  {
    side: "right",
    place: "-rotate-2 md:top-[594px] md:right-4 md:rotate-3 lg:top-[536px] lg:right-auto lg:left-[calc(50%+400px)]",
    face: cx(LIGHT, "w-[200px] md:w-[232px] lg:w-[236px]"),
    motion: { delay: 420, phoneDelay: 240, phase: -2.1, rise: -160, turn: 3 },
    body: (
      <>
        <Label dot="bg-spectrum-pink">Weakest type</Label>
        <p className={TITLE}>Flaw</p>
        <p className={DETAIL}>Missed 4 of 10 on your last PT</p>
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
      !matchMedia("(prefers-reduced-motion: reduce)").matches;

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
        data-paused={heroOffScreen || undefined}
        onScroll={followSwipe}
        className={cx(
          "relative z-3 -mx-5 flex w-[calc(100%+40px)] snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pt-9 pb-5",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "md:pointer-events-none md:absolute md:inset-0 md:mx-0 md:block md:w-auto md:overflow-visible md:p-0",
        )}
      >
        {CARDS.map(({ side, place, face, motion, body }, index) => (
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
              "--turn": `${motion.turn}deg`,
            } as CSSProperties}
          >
            <div className="hero-card-depth">
              <div className="hero-card-drift">
                <div className="hero-card-float">
                  <div
                    data-face
                    className={cx(
                      "relative flex rounded-[14px] border shadow-e1 will-change-transform md:pointer-events-auto",
                      "after:pointer-events-none after:absolute after:-inset-px after:rounded-[inherit] after:opacity-[var(--near,0)] after:shadow-e3",
                      face,
                    )}
                  >
                    {body}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="relative z-3 flex gap-1.5 md:hidden">
        {Array.from({ length: PHONE_CARD_COUNT }, (_, index) => (
          <span
            key={index}
            className={cx(
              "h-1.5 rounded-pill transition-[width,background-color] duration-(--duration-base) ease-(--ease-in-out-strong) motion-reduce:transition-none",
              index === activeDot ? "w-[18px] bg-ink" : "w-1.5 bg-ink/20",
            )}
          />
        ))}
      </div>
    </>
  );
}
