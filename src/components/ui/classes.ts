export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
// For controls inside a box that clips overflow: the ring is drawn inside the control.
export const FOCUS_INSET = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent";

export const MOTION = "transition-colors duration-(--duration-fast) ease-out active:duration-(--duration-base) focus-visible:duration-(--duration-base) motion-reduce:active:duration-(--duration-fast) motion-reduce:focus-visible:duration-(--duration-fast)";

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");
