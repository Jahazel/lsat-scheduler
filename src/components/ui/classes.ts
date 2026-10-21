export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
// For controls inside a box that clips overflow: the ring is drawn inside the control.
export const FOCUS_INSET = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent";

export const MOTION = "transition-colors duration-120 ease-out active:duration-200 focus-visible:duration-200 motion-reduce:transition-none";

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");
