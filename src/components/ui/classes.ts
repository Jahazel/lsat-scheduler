export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
// For controls inside a box that clips overflow: the ring is drawn inside the control.
export const FOCUS_INSET = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent";

export const FOCUS_ON_DARK = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk";

export const LANDING_LINK = "transition-[color] duration-(--duration-fast) ease-[ease] motion-reduce:transition-none";
export const LANDING_BUTTON = "inline-flex h-9 shrink-0 items-center rounded-sm bg-ink px-4 text-small leading-[18px] font-medium whitespace-nowrap text-chalk [transition:background-color_var(--duration-fast)_ease,scale_var(--duration-fast)_var(--ease-out-strong)] pointer-hover:bg-graphite-raised active:scale-97 motion-reduce:transition-none motion-reduce:active:scale-100";

export const MOTION = "transition-colors duration-(--duration-fast) ease-out active:duration-(--duration-base) focus-visible:duration-(--duration-base) motion-reduce:active:duration-(--duration-fast) motion-reduce:focus-visible:duration-(--duration-fast)";

export const PLACEHOLDER_SHAPE = "rounded bg-vellum-line text-transparent box-decoration-clone";

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");
