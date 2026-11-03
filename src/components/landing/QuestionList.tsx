"use client";

import { useState, type CSSProperties } from "react";
import { FOCUS_INSET, cx } from "@/components/ui/classes";

const RULE = "border-dashed border-ink/14";

export type Question = { question: string; answer: string };

export function QuestionList({ questions, className }: { questions: Question[]; className?: string }) {
  const [shown, setShown] = useState({ open: questions.map((_, index) => index === 0), reduced: false });

  function toggle(index: number) {
    setShown(({ open }) => ({
      open: open.map((isOpen, at) => (at === index ? !isOpen : isOpen)),
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    }));
  }

  const fade = shown.reduced ? "var(--duration-fast)" : "var(--duration-base)";

  return (
    <ul className={cx("border-t", RULE, className)}>
      {questions.map(({ question, answer }, index) => {
        const open = shown.open[index];
        return (
          <li key={question} className={cx("reveal-item border-b", RULE)} style={{ "--reveal-delay": `${80 + index * 60}ms` } as CSSProperties}>
            <h3>
              <button
                type="button"
                id={`question-${index}`}
                aria-expanded={open}
                aria-controls={`answer-${index}`}
                onClick={() => toggle(index)}
                className={cx(
                  "faq-row grid w-full grid-cols-[32px_1fr_32px] items-center gap-3 rounded-xs py-5 text-left text-[17px]/[24px] font-medium tracking-[-0.01em] text-ink md:grid-cols-[40px_1fr_32px] md:gap-4 md:py-[22px] md:text-[18px]/[26px] lg:grid-cols-[48px_1fr_32px] lg:p-6 lg:text-[20px]/[28px]",
                  FOCUS_INSET,
                )}
              >
                <span aria-hidden="true" className="font-mono text-[12px]/[16px] tracking-[0.06em] text-fog tabular-nums">
                  Q{String(index + 1).padStart(2, "0")}
                </span>
                <span className="faq-question">{question}</span>
                <span aria-hidden="true" className="faq-icon grid size-8 place-items-center rounded-xs border">
                  <svg width="16" height="16" viewBox="0 0 16 16">
                    <path d="M3.5 8h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path
                      data-testid="question-icon-bar"
                      d="M8 3.5v9"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      style={{
                        transformOrigin: "8px 8px",
                        transform: open ? "scaleY(0)" : "none",
                        transition: shown.reduced ? "none" : "transform var(--duration-base) var(--ease-out-strong)",
                      }}
                    />
                  </svg>
                </span>
              </button>
            </h3>
            <div
              id={`answer-${index}`}
              className="grid"
              style={{
                gridTemplateRows: open ? "1fr" : "0fr",
                opacity: open ? 1 : 0,
                visibility: open ? "visible" : "hidden",
                transition: [
                  !shown.reduced && "grid-template-rows var(--duration-base) var(--ease-out-strong)",
                  `opacity ${fade} ${shown.reduced ? "ease" : "var(--ease-out-strong)"}`,
                  `visibility 0s linear ${open ? "0s" : fade}`,
                ].filter(Boolean).join(", "),
              }}
            >
              <div className="overflow-hidden">
                <p className="pb-5 pl-11 text-[16px]/[25px] text-smoke md:pr-12 md:pb-6 md:pl-14 md:text-[17px]/[27px] lg:max-w-[720px] lg:pr-[72px] lg:pb-7 lg:pl-[88px]">
                  {answer}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
