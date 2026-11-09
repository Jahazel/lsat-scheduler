// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { cleanup, fireEvent, isInaccessible, render, screen } from "@testing-library/react";
import { QuestionList } from "./QuestionList";

let reduced = false;

beforeEach(() => {
  reduced = false;
  window.matchMedia = ((query: string) => ({ matches: reduced && query.includes("reduce") })) as typeof window.matchMedia;
});
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const QUESTIONS: { question: string; answer: string }[] = Array.from({ length: 8 }, (_, index) => ({
  question: `Question ${index + 1}?`,
  answer: `Answer ${index + 1}.`,
}));

const button = (name: string) => screen.getByRole("button", { name });
const answerOf = (name: string) => document.getElementById(button(name).getAttribute("aria-controls")!)!;
const shownAnswers = () => QUESTIONS.filter(({ answer }) => !isInaccessible(screen.getByText(answer))).map(({ answer }) => answer);
const expanded = () => screen.getAllByRole("button").map((b) => b.getAttribute("aria-expanded"));

describe("QuestionList", () => {
  it("lists every question as a heading button, with every answer closed", () => {
    render(<QuestionList questions={QUESTIONS} />);
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings).toHaveLength(QUESTIONS.length);
    QUESTIONS.forEach(({ question }, index) => {
      expect(screen.getByRole("heading", { level: 3, name: question })).toBe(headings[index]);
    });
    expect(expanded()).toEqual(["false", "false", "false", "false", "false", "false", "false", "false"]);
    expect(shownAnswers()).toEqual([]);
    expect(answerOf("Question 1?").textContent).toBe("Answer 1.");
  });

  it("keeps one answer open at a time, closing the open one when another opens", () => {
    render(<QuestionList questions={QUESTIONS} />);
    fireEvent.click(button("Question 1?"));
    expect(expanded()).toEqual(["true", "false", "false", "false", "false", "false", "false", "false"]);
    expect(shownAnswers()).toEqual(["Answer 1."]);

    fireEvent.click(button("Question 4?"));
    expect(expanded()).toEqual(["false", "false", "false", "true", "false", "false", "false", "false"]);
    expect(shownAnswers()).toEqual(["Answer 4."]);

    fireEvent.click(button("Question 4?"));
    expect(shownAnswers()).toEqual([]);
  });

  it("numbers the rows Q01 onward, outside each button's name", () => {
    render(<QuestionList questions={QUESTIONS} />);
    expect(screen.getAllByRole("button").map((b) => b.textContent!.slice(0, 3))).toEqual(
      ["Q01", "Q02", "Q03", "Q04", "Q05", "Q06", "Q07", "Q08"],
    );
    expect(button("Question 1?")).toBe(screen.getAllByRole("button")[0]);
  });

  it("shows an answer given as several paragraphs as one paragraph each", () => {
    render(<QuestionList questions={[{ question: "Two parts?", answer: ["First part.", "Second part."] }]} />);
    expect([...answerOf("Two parts?").querySelectorAll("p")].map((p) => p.textContent)).toEqual(["First part.", "Second part."]);
  });

  it("keeps closed answers out of the accessibility tree", () => {
    render(<QuestionList questions={QUESTIONS} />);
    expect(answerOf("Question 2?").style.visibility).toBe("hidden");
    fireEvent.click(button("Question 2?"));
    expect(answerOf("Question 2?").style.visibility).toBe("visible");
    expect(isInaccessible(screen.getByText("Answer 2."))).toBe(false);
  });

  it("puts every question and answer in the server HTML, with every answer closed", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<QuestionList questions={QUESTIONS} />);
    document.body.append(container);
    for (const { question, answer } of QUESTIONS) {
      expect(screen.getByRole("button", { name: question })).toBeTruthy();
      expect(container.textContent).toContain(answer);
    }
    expect(shownAnswers()).toEqual([]);
  });

  it("grows the answer, fades it and turns the plus to minus", () => {
    render(<QuestionList questions={QUESTIONS} />);
    fireEvent.click(button("Question 2?"));
    const answer = answerOf("Question 2?");
    expect(answer.style.gridTemplateRows).toBe("1fr");
    expect(answer.style.transition).toContain("grid-template-rows var(--duration-base) var(--ease-out-strong)");
    expect(answer.style.transition).toContain("opacity var(--duration-base) var(--ease-out-strong)");
    const bar = button("Question 2?").querySelector("[data-testid='question-icon-bar']") as SVGElement;
    expect(bar.style.transform).toBe("scaleY(0)");
    expect(bar.style.transition).toBe("transform var(--duration-base) var(--ease-out-strong)");

    fireEvent.click(button("Question 2?"));
    expect(answer.style.gridTemplateRows).toBe("0fr");
    expect(bar.style.transform).toBe("none");
  });

  it("under reduced motion changes height and icon at once and keeps a short fade", () => {
    reduced = true;
    render(<QuestionList questions={QUESTIONS} />);
    fireEvent.click(button("Question 2?"));
    const answer = answerOf("Question 2?");
    expect(answer.style.gridTemplateRows).toBe("1fr");
    expect(answer.style.transition).not.toContain("grid-template-rows");
    expect(answer.style.transition).toContain("opacity var(--duration-fast) ease,");
    const bar = button("Question 2?").querySelector("[data-testid='question-icon-bar']") as SVGElement;
    expect(bar.style.transition).toBe("none");
  });
});
