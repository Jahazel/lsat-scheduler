import { cx } from "@/components/ui/classes";
import { HORIZONTAL, SMALL } from "./paths";

const FORMS = { horizontal: HORIZONTAL, small: SMALL };

export const ON_LIGHT = "text-void-eclipse [--logo-accent:var(--color-abyss-blue)]";
export const ON_DARK = "text-silver-mist [--logo-accent:currentColor]";

export function ProtoLogo({ form, className }: { form: keyof typeof FORMS; className?: string }) {
  const { viewBox, body } = FORMS[form];
  return <svg aria-hidden viewBox={viewBox} className={cx("block w-auto shrink-0", className)} dangerouslySetInnerHTML={{ __html: body }} />;
}
