"use client";

import { FOCUS, cx } from "@/components/ui/classes";
import { useBody } from "../../bodyContext";
import { goToPage, useProtoView } from "../../protoContext";
import type { LegalPageId } from "../../pages";
import { EditorialHeader } from "../header/Editorial";
import JumpBar from "../list/JumpBar";
import { RAIL_RIGHT } from "../list/columns";

const RELATED: { page: LegalPageId; section: string }[] = [
  { page: "terms", section: "ai-reads-your-screenshots" },
  { page: "privacy", section: "your-7sage-screenshots" },
];

export default function RelatedRail() {
  const { page } = useProtoView();
  if (page.sections) return <JumpBar />;
  return <ShortPage />;
}

function ShortPage() {
  const { page, pages } = useProtoView();
  const renderBody = useBody();
  const links = RELATED.flatMap(({ page: id, section }) => {
    const target = pages.find((item) => item.id === id);
    const title = target?.sections?.find((item) => item.id === section)?.title;
    return target && title ? [{ id, section, pageLabel: target.switcherLabel, title }] : [];
  });

  return (
    <div data-page-section>
      <EditorialHeader column={RAIL_RIGHT.header} />
      <div className="px-6 pt-12 pb-16">
        <div className={RAIL_RIGHT.grid}>
          <div className={RAIL_RIGHT.text}>{renderBody(page)}</div>
          {links.length > 0 && (
            <nav aria-label="Related sections" className="mt-12 border-t border-vellum-line pt-8 lg:sticky lg:top-[calc(var(--site-header)+2rem)] lg:col-start-2 lg:row-start-1 lg:mt-0 lg:self-start lg:border-t-0 lg:pt-0">
              <p className="font-mono text-label uppercase text-smoke">Related</p>
              <ul className="mt-4 space-y-3 border-l border-vellum-line">
                {links.map((link) => (
                  <li key={link.section}>
                    <a
                      href={`/legal/${link.id}#${link.section}`}
                      onClick={(event) => {
                        event.preventDefault();
                        goToPage(link.id, link.section);
                      }}
                      className={cx("group block touch-manipulation rounded-r-xs py-1 pl-4 active:opacity-70", FOCUS)}
                    >
                      <span className="block text-caption text-smoke">{link.pageLabel}</span>
                      <span className="mt-0.5 block text-small text-ink underline decoration-transparent underline-offset-3 transition-[text-decoration-color] duration-(--duration-fast) ease-[ease] motion-reduce:transition-none pointer-fine:group-hover:decoration-ink">
                        {link.title}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
