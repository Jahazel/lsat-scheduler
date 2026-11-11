import Link from "next/link";
import { FOCUS, cx } from "@/components/ui/classes";
import { LEGAL_PAGE_LABEL } from "./pages";

type SectionTitle = { id: string; title: string };
export type RelatedSources = Record<"terms" | "privacy", SectionTitle[]>;

const RELATED = [
  { page: "terms", id: "ai-reads-your-screenshots" },
  { page: "privacy", id: "your-7sage-screenshots" },
] as const satisfies { page: keyof RelatedSources; id: string }[];

export function RelatedSections({ sources }: { sources: RelatedSources }) {
  const links = RELATED.flatMap(({ page, id }) => {
    const title = sources[page].find((section) => section.id === id)?.title;
    return title ? [{ page, id, title }] : [];
  });
  if (links.length === 0) return null;

  return (
    <nav
      aria-label="Related"
      className="mt-12 border-t border-vellum-line pt-8 lg:sticky lg:top-[calc(var(--site-header)+2rem)] lg:col-start-2 lg:row-start-1 lg:mt-0 lg:self-start lg:border-t-0 lg:pt-0"
    >
      <div className="font-mono text-label uppercase text-smoke">Related</div>
      <ul className="mt-4 space-y-3 border-l border-vellum-line">
        {links.map((link) => (
          <li key={link.page}>
            <Link
              href={`/legal/${link.page}#${link.id}`}
              className={cx(
                "group block touch-manipulation rounded-r-xs py-1 pl-4 select-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] active:opacity-70",
                FOCUS,
              )}
            >
              <span className="block text-caption text-smoke">{LEGAL_PAGE_LABEL[link.page]}</span>
              <span className="mt-0.5 block text-small text-ink underline decoration-transparent underline-offset-3 transition-[text-decoration-color] duration-(--duration-fast) ease-[ease] motion-reduce:transition-none pointer-fine:group-hover:decoration-ink">
                {link.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
