// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
import ProgressMotion, { ProgressScreen } from "./ProgressMotion";

// Like the browser: cancel rejects finished; an exit (fill forwards) waits for finishExits().
let live: { options: KeyframeAnimationOptions; finish: () => void }[] = [];
const animate = vi.fn(function (this: Element, _keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  let finish!: () => void;
  let reject!: (error: Error) => void;
  const finished = new Promise<void>((resolve, fail) => { finish = resolve; reject = fail; });
  const animation = { options, finish, finished, effect: { getTiming: () => options }, cancel: () => { live = live.filter((a) => a !== animation); reject(new Error("AbortError")); } };
  finished.catch(() => {});
  live.push(animation);
  if (options.fill !== "forwards") finish();
  return animation;
});
const finishExits = () => live.filter((a) => a.options.fill === "forwards").forEach((a) => a.finish());
const keyframes = (call: number) => (animate.mock.calls[call] as unknown as [Keyframe[]])[0];
let reduced = false;

beforeEach(() => {
  vi.clearAllMocks();
  reduced = false;
  document.documentElement.removeAttribute("style");
  live = [];
  Element.prototype.animate = animate as unknown as Element["animate"];
  Element.prototype.getAnimations = () => live as unknown as Animation[];
  window.matchMedia = ((query: string) => ({ matches: reduced && query.includes("reduce") })) as typeof window.matchMedia;
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function List({ requested = null }: { requested?: string | null }) {
  return (
    <ProgressScreen requested={requested}>
      <h1>Progress</h1>
      <a href="/progress?week=2026-10-19">Oct 19 – 25</a>
      <a href="/progress?week=2026-10-12">Oct 12 – 18</a>
    </ProgressScreen>
  );
}

function Week({ week }: { week: string }) {
  return (
    <ProgressScreen week={week} requested={week}>
      <a href="/progress">← All weeks</a>
      <h1 tabIndex={-1}>Week of {week}</h1>
      <a href="/progress?week=2026-10-05">← Older week</a>
    </ProgressScreen>
  );
}

function WeekWithSections({ week }: { week: string }) {
  return (
    <ProgressScreen week={week} requested={week}>
      <header data-page-section>
        <h1 tabIndex={-1}>Week of {week}</h1>
        <a href="/progress?week=2026-10-05">← Older week</a>
      </header>
      <section data-page-section>Monday</section>
    </ProgressScreen>
  );
}

const placeholderShown = (container: HTMLElement) => container.textContent!.includes("Past week");
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

function show(href: string, page: React.ReactNode, rerender?: (ui: React.ReactNode) => void) {
  history.replaceState(null, "", href);
  if (rerender) rerender(<ProgressMotion>{page}</ProgressMotion>);
  else return render(<ProgressMotion>{page}</ProgressMotion>);
}

describe("ProgressMotion", () => {
  it("opens a week at the top with focus on its title, and All weeks returns to the scroll spot and the row left", async () => {
    const { rerender } = show("/progress", <List />)!;
    window.scrollY = 640;

    fireEvent.click(screen.getByRole("link", { name: "Oct 12 – 18" }));
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/progress?week=2026-10-12", { scroll: false }));
    show("/progress?week=2026-10-12", <Week week="2026-10-12" />, rerender);
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Week of 2026-10-12" }));

    window.scrollY = 0;
    fireEvent.click(screen.getByRole("link", { name: "← All weeks" }));
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenLastCalledWith("/progress", { scroll: false }));
    show("/progress", <List />, rerender);
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 640);
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Oct 12 – 18" }));
  });

  it("keeps the old week on screen, dimmed and busy, until the new week arrives", async () => {
    const { container, rerender } = show("/progress?week=2026-10-12", <Week week="2026-10-12" />)!;
    const area = container.firstElementChild!.firstElementChild!;
    fireEvent.click(screen.getByRole("link", { name: "← Older week" }));
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/progress?week=2026-10-05", { scroll: false }));
    expect(keyframes(0).at(-1)).toMatchObject({ opacity: 0.5 });
    expect(area.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("heading", { name: "Week of 2026-10-12" })).toBeDefined();

    show("/progress?week=2026-10-05", <Week week="2026-10-05" />, rerender);
    expect(area.hasAttribute("aria-busy")).toBe(false);
    expect(keyframes(1)[0]).toMatchObject({ opacity: 0.5 });
    expect(keyframes(1).at(-1)).toMatchObject({ opacity: 1 });
  });

  it("starts one navigation when Older is clicked twice during its transition", async () => {
    show("/progress?week=2026-10-12", <Week week="2026-10-12" />);
    const older = screen.getByRole("link", { name: "← Older week" });
    fireEvent.click(older);
    fireEvent.click(older);
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalled());
    expect(mocks.push).toHaveBeenCalledOnce();
  });

  it("holds Back until the page has dimmed, then hands it to the router", async () => {
    const { rerender } = show("/progress?week=2026-10-12", <Week week="2026-10-12" />)!;
    fireEvent.click(screen.getByRole("link", { name: "← All weeks" }));
    show("/progress", <List />, rerender);

    const router = vi.fn();
    addEventListener("popstate", router);
    animate.mockClear();
    history.replaceState(null, "", "/progress?week=2026-10-12");
    dispatchEvent(new PopStateEvent("popstate"));
    expect(router).not.toHaveBeenCalled();
    expect(keyframes(0).at(-1)).toMatchObject({ opacity: 0.5 });
    finishExits();
    await vi.waitFor(() => expect(router).toHaveBeenCalledOnce());
    removeEventListener("popstate", router);
  });

  it("shows the list when Back is pressed while a click's exit is still running", async () => {
    const { rerender } = show("/progress?week=2026-10-12", <Week week="2026-10-12" />)!;
    fireEvent.click(screen.getByRole("link", { name: "← Older week" }));
    history.replaceState(null, "", "/progress");
    dispatchEvent(new PopStateEvent("popstate"));
    finishExits();
    show("/progress", <List />, rerender);
    expect(live.some((a) => a.options.fill === "forwards")).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Oct 12 – 18" }));
  });

  it("keeps Back when a page from an earlier click arrives during Back's exit", async () => {
    const { rerender } = show("/progress?week=2026-10-12", <Week week="2026-10-12" />)!;
    fireEvent.click(screen.getByRole("link", { name: "← Older week" }));
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole("link", { name: "← All weeks" }));

    const router = vi.fn();
    addEventListener("popstate", router);
    history.replaceState(null, "", "/progress?week=2026-10-19");
    dispatchEvent(new PopStateEvent("popstate"));
    show("/progress?week=2026-10-19", <Week week="2026-10-05" />, rerender);
    finishExits();
    await vi.waitFor(() => expect(router).toHaveBeenCalledOnce());
    removeEventListener("popstate", router);
  });

  it("drops a click when Forward leaves Progress during its exit", async () => {
    const { container } = show("/progress?week=2026-10-12", <Week week="2026-10-12" />)!;
    fireEvent.click(screen.getByRole("link", { name: "← Older week" }));
    history.replaceState(null, "", "/dashboard");
    dispatchEvent(new PopStateEvent("popstate"));
    finishExits();
    await Promise.resolve();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(container.firstElementChild!.firstElementChild!.hasAttribute("aria-busy")).toBe(false);
  });

  it("drops a held Back when Forward then leaves Progress", async () => {
    const { rerender } = show("/progress?week=2026-10-12", <Week week="2026-10-12" />)!;
    fireEvent.click(screen.getByRole("link", { name: "← All weeks" }));
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalled());
    show("/progress", <List />, rerender);

    const router = vi.fn();
    addEventListener("popstate", router);
    history.replaceState(null, "", "/progress?week=2026-10-12");
    dispatchEvent(new PopStateEvent("popstate"));
    history.replaceState(null, "", "/dashboard");
    dispatchEvent(new PopStateEvent("popstate"));
    finishExits();
    await new Promise((resolve) => setTimeout(resolve));
    expect(router).toHaveBeenCalledOnce();
    removeEventListener("popstate", router);
  });

  it("drops a click when a link outside Progress is clicked during its exit", async () => {
    show("/progress?week=2026-10-12", <Week week="2026-10-12" />);
    const nav = document.body.appendChild(document.createElement("a"));
    nav.href = "/dashboard";
    nav.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(screen.getByRole("link", { name: "← Older week" }));
    fireEvent.click(nav);
    finishExits();
    await new Promise((resolve) => setTimeout(resolve));
    expect(mocks.push).not.toHaveBeenCalled();
    nav.remove();
  });

  it("keeps a pending click when a link outside Progress opens in a new tab", async () => {
    show("/progress?week=2026-10-12", <Week week="2026-10-12" />);
    const nav = document.body.appendChild(document.createElement("a"));
    nav.href = "/dashboard";
    nav.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(screen.getByRole("link", { name: "← Older week" }));
    fireEvent.click(nav, { metaKey: true });
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/progress?week=2026-10-05", { scroll: false }));
    nav.remove();
  });

  it("still opens the newest target when an earlier page arrives during its exit", async () => {
    const { rerender } = show("/progress?week=2026-10-12", <Week week="2026-10-12" />)!;
    fireEvent.click(screen.getByRole("link", { name: "← Older week" }));
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/progress?week=2026-10-05", { scroll: false }));

    fireEvent.click(screen.getByRole("link", { name: "← All weeks" }));
    show("/progress?week=2026-10-05", <Week week="2026-10-05" />, rerender);
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenLastCalledWith("/progress", { scroll: false }));
  });

  it("fades the list back in when Back to an unknown week brings the same list", async () => {
    const { rerender } = show("/progress", <List />)!;
    history.replaceState(null, "", "/progress?week=2001-01-01");
    dispatchEvent(new PopStateEvent("popstate"));
    finishExits();
    show("/progress?week=2001-01-01", <List requested="2001-01-01" />, rerender);
    expect(live.some((a) => a.options.fill === "forwards")).toBe(false);
    expect(keyframes(animate.mock.calls.length - 1).at(-1)).toMatchObject({ opacity: 1 });
  });

  it("shows the page without motion under Strict Mode, as next dev mounts it, and still moves to a week", async () => {
    history.replaceState(null, "", "/progress");
    const { rerender } = render(<StrictMode><ProgressMotion><List /></ProgressMotion></StrictMode>);
    expect(screen.getByRole("heading", { name: "Progress" })).toBeDefined();
    expect(animate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("link", { name: "Oct 12 – 18" }));
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/progress?week=2026-10-12", { scroll: false }));
    history.replaceState(null, "", "/progress?week=2026-10-12");
    rerender(<StrictMode><ProgressMotion><Week week="2026-10-12" /></ProgressMotion></StrictMode>);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Week of 2026-10-12" }));
    expect(keyframes(animate.mock.calls.length - 1).at(-1)).toMatchObject({ opacity: 1, transform: "none" });
  });

  it("slides an older week out to the right and in from the left, and only fades under reduced motion", () => {
    const { rerender } = show("/progress?week=2026-10-12", <Week week="2026-10-12" />)!;
    fireEvent.click(screen.getByRole("link", { name: "← Older week" }));
    show("/progress?week=2026-10-05", <Week week="2026-10-05" />, rerender);
    expect(keyframes(0).at(-1)).toMatchObject({ opacity: 0.5, transform: "translateX(8px)" });
    expect(keyframes(1)[0]).toMatchObject({ opacity: 0.5, transform: "translateX(-8px)" });

    animate.mockClear();
    reduced = true;
    document.documentElement.style.setProperty("--duration-fast", ".12s");
    document.documentElement.style.setProperty("--ease-standard", "cubic-bezier(0.2, 0, 0, 1)");
    fireEvent.click(screen.getByRole("link", { name: "← All weeks" }));
    show("/progress", <List />, rerender);
    expect(animate).toHaveBeenCalledTimes(2);
    expect(keyframes(0).at(-1)).toMatchObject({ opacity: 0.5, transform: "translateX(0px)" });
    expect(animate.mock.calls[1]).toEqual([[{ opacity: 0.5 }, { opacity: 1 }], { duration: 120, easing: "cubic-bezier(0.2, 0, 0, 1)" }]);
  });

  it("dims the old week, then shows the week placeholder after 150 ms, then hands off to the week's sections", async () => {
    vi.useFakeTimers();
    const { container, rerender } = show("/progress?week=2026-10-12", <WeekWithSections week="2026-10-12" />)!;
    animate.mockClear();
    fireEvent.click(screen.getByRole("link", { name: "← Older week" }));
    finishExits();
    await act(async () => {});
    expect(mocks.push).toHaveBeenCalledWith("/progress?week=2026-10-05", { scroll: false });
    expect(keyframes(0).at(-1)).toMatchObject({ opacity: 0.5 });

    await wait(149);
    expect(placeholderShown(container)).toBe(false);
    expect(screen.getByRole("heading", { name: "Week of 2026-10-12" })).toBeDefined();

    await wait(1);
    expect(placeholderShown(container)).toBe(true);
    expect(screen.queryByRole("heading", { name: "Week of 2026-10-12" })).toBeNull();
    expect(screen.getByText("Past week").closest("[aria-hidden]")).not.toBeNull();
    expect(screen.getByText("Past week").closest("[aria-busy]")).toBeNull();

    animate.mockClear();
    show("/progress?week=2026-10-05", <WeekWithSections week="2026-10-05" />, rerender);
    expect(placeholderShown(container)).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Week of 2026-10-05" }));
    expect(container.firstElementChild!.firstElementChild!.hasAttribute("aria-busy")).toBe(false);
    const rises = animate.mock.contexts.filter((el) => (el as HTMLElement).hasAttribute("data-page-section"));
    expect(rises).toHaveLength(2);
    expect(keyframes(animate.mock.contexts.indexOf(rises[0]))[0]).toMatchObject({ opacity: 0, transform: "translateY(8px)" });
  });

  it("counts the 150 ms from the request for the next week, which starts once the old week has dimmed", async () => {
    vi.useFakeTimers();
    const { container } = show("/progress?week=2026-10-12", <Week week="2026-10-12" />)!;
    fireEvent.click(screen.getByRole("link", { name: "← Older week" }));
    await wait(300);
    expect(placeholderShown(container)).toBe(false);
    finishExits();
    await act(async () => {});
    expect(mocks.push).toHaveBeenCalledWith("/progress?week=2026-10-05", { scroll: false });
    await wait(149);
    expect(placeholderShown(container)).toBe(false);
    await wait(1);
    expect(placeholderShown(container)).toBe(true);
  });

  it("drops the first click's placeholder when a second click starts within its wait", async () => {
    vi.useFakeTimers();
    const { container } = show("/progress?week=2026-10-12", <Week week="2026-10-12" />)!;
    fireEvent.click(screen.getByRole("link", { name: "← Older week" }));
    finishExits();
    await act(async () => {});
    await wait(100);
    fireEvent.click(screen.getByRole("link", { name: "← All weeks" }));
    await wait(100);
    expect(placeholderShown(container)).toBe(false);
  });

  it("shows no placeholder when the next week arrives within 150 ms", async () => {
    vi.useFakeTimers();
    const { container, rerender } = show("/progress?week=2026-10-12", <Week week="2026-10-12" />)!;
    fireEvent.click(screen.getByRole("link", { name: "← Older week" }));
    finishExits();
    await act(async () => {});
    await wait(100);
    show("/progress?week=2026-10-05", <Week week="2026-10-05" />, rerender);
    await wait(500);
    expect(placeholderShown(container)).toBe(false);
    expect(screen.getByRole("heading", { name: "Week of 2026-10-05" })).toBeDefined();
  });

  it("shows no placeholder on Back, which brings back a page the browser kept", async () => {
    vi.useFakeTimers();
    const { container, rerender } = show("/progress?week=2026-10-12", <Week week="2026-10-12" />)!;
    fireEvent.click(screen.getByRole("link", { name: "← All weeks" }));
    show("/progress", <List />, rerender);

    history.replaceState(null, "", "/progress?week=2026-10-12");
    dispatchEvent(new PopStateEvent("popstate"));
    finishExits();
    await wait(500);
    expect(placeholderShown(container)).toBe(false);
    expect(screen.getByRole("heading", { name: "Progress" })).toBeDefined();
  });
});
