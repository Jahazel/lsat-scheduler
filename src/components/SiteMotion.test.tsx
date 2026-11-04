// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Link from "next/link";
import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ push: vi.fn(), pathname: "/" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }), usePathname: () => mocks.pathname }));
import SiteMotion from "./SiteMotion";

type Live = { el: Element; keyframes: Keyframe[]; options: KeyframeAnimationOptions; finish: () => void };
let live: Live[] = [];
let calls: Live[] = [];
const animate = vi.fn(function (this: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  let finish!: () => void;
  let reject!: (error: Error) => void;
  const finished = new Promise<void>((resolve, fail) => { finish = resolve; reject = fail; });
  const animation = { el: this, keyframes, options, finish, finished, cancel: () => { live = live.filter((a) => a !== animation); reject(new Error("AbortError")); } };
  finished.catch(() => {});
  live.push(animation);
  calls.push(animation);
  if (options.fill !== "forwards") finish();
  return animation;
});
const finishExits = () => live.filter((a) => a.options.fill === "forwards").forEach((a) => a.finish());
const exits = () => calls.filter((a) => a.options.fill === "forwards");
const entrances = () => calls.filter((a) => a.options.fill !== "forwards" && !(a.el as HTMLElement).hasAttribute("data-page-logo"));
const glides = () => calls.filter((a) => (a.el as HTMLElement).hasAttribute("data-page-logo"));
const TOP_BAR_LOGO = new DOMRect(48, 20, 80, 24);
const SIGN_IN_LOGO = new DOMRect(120, 32, 80, 24);
let reduced = false;
let phone = false;

beforeEach(() => {
  vi.clearAllMocks();
  reduced = false;
  phone = false;
  live = [];
  calls = [];
  const tokens = document.documentElement.style;
  tokens.setProperty("--duration-fast", "120ms");
  tokens.setProperty("--duration-base", "200ms");
  tokens.setProperty("--ease-standard", "cubic-bezier(0.2, 0, 0, 1)");
  tokens.setProperty("--ease-exit", "cubic-bezier(0.4, 0, 1, 1)");
  Element.prototype.animate = animate as unknown as Element["animate"];
  Element.prototype.getAnimations = function (this: Element) { return live.filter((a) => a.el === this) as unknown as Animation[]; };
  Element.prototype.getBoundingClientRect = function (this: Element) {
    if (!this.hasAttribute("data-page-logo")) return new DOMRect();
    return this.closest("[data-sign-in-page]") ? SIGN_IN_LOGO : TOP_BAR_LOGO;
  };
  window.matchMedia = ((query: string) => ({ matches: (reduced && query.includes("reduce")) || (phone && query.includes("390px")) })) as typeof window.matchMedia;
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  window.scrollY = 0;
});
afterEach(cleanup);

function Landing() {
  return (
    <>
      <header>
        <Link data-page-logo href="/">DrillMap</Link>
        <nav data-page-fade style={{ opacity: 1 }}>
          <a href="/login">Log in</a>
          <a href="/signup">Start free week</a>
        </nav>
      </header>
      <main tabIndex={-1}>
        <div data-page-fade style={{ opacity: 1 }}>
          <h1 tabIndex={-1}>Your practice results</h1>
          <a href="/signup">Start free week</a>
          <a href="/progress">Progress</a>
        </div>
      </main>
    </>
  );
}

function SignIn({ title }: { title: string }) {
  return (
    <main tabIndex={-1}>
      <div data-sign-in-page>
        <Link data-page-logo href="/">DrillMap</Link>
        <div data-page-fade style={{ opacity: 1 }}>
          <h1 tabIndex={-1}>{title}</h1>
          <a href="/legal/terms">Terms</a>
        </div>
      </div>
    </main>
  );
}

const PAGES: Record<string, () => React.ReactNode> = {
  "/": () => <Landing />,
  "/signup": () => <SignIn title="Sign up for DrillMap" />,
  "/login": () => <SignIn title="Log in to DrillMap" />,
  "/dashboard": () => <main><h1 tabIndex={-1}>This week</h1><Link href="/">DrillMap</Link></main>,
};

