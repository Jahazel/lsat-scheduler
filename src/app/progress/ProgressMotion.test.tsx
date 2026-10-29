// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

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
  live = [];
  Element.prototype.animate = animate as unknown as Element["animate"];
  Element.prototype.getAnimations = () => live as unknown as Animation[];
  window.matchMedia = ((query: string) => ({ matches: reduced && query.includes("reduce") })) as typeof window.matchMedia;
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});
afterEach(cleanup);

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

  it("starts one navigation when Older is clicked twice during its transition", async () => {
    show("/progress?week=2026-10-12", <Week week="2026-10-12" />);
    const older = screen.getByRole("link", { name: "← Older week" });
    fireEvent.click(older);
    fireEvent.click(older);
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalled());
    expect(mocks.push).toHaveBeenCalledOnce();
  });

  it("holds Back until the page has faded out, then hands it to the router", async () => {
    const { rerender } = show("/progress?week=2026-10-12", <Week week="2026-10-12" />)!;
    fireEvent.click(screen.getByRole("link", { name: "← All weeks" }));
    show("/progress", <List />, rerender);

    const router = vi.fn();
    addEventListener("popstate", router);
    animate.mockClear();
    history.replaceState(null, "", "/progress?week=2026-10-12");
    dispatchEvent(new PopStateEvent("popstate"));
    expect(router).not.toHaveBeenCalled();
    expect(keyframes(0).at(-1)).toMatchObject({ opacity: 0 });
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
    show("/progress?week=2026-10-12", <Week week="2026-10-12" />);
    fireEvent.click(screen.getByRole("link", { name: "← Older week" }));
    history.replaceState(null, "", "/dashboard");
    dispatchEvent(new PopStateEvent("popstate"));
    finishExits();
    await Promise.resolve();
    expect(mocks.push).not.toHaveBeenCalled();
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

  it("slides an older week out to the right and in from the left, and only fades under reduced motion", () => {
    const { rerender } = show("/progress?week=2026-10-12", <Week week="2026-10-12" />)!;
    fireEvent.click(screen.getByRole("link", { name: "← Older week" }));
    show("/progress?week=2026-10-05", <Week week="2026-10-05" />, rerender);
    expect(keyframes(0).at(-1)).toMatchObject({ opacity: 0, transform: "translateX(8px)" });
    expect(keyframes(1)[0]).toMatchObject({ opacity: 0, transform: "translateX(-8px)" });

    animate.mockClear();
    reduced = true;
    fireEvent.click(screen.getByRole("link", { name: "← All weeks" }));
    show("/progress", <List />, rerender);
    expect(animate).toHaveBeenCalledOnce();
    expect(animate.mock.calls[0]).toEqual([[{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: "linear" }]);
  });
});
