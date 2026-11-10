import type { ReactNode } from "react";
import { cx } from "@/components/ui/classes";
import { LegalTabs, type LegalPageId } from "./LegalTabs";

export type LegalSection = { id: string; title: string; body: ReactNode };

type LegalPageProps = {
  id: LegalPageId;
  title: string;
  dateLine: string;
} & ({ sections: LegalSection[]; paragraphs?: never } | { paragraphs: ReactNode; sections?: never });

const COLUMN = "mx-auto max-w-2xl lg:max-w-[956px] lg:pr-[284px]";

const PROSE = cx(
  "text-body leading-[1.7] text-smoke [&_p+p]:mt-4",
  "[&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:pl-1",
  "[&_mark]:rounded-xs [&_mark]:bg-warning-wash [&_mark]:px-1 [&_mark]:text-warning-ink",
  "[&_a]:text-ink [&_a]:underline [&_a]:decoration-fog [&_a]:underline-offset-3",
  "[&_a]:transition-[text-decoration-color] [&_a]:duration-(--duration-fast) [&_a]:ease-[ease] motion-reduce:[&_a]:transition-none pointer-fine:[&_a:hover]:decoration-ink",
);

export function LegalPage({ id, title, dateLine, sections, paragraphs }: LegalPageProps) {
  return (
    <div data-page-fade className="min-h-screen bg-paper">
      <header className="border-b border-vellum-line px-6 pt-14 md:pt-24">
        <div className={COLUMN}>
          <div className="font-mono text-label uppercase text-smoke">Legal</div>
          <h1 tabIndex={-1} className="mt-3 text-h3 font-semibold text-balance text-ink outline-none md:text-h2">
            {title}
          </h1>
          <div className="mt-4 text-small text-smoke">{dateLine}</div>
          <LegalTabs current={id} />
        </div>
      </header>
      <div className="px-6 pt-12 pb-16">
        <div className={cx(COLUMN, PROSE)}>
          {sections ? (
            <div className="space-y-12">
              {sections.map((section) => (
                <section key={section.id} id={section.id} className="space-y-4">
                  <h2 tabIndex={-1} className="text-lead font-semibold tracking-heading text-ink outline-none">
                    {section.title}
                  </h2>
                  <div>{section.body}</div>
                </section>
              ))}
            </div>
          ) : (
            paragraphs
          )}
        </div>
      </div>
    </div>
  );
}
