// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { act, cleanup, render, screen } from "@testing-library/react";
import { PageArrival, PagePlaceholder } from "./PagePlaceholder";

type Running = { el: Element; keyframes: Keyframe[]; options: KeyframeAnimationOptions; finish: () => void; cancelled: boolean };
let animations: Running[] = [];
let reduced = false;
let phone = false;

beforeEach(() => {
  vi.useFakeTimers();
  animations = [];
  reduced = false;
  phone = false;
  const tokens = document.documentElement.style;
  tokens.setProperty("--duration-fast", "120ms");
  tokens.setProperty("--duration-base", "200ms");
  tokens.setProperty("--ease-standard", "cubic-bezier(0.2, 0, 0, 1)");
  tokens.setProperty("--ease-exit", "cubic-bezier(0.4, 0, 1, 1)");
  Element.prototype.animate = function (this: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => { finish = resolve; });
    const running: Running = { el: this, keyframes, options, finish, cancelled: false };
    animations.push(running);
    return { finished, cancel: () => { running.cancelled = true; } } as unknown as Animation;
  } as Element["animate"];
  window.matchMedia = ((query: string) => ({ matches: (reduced && query.includes("reduce")) || (phone && query.includes("767px")) })) as typeof window.matchMedia;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

function Loading() {
  return <PagePlaceholder><p>Grey header</p><p>Grey card</p></PagePlaceholder>;
}

function Page() {
  return (
    <div>
      <PageArrival page="This week" />
      <header data-page-section><h1>Your plan for this week</h1></header>
      <section data-page-section>Monday</section>
      <section data-page-section>Tuesday</section>
    </div>
  );
}

const sectionArrivals = () => animations.filter((a) => (a.el as HTMLElement).hasAttribute("data-page-section"));
const shapesFadingOut = () => animations.filter((a) => a.el.textContent?.includes("Grey header"));

describe("page placeholder", () => {
  it("keeps the shapes hidden for the first 150 ms, then fades them in over the base duration", () => {
    render(<Loading />);
    const placeholder = screen.getByText("Grey header").parentElement!;
    expect(placeholder.style.animationName).toBe("page-placeholder-in");
    expect(placeholder.style.animationDelay).toBe("150ms");
    expect(placeholder.style.animationDuration).toBe("var(--duration-base)");
    expect(placeholder.style.animationTimingFunction).toBe("var(--ease-standard)");
    expect(placeholder.style.animationFillMode).toBe("backwards");
  });

  it("hides the shapes from screen readers and announces the page when it arrives", () => {
    const { rerender } = render(<Loading />);
    expect(screen.getByText("Grey header").closest("[aria-hidden]")).not.toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    rerender(<Page />);
    expect(screen.getByRole("status").textContent).toBe("");
    act(() => vi.advanceTimersToNextFrame());
    expect(screen.getByRole("status").textContent).toBe("This week loaded");
  });

  it("hands off a slow page: the shapes fade out over the fast duration while the sections rise in 40 ms apart", async () => {
    const { rerender } = render(<Loading />);
    act(() => vi.advanceTimersByTime(400));
    rerender(<Page />);
    await act(async () => {});

    const [fadeOut] = shapesFadingOut();
    expect(fadeOut.keyframes.at(-1)).toEqual({ opacity: 0 });
    expect(fadeOut.options).toMatchObject({ duration: 120, easing: "cubic-bezier(0.2, 0, 0, 1)" });
    expect(screen.getByText("Grey header").closest("main, [aria-hidden]")).not.toBeNull();

    expect(sectionArrivals().map((a) => a.options.delay)).toEqual([0, 40, 80]);
    for (const arrival of sectionArrivals()) {
      expect(arrival.keyframes[0]).toEqual({ opacity: 0, transform: "translateY(8px)" });
      expect(arrival.options).toMatchObject({ duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" });
    }

    await act(async () => fadeOut.finish());
    expect(screen.queryByText("Grey header")).toBeNull();
  });

  it("shows no shapes for a page that is ready within 150 ms, and still rises the page in", async () => {
    const { rerender } = render(<Loading />);
    act(() => vi.advanceTimersByTime(100));
    rerender(<Page />);
    await act(async () => {});
    expect(screen.queryByText("Grey header")).toBeNull();
    expect(shapesFadingOut()).toEqual([]);
    expect(sectionArrivals()).toHaveLength(3);
  });

  it("rises the page 4 px on a phone", () => {
    phone = true;
    render(<Page />);
    expect(sectionArrivals()[0]!.keyframes[0]).toEqual({ opacity: 0, transform: "translateY(4px)" });
  });

  it("fades the page in with no rise and no stagger when the device reduces motion", () => {
    reduced = true;
    render(<Page />);
    for (const arrival of sectionArrivals()) {
      expect(arrival.keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);
      expect(arrival.options).toMatchObject({ duration: 120, delay: 0 });
    }
  });

  it("leaves the motion to the sign-in handoff when it holds the page busy", () => {
    render(<div aria-busy="true"><Page /></div>);
    expect(sectionArrivals()).toEqual([]);
    act(() => vi.advanceTimersToNextFrame());
    expect(screen.getByRole("status").textContent).toBe("This week loaded");
  });

  it("leaves a page the server already put on screen where it is", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Page />);
    document.body.append(container);
    render(<Page />, { container, hydrate: true });
    act(() => vi.advanceTimersToNextFrame());
    expect(sectionArrivals()).toEqual([]);
    expect(screen.getByRole("status").textContent).toBe("");
  });
});
