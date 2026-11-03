"use client";

import { useState } from "react";
import { FOCUS, LANDING_LINK, cx } from "@/components/ui/classes";

export type Question = { question: string; answer: string };

export function QuestionList({ questions }: { questions: Question[] }) {
  const [shown, setShown] = useState({ open: questions.map((_, index) => index === 0), reduced: false });

  function toggle(index: number) {
    setShown(({ open }) => ({
      open: open.map((isOpen, at) => (at === index ? !isOpen : isOpen)),
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    }));
  }

  const fade = shown.reduced ? "var(--duration-fast)" : "var(--duration-base)";

  return (
    <ul className="w-full border-t border-vellum-line">
      {questions.map(({ question, answer }, index) => {
        const open = shown.open[index];
        return (
          <li key={question} className="border-b border-vellum-line pb-3">
            <h3>
              <button
                type="button"
                id={`question-${index}`}
                aria-expanded={open}
                aria-controls={`answer-${index}`}
                onClick={() => toggle(index)}
                className={cx(
                  "flex w-full items-center justify-between gap-6 pt-6 pb-3 text-left text-h5 font-medium text-ink pointer-hover:text-smoke",
                  LANDING_LINK,
                  FOCUS,
                )}
              >
                {question}
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" className="shrink-0 text-ink">
                  <path d="M5 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path
                    data-testid="question-icon-bar"
                    d="M10 5v10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    style={{
                      transformOrigin: "10px 10px",
                      transform: open ? "scaleY(0)" : "none",
                      transition: shown.reduced ? "none" : "transform var(--duration-base) var(--ease-out-strong)",
                    }}
                  />
                </svg>
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
                  `opacity ${fade} var(--ease-out-strong)`,
                  `visibility 0s linear ${open ? "0s" : fade}`,
                ].filter(Boolean).join(", "),
              }}
            >
              <div className="overflow-hidden">
                <p className="max-w-[560px] pb-3 text-body text-smoke">{answer}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
