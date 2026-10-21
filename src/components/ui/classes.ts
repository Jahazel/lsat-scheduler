export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
// For controls inside a box that clips overflow: the ring is drawn inside the control.
export const FOCUS_INSET = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent";

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");
