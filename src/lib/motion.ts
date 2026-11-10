// Page motion pieces, read from the design-system motion tokens in globals.css.

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export const motionToken = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function durationMs(name: string) {
  const duration = motionToken(name);
  return parseFloat(duration) * (duration.endsWith("ms") ? 1 : 1000);
}

export function stopAtCurrentFrame(el: HTMLElement): Keyframe {
  const { opacity, transform } = getComputedStyle(el);
  for (const animation of el.getAnimations()) animation.cancel();
  return { opacity, transform };
}

export const slideFrom = (x: number, opacity = 0): Keyframe => ({ opacity, transform: `translateX(${x}px)` });
export const riseFrom = (y: number, opacity = 0): Keyframe => ({ opacity, transform: `translateY(${y}px)` });

// Starts from the current frame, so a second change continues instead of jumping.
export function fadeOut(el: HTMLElement, { to = 0, x = 0, shorten = false }: { to?: number; x?: number; shorten?: boolean } = {}) {
  const from = stopAtCurrentFrame(el);
  const distance = Math.abs(Number(from.opacity) - to);
  const left = !shorten ? 1 : distance === 0 ? 0 : Math.min(1, distance / Math.max(0, 1 - to));
  return el.animate([from, { opacity: to, transform: `translateX(${-x}px)` }], {
    duration: durationMs("--duration-fast") * left,
    easing: motionToken("--ease-out-strong"),
    fill: "forwards",
  });
}

// Reduced motion keeps only the opacity of `from`.
export function fadeIn(el: HTMLElement, from: Keyframe = { opacity: 0 }) {
  if (reducedMotion()) return el.animate([{ opacity: from.opacity }, { opacity: 1 }], { duration: durationMs("--duration-fast"), easing: motionToken("--ease-standard") });
  return el.animate([from, { opacity: 1, transform: "none" }], { duration: durationMs("--duration-base"), easing: motionToken("--ease-standard") });
}

export const isPlainClick = (event: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
