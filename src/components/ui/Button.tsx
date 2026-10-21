import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
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

export function Button({ variant, size, className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & Look) {
  return <button type={type} className={cx(buttonClass({ variant, size }), className)} {...props} />;
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
