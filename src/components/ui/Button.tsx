import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, MouseEvent } from "react";
import { FOCUS, MOTION, cx } from "./classes";

export type ButtonVariant = "primary" | "outline" | "text";
export type ButtonSize = "lg" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ink text-chalk hover:bg-graphite-line active:bg-graphite-line active:text-chalk/strong",
  outline: "border border-vellum-line bg-paper text-ink hover:bg-vellum active:bg-vellum active:text-ink/strong",
  text: "text-ink hover:bg-vellum-line active:bg-vellum-line active:text-ink/strong",
};

const SIZES: Record<ButtonSize, string> = {
  lg: "h-12 px-[22px] text-body leading-[20px]",
  md: "h-10 px-[18px] text-small",
};

export function buttonClass({ variant = "primary", size = "lg" }: { variant?: ButtonVariant; size?: ButtonSize } = {}) {
  return cx(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-pill font-medium",
    "disabled:pointer-events-none disabled:opacity-muted",
    VARIANTS[variant],
    SIZES[size],
    MOTION,
    FOCUS,
  );
}

type Look = { variant?: ButtonVariant; size?: ButtonSize };

/**
 * `variant="bare"` keeps a screen's own button look, given in `className`; `size` then picks only the ring's size.
 * `holdsWidth={false}` lets a waiting button shrink to its wait label, so text that follows a link-style button stays next to it.
 */
type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant | "bare";
  size?: ButtonSize;
  waiting?: boolean;
  waitLabel?: string;
  holdsWidth?: boolean;
};

export function Button({ variant, size, className, type = "button", waiting = false, waitLabel, holdsWidth = true, children, onClick, ...props }: ButtonProps) {
  const look = variant === "bare" ? "" : buttonClass({ variant, size });
  const waitContent = (
    <span className="inline-flex items-center gap-2">
      <Ring size={size} />
      {waitLabel ?? children}
    </span>
  );
  return (
    <button
      type={type}
      className={cx(look, "data-waiting:shrink-0 data-waiting:cursor-default data-waiting:opacity-strong", className)}
      {...props}
      {...(waiting
        ? { "data-waiting": "", "aria-disabled": true, onClick: (event: MouseEvent<HTMLButtonElement>) => event.preventDefault() }
        : { onClick })}
    >
      {waiting && holdsWidth ? (
        <span className="inline-grid place-items-center *:col-start-1 *:row-start-1">
          <span aria-hidden className="invisible">
            {children}
          </span>
          {waitContent}
        </span>
      ) : waiting ? (
        waitContent
      ) : (
        children
      )}
    </button>
  );
}

function Ring({ size = "lg" }: { size?: ButtonSize }) {
  return (
    <span aria-hidden className={cx("button-ring shrink-0", size === "md" ? "size-3.5" : "size-4")}>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" className="block size-full overflow-visible">
        <circle cx="8" cy="8" r="6.25" strokeOpacity="0.25" />
        <path d="M8 1.75a6.25 6.25 0 0 1 5.4 3.1" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & Look) {
  return <Link className={cx(buttonClass({ variant, size }), className)} {...props} />;
}

export function IconButton({
  label,
  size = "md",
  className,
  type = "button",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & { label: string; size?: "md" | "sm" }) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-pill text-ink hover:bg-vellum-line",
        "disabled:pointer-events-none disabled:opacity-muted",
        size === "md" ? "size-8 [&_svg]:size-3.5" : "size-7 [&_svg]:size-2.5",
        MOTION,
        FOCUS,
        className,
      )}
      {...props}
    />
  );
}
