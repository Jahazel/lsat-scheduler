"use client";

import { FOCUS, cx } from "@/components/ui/classes";
import type { LegalPage } from "../../content";
import { CheckIcon, CopyLink, LinkIcon } from "./CopyLink";
import { LINKS, MARK, SWAP } from "./shared";

const TEXT = cx("text-body leading-[1.7] text-smoke [&_p+p]:mt-4 [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:pl-1", MARK, LINKS);

export default function CalmProse({ page }: { page: LegalPage }) {
  if (page.paragraphs) return <div className={TEXT}>{page.paragraphs}</div>;
  return (
    <div className={cx("space-y-12", TEXT)}>
      {page.sections?.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-[calc(var(--site-header)+2rem)] space-y-4">
          <div className="group flex items-start gap-2">
            <h2 tabIndex={-1} className="min-w-0 text-lead font-semibold tracking-heading text-ink outline-none">{section.title}</h2>
            <CopyLink
              id={section.id}
              title={section.title}
              className={cx(
                "relative mt-1 flex h-7 shrink-0 touch-manipulation items-center gap-1.5 rounded-xs px-1.5 text-fog select-none active:text-ink pointer-hover:text-ink before:absolute before:-inset-2 before:content-['']",
                "opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100 transition-opacity duration-(--duration-fast) ease-[ease]",
                "data-[state=copied]:opacity-100 data-[state=failed]:opacity-100",
                FOCUS,
              )}
            >
              {(state) => (
                <>
                  <span className="grid size-4 place-items-center">
                    <LinkIcon className={cx("col-start-1 row-start-1 size-4", SWAP, state === "copied" && "scale-75 opacity-0")} />
                    <CheckIcon className={cx("col-start-1 row-start-1 size-4 text-success-ink", SWAP, state !== "copied" && "scale-75 opacity-0")} />
                  </span>
                  {state !== "idle" && (
                    <span aria-hidden className={cx("animate-[proto-label-in_var(--duration-fast)_var(--ease-out-strong)] motion-reduce:animate-none text-caption whitespace-nowrap", state === "copied" ? "text-success-ink" : "text-danger-ink")}>
                      {state === "copied" ? "Copied" : "Couldn’t copy"}
                    </span>
                  )}
                </>
              )}
            </CopyLink>
          </div>
          <div>{section.body}</div>
        </section>
      ))}
    </div>
  );
}