function show(path: string, rerender?: (ui: React.ReactNode) => void) {
  mocks.pathname = path;
  history.replaceState(null, "", path);
  const ui = <>{PAGES[path]()}<SiteMotion /></>;
  if (rerender) rerender(ui);
  else return render(ui);
}

async function click(name: string) {
  fireEvent.click(screen.getAllByRole("link", { name })[0]);
}

describe("SiteMotion", () => {
  it("fades the landing page out, then fades Sign up in with a rise, glides the logo, and focuses the heading", async () => {
    const { rerender } = show("/")!;
    await click("Start free week");
    expect(mocks.push).not.toHaveBeenCalled();
    expect(exits()).toHaveLength(2);
    for (const exit of exits()) {
      expect(exit.keyframes.at(-1)).toMatchObject({ opacity: 0 });
      expect(exit.options).toMatchObject({ duration: 120, easing: "cubic-bezier(0.4, 0, 1, 1)" });
    }
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/signup", { scroll: false }));

    show("/signup", rerender);
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "instant" });
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Sign up for DrillMap" }));
    expect(entrances()).toHaveLength(1);
    expect(entrances()[0].keyframes).toEqual([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }]);
    expect(entrances()[0].options).toEqual({ duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" });
    expect(glides()).toHaveLength(1);
    expect(glides()[0].keyframes).toEqual([{ transform: "translate(-72px, -12px)" }, { transform: "none" }]);
    expect(glides()[0].options).toEqual({ duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" });
    expect(glides()[0].keyframes.some((frame) => "opacity" in frame)).toBe(false);
  });

  it("rises 4 px at phone width, and the sign-in logo takes the reverse path to the landing page", async () => {
    phone = true;
    const { rerender } = show("/login")!;
    await click("DrillMap");
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/", { scroll: false }));
    show("/", rerender);
    expect(entrances().map((a) => a.keyframes[0])).toEqual([
      { opacity: 0, transform: "translateY(4px)" },
      { opacity: 0, transform: "translateY(4px)" },
    ]);
    expect(glides()[0].keyframes[0]).toEqual({ transform: "translate(72px, 12px)" });
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Your practice results" }));
  });

  it("makes the old content inert and busy while it fades out, and moves focus out of it", async () => {
    show("/");
    const link = screen.getAllByRole("link", { name: "Start free week" })[0];
    link.focus();
    fireEvent.click(link);
    const faded = document.querySelectorAll("[data-page-fade]");
    for (const region of faded) {
      expect(region.hasAttribute("inert")).toBe(true);
      expect(region.getAttribute("aria-busy")).toBe("true");
    }
    expect(document.activeElement).toBe(document.querySelector("main"));
  });

  it("holds Back until the fade-out ends, keeps the old page at its own scroll spot, and returns the landing page to its spot", async () => {
    const { rerender } = show("/")!;
    window.scrollY = 640;
    await click("Start free week");
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalled());
    show("/signup", rerender);

    const router = vi.fn();
    addEventListener("popstate", router);
    window.scrollY = 120;
    dispatchEvent(new Event("scroll"));
    window.scrollY = 30;
    history.replaceState(null, "", "/");
    dispatchEvent(new PopStateEvent("popstate"));
    dispatchEvent(new Event("scroll"));
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 120, behavior: "instant" });
    expect(router).not.toHaveBeenCalled();
    expect(exits().at(-1)!.keyframes.at(-1)).toMatchObject({ opacity: 0 });
    finishExits();
    await vi.waitFor(() => expect(router).toHaveBeenCalledOnce());
    removeEventListener("popstate", router);

    show("/", rerender);
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 640, behavior: "instant" });
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Your practice results" }));
  });

  it("starts one navigation when a link is clicked twice", async () => {
    show("/");
    await click("Start free week");
    await click("Start free week");
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalled());
    expect(mocks.push).toHaveBeenCalledOnce();
  });

  it("fades back in from the current frame when the logo is clicked during the fade-out", async () => {
    show("/");
    await click("Start free week");
    const content = screen.getByRole("heading", { name: "Your practice results" }).parentElement!;
    content.style.opacity = "0.4";
    await click("DrillMap");
    finishExits();
    await new Promise((resolve) => setTimeout(resolve));
    expect(mocks.push).not.toHaveBeenCalled();
    expect(content.hasAttribute("inert")).toBe(false);
    expect(content.hasAttribute("aria-busy")).toBe(false);
    const back = entrances().find((a) => a.el === content)!;
    expect(back.keyframes[0]).toMatchObject({ opacity: "0.4" });
    expect(back.keyframes.at(-1)).toMatchObject({ opacity: 1 });
  });

  it("fades out from the current frame, in less time, when a link is clicked during the fade-in", async () => {
    const { rerender } = show("/")!;
    await click("Log in");
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalled());
    show("/login", rerender);
    const form = screen.getByRole("heading", { name: "Log in to DrillMap" }).parentElement!;
    form.style.opacity = "0.5";
    await click("DrillMap");
    const exit = exits().at(-1)!;
    expect(exit.el).toBe(form);
    expect(exit.keyframes[0]).toMatchObject({ opacity: "0.5" });
    expect(exit.options.duration).toBe(60);
  });

  it("only fades in for 120 ms under reduced motion, with no movement and no glide", async () => {
    reduced = true;
    const { rerender } = show("/")!;
    await click("Start free week");
    expect(exits()).toHaveLength(0);
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/signup", { scroll: false }));
    show("/signup", rerender);
    expect(entrances().map((a) => [a.keyframes, a.options])).toEqual([[[{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: "linear" }]]);
    expect(glides()).toHaveLength(0);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Sign up for DrillMap" }));
  });

  it("lets modifier clicks, pages out of scope, and signed-in pages change with no motion", async () => {
    const passedThrough: boolean[] = [];
    const browser = (event: MouseEvent) => { passedThrough.push(!event.defaultPrevented); event.preventDefault(); };
    document.addEventListener("click", browser);
    const { rerender } = show("/")!;
    fireEvent.click(screen.getAllByRole("link", { name: "Start free week" })[0], { metaKey: true });
    fireEvent.click(screen.getByRole("link", { name: "Progress" }));
    show("/login", rerender);
    fireEvent.click(screen.getByRole("link", { name: "Terms" }));
    show("/dashboard", rerender);
    fireEvent.click(screen.getByRole("link", { name: "DrillMap" }));
    document.removeEventListener("click", browser);
    expect(passedThrough).toEqual([true, true, true, true]);
    expect(animate).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("shows a redirected page as it is and frees the content that stays on screen", async () => {
    mocks.pathname = "/";
    const withFooter = (page: React.ReactNode) => <>{page}<footer data-page-fade style={{ opacity: 1 }}>Footer</footer><SiteMotion /></>;
    const { rerender } = render(withFooter(<Landing />));
    await click("Log in");
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalled());
    mocks.pathname = "/dashboard";
    rerender(withFooter(PAGES["/dashboard"]()));
    const footer = screen.getByText("Footer");
    expect(footer.hasAttribute("inert")).toBe(false);
    expect(footer.hasAttribute("aria-busy")).toBe(false);
    expect(live.some((a) => a.el === footer)).toBe(false);
    expect(entrances()).toHaveLength(0);
  });

  it("shows the first page without motion under Strict Mode, and still moves to Sign up", async () => {
    mocks.pathname = "/";
    const { rerender } = render(<StrictMode><Landing /><SiteMotion /></StrictMode>);
    expect(animate).not.toHaveBeenCalled();
    await click("Start free week");
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledOnce());
    mocks.pathname = "/signup";
    rerender(<StrictMode><SignIn title="Sign up for DrillMap" /><SiteMotion /></StrictMode>);
    expect(entrances()).toHaveLength(1);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Sign up for DrillMap" }));
  });
});
