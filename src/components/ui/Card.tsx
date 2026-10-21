import type { HTMLAttributes } from "react";
import { cx } from "./classes";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("flex flex-col gap-4 rounded-md border border-vellum-line bg-paper p-5", className)} {...props} />;
}
