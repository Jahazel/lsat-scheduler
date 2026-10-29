// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
import ProgressMotion, { ProgressScreen } from "./ProgressMotion";

const animate = vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn() }));
const keyframes = (call: number) => (animate.mock.calls[call] as unknown as [Keyframe[]])[0];
let reduced = false;

beforeEach(() => {
  vi.clearAllMocks();
  reduced = false;
  Element.prototype.animate = animate as unknown as Element["animate"];
  Element.prototype.getAnimations = () => [];
  window.matchMedia = ((query: string) => ({ matches: reduced && query.includes("reduce") })) as typeof window.matchMedia;
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});
afterEach(cleanup);

function List() {
  return (
    <ProgressScreen>
      <h1>Progress</h1>
      <a href="/progress?week=2026-10-19">Oct 19 – 25</a>
      <a href="/progress?week=2026-10-12">Oct 12 – 18</a>
    </ProgressScreen>
  );
}

function Week({ week }: { week: string }) {
  return (
    <ProgressScreen week={week}>
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
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/progress?week=2026-10-12", { scroll: false }));
    show("/progress?week=2026-10-12", <Week week="2026-10-12" />, rerender);
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Week of 2026-10-12" }));

    window.scrollY = 0;
    fireEvent.click(screen.getByRole("link", { name: "← All weeks" }));
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
    await vi.waitFor(() => expect(router).toHaveBeenCalledOnce());
    removeEventListener("popstate", router);
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
