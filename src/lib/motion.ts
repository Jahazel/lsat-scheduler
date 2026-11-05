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

// Starts from the current frame, so a second change continues instead of jumping. The content stays busy until fadeIn.
export function fadeOut(el: HTMLElement, { to = 0, x = 0, shorten = false }: { to?: number; x?: number; shorten?: boolean } = {}) {
  el.setAttribute("aria-busy", "true");
  const from = stopAtCurrentFrame(el);
  const left = !shorten ? 1 : to < 1 ? Math.min(Math.max((Number(from.opacity) - to) / (1 - to), 0), 1) : 0;
  return el.animate([from, { opacity: to, transform: `translateX(${-x}px)` }], {
    duration: durationMs("--duration-fast") * left,
    easing: motionToken("--ease-exit"),
    fill: "forwards",
  });
}

// Reduced motion keeps only the opacity of `from`.
export function fadeIn(el: HTMLElement, from: Keyframe = { opacity: 0 }) {
  el.removeAttribute("aria-busy");
  if (reducedMotion()) return el.animate([{ opacity: from.opacity }, { opacity: 1 }], { duration: durationMs("--duration-fast"), easing: motionToken("--ease-standard") });
  return el.animate([from, { opacity: 1, transform: "none" }], { duration: durationMs("--duration-base"), easing: motionToken("--ease-standard") });
}

export const isPlainClick = (event: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
