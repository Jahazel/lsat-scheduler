// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Link from "next/link";
import { StrictMode, useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), pathname: "/" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, replace: mocks.replace }), usePathname: () => mocks.pathname }));
import SiteMotion, { PageCue, fadeFormThrough } from "./SiteMotion";

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
const ROUTER_ENTRY = { __NA: true };
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
  Element.prototype.getClientRects = function (this: Element) {
    return (this.closest("[hidden]") ? [] : [new DOMRect()]) as unknown as DOMRectList;
  };
  Element.prototype.getBoundingClientRect = function (this: Element) {
    if (!this.hasAttribute("data-page-logo") || this.closest("[hidden]")) return new DOMRect();
    if (!this.closest("[data-sign-in-page]")) return TOP_BAR_LOGO;
    return new DOMRect(SIGN_IN_LOGO.x, SIGN_IN_LOGO.y - window.scrollY, SIGN_IN_LOGO.width, SIGN_IN_LOGO.height);
  };
  window.matchMedia = ((query: string) => ({ matches: (reduced && query.includes("reduce")) || (phone && query.includes("390px")) })) as typeof window.matchMedia;
  window.scrollTo = vi.fn(({ top }: ScrollToOptions) => { window.scrollY = top ?? 0; }) as unknown as typeof window.scrollTo;
  window.scrollY = 0;
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

function TopBar({ hidden }: { hidden?: boolean }) {
  return (
    <header hidden={hidden}>
      <Link data-page-logo href="/">DrillMap</Link>
      <nav data-page-fade aria-label="Primary" style={{ opacity: 1 }}>
        <Link href="/#how-it-works">How it works</Link>
        <a href="/login">Log in</a>
        <a href="/signup">Start free week</a>
      </nav>
    </header>
  );
}

function Landing() {
  return (
    <>
      <TopBar />
      <main tabIndex={-1}>
        <div data-page-fade style={{ opacity: 1 }}>
          <h1 tabIndex={-1}>Your practice results</h1>
          <a href="/signup">Start free week</a>
          <a href="/progress">Progress</a>
          <section id="how-it-works">How it works</section>
          <a href="/legal/terms">Terms of Service</a>
        </div>
      </main>
    </>
  );
}

function Legal({ title }: { title: string }) {
  return (
    <>
      <TopBar />
      <main tabIndex={-1}>
        <div data-page-fade aria-label="Legal text" style={{ opacity: 1 }}>
          <h1 tabIndex={-1}>{title}</h1>
          <a href="/legal/privacy">Privacy Policy</a>
        </div>
      </main>
    </>
  );
}

function SignIn({ title, notice, children }: { title: string; notice?: string; children?: React.ReactNode }) {
  return (
    <>
      <TopBar hidden />
      <main tabIndex={-1}>
        <div data-sign-in-page style={{ opacity: 1 }}>
          <PageCue page="sign-in" />
          <Link data-page-logo href="/">DrillMap</Link>
          <div data-page-swap style={{ opacity: 1 }}>
            <h1 tabIndex={-1}>{title}</h1>
            {notice && <p role="status">{notice}</p>}
            {children}
          </div>
          <nav data-page-fade aria-label="Legal" style={{ opacity: 1 }}>
            <a href="/legal/terms">Terms</a>
          </nav>
          <div data-page-fade aria-label="Preview panel" style={{ opacity: 1 }}>
            <div data-page-swap aria-label="Preview card" style={{ opacity: 1 }}>Preview</div>
          </div>
        </div>
      </main>
      <footer hidden data-page-fade aria-label="Footer" style={{ opacity: 1 }}>Footer</footer>
    </>
  );
}

const PAGES: Record<string, () => React.ReactNode> = {
  "/": () => <Landing />,
  "/signup": () => <SignIn title="Sign up for DrillMap"><a href="/login">Log in</a></SignIn>,
  "/login": () => (
    <SignIn title="Log in to DrillMap" notice={location.search ? "Your password is changed. Log in with the new one." : undefined}>
      <a href="/forgot-password">Forgot password?</a>
      <a href="/signup">Sign up</a>
    </SignIn>
  ),
  "/forgot-password": () => <SignIn title="Reset your password"><a href="/login">Log in</a></SignIn>,
  "/legal/terms": () => <Legal title="Terms of Service" />,
  "/legal/privacy": () => <Legal title="Privacy Policy" />,
  "/dashboard": () => <main><h1 tabIndex={-1}>This week</h1><Link href="/">DrillMap</Link></main>,
};

function show(url: string, rerender?: (ui: React.ReactNode) => void) {
  const path = new URL(url, location.origin).pathname;
  mocks.pathname = path;
  history.replaceState(null, "", url);
  const ui = <>{PAGES[path]()}<SiteMotion signedIn={false} /></>;
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
    expect(entrances().map((a) => a.el.getAttribute("aria-label") ?? "form")).toEqual(["form", "Legal", "Preview panel"]);
    for (const entrance of entrances()) {
      expect(entrance.keyframes).toEqual([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }]);
      expect(entrance.options).toEqual({ duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" });
    }
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
    history.replaceState(ROUTER_ENTRY, "", "/");
    dispatchEvent(new PopStateEvent("popstate", { state: ROUTER_ENTRY }));
    dispatchEvent(new Event("scroll"));
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 120, behavior: "instant" });
    expect(router).not.toHaveBeenCalled();
    expect(exits().at(-1)!.keyframes.at(-1)).toMatchObject({ opacity: 0 });
    finishExits();
    await vi.waitFor(() => expect(router).toHaveBeenCalledOnce());
    removeEventListener("popstate", router);

    show("/", rerender);
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 640, behavior: "instant" });
    vi.mocked(window.scrollTo).mockClear();
    window.scrollY = 900;
    dispatchEvent(new Event("scroll"));
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Your practice results" }));
  });

  describe("Back to a landing entry the router did not write, such as a hash the browser added", () => {
    async function backToBrowserHash(rerender: (ui: React.ReactNode) => void) {
      await click("Log in");
      finishExits();
      await vi.waitFor(() => expect(mocks.push).toHaveBeenCalled());
      show("/login", rerender);
      history.replaceState(null, "", "/#pricing");
      dispatchEvent(new PopStateEvent("popstate", { state: null }));
    }

    it("asks the router for the landing page once Log in has faded out, then frees and fades it in", async () => {
      const { rerender } = show("/#pricing")!;
      await backToBrowserHash(rerender);
      expect(mocks.replace).not.toHaveBeenCalled();
      finishExits();
      await vi.waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/#pricing", { scroll: false }));

      show("/#pricing", rerender);
      expect(document.querySelectorAll("[inert]")).toHaveLength(0);
      expect(entrances().at(-1)!.keyframes.at(-1)).toMatchObject({ opacity: 1 });
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Your practice results" }));
    });

    it("asks the router for the landing page under reduced motion instead of leaving Log in inert", async () => {
      reduced = true;
      const { rerender } = show("/#pricing")!;
      await backToBrowserHash(rerender);
      await vi.waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/#pricing", { scroll: false }));

      show("/#pricing", rerender);
      expect(document.querySelectorAll("[inert]")).toHaveLength(0);
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Your practice results" }));
    });
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
    const exit = exits().find((a) => a.el === form)!;
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
    expect(entrances()).toHaveLength(3);
    for (const entrance of entrances()) expect([entrance.keyframes, entrance.options]).toEqual([[{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: "cubic-bezier(0.2, 0, 0, 1)" }]);
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
    show("/dashboard", rerender);
    fireEvent.click(screen.getByRole("link", { name: "DrillMap" }));
    document.removeEventListener("click", browser);
    expect(passedThrough).toEqual([true, true, true]);
    expect(animate).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("leaves the hidden top bar and footer of a sign-in page still, on the way in and on the way out", async () => {
    const { rerender } = show("/")!;
    await click("Start free week");
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/signup", { scroll: false }));
    show("/signup", rerender);
    const arrivals = calls;
    calls = [];
    await click("DrillMap");
    const hidden = [...document.querySelectorAll("[hidden]")].filter((el) => el.matches("header, footer"));
    expect(hidden).toHaveLength(2);
    expect([...arrivals, ...calls].filter((a) => hidden.some((el) => el.contains(a.el)))).toEqual([]);
    expect(hidden.some((el) => el.querySelector("[inert], [aria-busy]") || el.matches("[inert], [aria-busy]"))).toBe(false);
    expect(exits().map((a) => a.el.getAttribute("aria-label") ?? "form")).toEqual(["form", "Legal", "Preview panel"]);
  });

  it("shows a redirected page as it is and frees the content that stays on screen", async () => {
    mocks.pathname = "/";
    const withFooter = (page: React.ReactNode) => <>{page}<footer data-page-fade style={{ opacity: 1 }}>Footer</footer><SiteMotion signedIn={false} /></>;
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

  it("lets the page scroll again when a redirect lands during a held Back", async () => {
    const { rerender } = show("/")!;
    await click("Log in");
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalled());
    show("/login", rerender);
    history.replaceState(ROUTER_ENTRY, "", "/");
    dispatchEvent(new PopStateEvent("popstate", { state: ROUTER_ENTRY }));
    mocks.pathname = "/dashboard";
    rerender(<>{PAGES["/dashboard"]()}<SiteMotion signedIn={false} /></>);
    vi.mocked(window.scrollTo).mockClear();
    window.scrollY = 300;
    dispatchEvent(new Event("scroll"));
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("shows the first page without motion under Strict Mode, and still moves to Sign up", async () => {
    mocks.pathname = "/";
    const { rerender } = render(<StrictMode><Landing /><SiteMotion signedIn={false} /></StrictMode>);
    expect(animate).not.toHaveBeenCalled();
    await click("Start free week");
    finishExits();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledOnce());
    mocks.pathname = "/signup";
    rerender(<StrictMode><SignIn title="Sign up for DrillMap" /><SiteMotion signedIn={false} /></StrictMode>);
    expect(entrances()).toHaveLength(3);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Sign up for DrillMap" }));
  });

  describe("legal pages", () => {
    const topBar = () => screen.getByRole("navigation", { name: "Primary" });
    const legalText = () => screen.getByLabelText("Legal text");

    it("lets a signed-in student leave a legal page with no motion, so a redirect from the logo changes the page in one step", async () => {
      const passedThrough: boolean[] = [];
      const browser = (event: MouseEvent) => { passedThrough.push(!event.defaultPrevented); event.preventDefault(); };
      document.addEventListener("click", browser);
      mocks.pathname = "/legal/terms";
      const { rerender } = render(<><Legal title="Terms of Service" /><SiteMotion signedIn /></>);
      fireEvent.click(screen.getByRole("link", { name: "DrillMap" }));
      fireEvent.click(screen.getByRole("link", { name: "Privacy Policy" }));
      mocks.pathname = "/legal/privacy";
      rerender(<><Legal title="Privacy Policy" /><SiteMotion signedIn /></>);
      history.replaceState(ROUTER_ENTRY, "", "/legal/terms");
      const back = new PopStateEvent("popstate", { state: ROUTER_ENTRY });
      dispatchEvent(back);
      document.removeEventListener("click", browser);
      expect(passedThrough).toEqual([true, true]);
      expect(animate).not.toHaveBeenCalled();
      expect(legalText().hasAttribute("inert")).toBe(false);
      expect(mocks.push).not.toHaveBeenCalled();
    });

    it("fades only the landing content to Terms under a still top bar, with a rise and focus on the heading", async () => {
      const { rerender } = show("/")!;
      window.scrollY = 2400;
      await click("Terms of Service");
      expect(exits().map((a) => a.el)).toEqual([screen.getByRole("heading", { name: "Your practice results" }).parentElement]);
      expect(exits()[0].options).toMatchObject({ duration: 120, easing: "cubic-bezier(0.4, 0, 1, 1)" });
      expect(topBar().hasAttribute("inert")).toBe(false);
      finishExits();
      await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/legal/terms", { scroll: false }));

      show("/legal/terms", rerender);
      expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "instant" });
      expect(entrances().map((a) => a.el)).toEqual([legalText()]);
      expect(entrances()[0].keyframes).toEqual([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }]);
      expect(entrances()[0].options).toEqual({ duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" });
      expect(glides()).toHaveLength(0);
      expect(calls.some((a) => topBar().contains(a.el))).toBe(false);
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Terms of Service" }));
    });

    it("fades from one legal page to another under the same still top bar", async () => {
      const { rerender } = show("/legal/terms")!;
      await click("Privacy Policy");
      expect(exits().map((a) => a.el)).toEqual([legalText()]);
      finishExits();
      await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/legal/privacy", { scroll: false }));
      show("/legal/privacy", rerender);
      expect(entrances().map((a) => a.el)).toEqual([legalText()]);
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Privacy Policy" }));
    });

    it("returns to the landing page at its scroll spot on Back, with the top bar still", async () => {
      const { rerender } = show("/")!;
      window.scrollY = 2400;
      await click("Terms of Service");
      finishExits();
      await vi.waitFor(() => expect(mocks.push).toHaveBeenCalled());
      show("/legal/terms", rerender);

      const router = vi.fn();
      addEventListener("popstate", router);
      history.replaceState(ROUTER_ENTRY, "", "/");
      dispatchEvent(new PopStateEvent("popstate", { state: ROUTER_ENTRY }));
      expect(exits().at(-1)!.el).toBe(legalText());
      expect(topBar().hasAttribute("inert")).toBe(false);
      finishExits();
      await vi.waitFor(() => expect(router).toHaveBeenCalledOnce());
      removeEventListener("popstate", router);

      show("/", rerender);
      expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 2400, behavior: "instant" });
      expect(calls.some((a) => topBar().contains(a.el))).toBe(false);
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Your practice results" }));
    });

    async function reloadTermsThenBack() {
      const first = show("/")!;
      window.scrollY = 2400;
      await click("Terms of Service");
      finishExits();
      await vi.waitFor(() => expect(mocks.push).toHaveBeenCalled());
      show("/legal/terms", first.rerender);
      first.unmount();

      const { rerender } = show("/legal/terms")!;
      const router = vi.fn();
      addEventListener("popstate", router);
      history.replaceState(ROUTER_ENTRY, "", "/");
      dispatchEvent(new PopStateEvent("popstate", { state: ROUTER_ENTRY }));
      finishExits();
      await vi.waitFor(() => expect(router).toHaveBeenCalledOnce());
      removeEventListener("popstate", router);
      show("/", rerender);
    }

    it("returns to the landing page at its scroll spot on Back after the legal page is reloaded", async () => {
      await reloadTermsThenBack();
      expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 2400, behavior: "instant" });
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Your practice results" }));
    });

    it("lands at the top on Back after a reload when the browser refuses storage", async () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
      await reloadTermsThenBack();
      expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "instant" });
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Your practice results" }));
    });

    it("lands on the landing section a top-bar link names", async () => {
      const { rerender } = show("/legal/terms")!;
      await click("How it works");
      finishExits();
      await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/#how-it-works", { scroll: false }));
      vi.mocked(window.scrollTo).mockClear();
      show("/#how-it-works", rerender);
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledOnce();
      expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts[0]).toBe(document.getElementById("how-it-works"));
      expect(window.scrollTo).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Your practice results" }));
    });

    it("fades a sign-in page through to Terms and glides the logo to the top-bar spot", async () => {
      const { rerender } = show("/login")!;
      await click("Terms");
      expect(exits().map((a) => a.el.getAttribute("aria-label") ?? "form")).toEqual(["form", "Legal", "Preview panel"]);
      finishExits();
      await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/legal/terms", { scroll: false }));

      show("/legal/terms", rerender);
      expect(entrances().map((a) => a.el)).toEqual([topBar(), legalText()]);
      for (const entrance of entrances()) expect(entrance.keyframes[0]).toEqual({ opacity: 0, transform: "translateY(8px)" });
      expect(glides()).toHaveLength(1);
      expect(glides()[0].keyframes).toEqual([{ transform: "translate(72px, 12px)" }, { transform: "none" }]);
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Terms of Service" }));
    });

    it("only fades the legal page in for 120 ms under reduced motion, with no movement and no glide", async () => {
      reduced = true;
      const { rerender } = show("/signup")!;
      await click("Terms");
      expect(exits()).toHaveLength(0);
      await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/legal/terms", { scroll: false }));
      show("/legal/terms", rerender);
      expect(entrances()).toHaveLength(2);
      for (const entrance of entrances()) expect([entrance.keyframes, entrance.options]).toEqual([[{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: "cubic-bezier(0.2, 0, 0, 1)" }]);
      expect(glides()).toHaveLength(0);
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Terms of Service" }));
    });
  });

  describe("between sign-in pages", () => {
    const formOf = (title: string) => screen.getByRole("heading", { name: title }).parentElement!;
    const card = () => screen.getByLabelText("Preview card");
    const anchors = () => [screen.getByRole("navigation", { name: "Legal" }), screen.getByLabelText("Preview panel"), screen.getByRole("link", { name: "DrillMap" })];

    it("fades only the form and the preview card, rises them in, and focuses the form heading", async () => {
      const { rerender } = show("/signup")!;
      window.scrollY = 116;
      await click("Log in");
      expect(exits().map((a) => a.el)).toEqual([formOf("Sign up for DrillMap"), card()]);
      for (const exit of exits()) expect(exit.options).toMatchObject({ duration: 120, easing: "cubic-bezier(0.4, 0, 1, 1)" });
      for (const anchor of anchors()) {
        expect(anchor.hasAttribute("inert")).toBe(false);
        expect(anchor.hasAttribute("aria-busy")).toBe(false);
      }
      expect(formOf("Sign up for DrillMap").hasAttribute("inert")).toBe(true);
      expect(card().getAttribute("aria-busy")).toBe("true");
      finishExits();
      await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/login", { scroll: false }));

      show("/login", rerender);
      expect(entrances().map((a) => a.el)).toEqual([formOf("Log in to DrillMap"), card()]);
      for (const entrance of entrances()) {
        expect(entrance.keyframes).toEqual([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }]);
        expect(entrance.options).toEqual({ duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" });
      }
      expect(calls.some((a) => anchors().includes(a.el as HTMLElement))).toBe(false);
      expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "instant" });
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Log in to DrillMap" }));
    });

    it("moves Log in to Forgot password and back with the same form fade, and Back waits for the fade-out", async () => {
      const { rerender } = show("/login")!;
      await click("Forgot password?");
      finishExits();
      await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/forgot-password", { scroll: false }));
      show("/forgot-password", rerender);
      expect(entrances()).toHaveLength(2);

      const router = vi.fn();
      addEventListener("popstate", router);
      history.replaceState(ROUTER_ENTRY, "", "/login");
      dispatchEvent(new PopStateEvent("popstate", { state: ROUTER_ENTRY }));
      expect(router).not.toHaveBeenCalled();
      expect(exits().slice(-2).map((a) => a.el)).toEqual([formOf("Reset your password"), card()]);
      finishExits();
      await vi.waitFor(() => expect(router).toHaveBeenCalledOnce());
      removeEventListener("popstate", router);

      calls = [];
      show("/login", rerender);
      expect(entrances().map((a) => a.el)).toEqual([formOf("Log in to DrillMap"), card()]);
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Log in to DrillMap" }));
    });

    it("fades a notice at the top of the form in with the form", async () => {
      const { rerender } = show("/forgot-password")!;
      await click("Log in");
      finishExits();
      await vi.waitFor(() => expect(mocks.push).toHaveBeenCalled());
      show("/login?notice=passwordChanged", rerender);
      const notice = screen.getByRole("status");
      const fadingIn = entrances().filter((a) => a.el.contains(notice));
      expect(fadingIn.map((a) => a.el)).toEqual([formOf("Log in to DrillMap")]);
    });

    it("only fades the form and card in for 120 ms under reduced motion", async () => {
      reduced = true;
      const { rerender } = show("/login")!;
      await click("Sign up");
      expect(exits()).toHaveLength(0);
      await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/signup", { scroll: false }));
      show("/signup", rerender);
      expect(entrances().map((a) => a.el)).toEqual([formOf("Sign up for DrillMap"), card()]);
      for (const entrance of entrances()) expect([entrance.keyframes, entrance.options]).toEqual([[{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: "cubic-bezier(0.2, 0, 0, 1)" }]);
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Sign up for DrillMap" }));
    });

    function SignupThenCheckEmail() {
      const [sent, setSent] = useState(false);
      return sent
        ? <SignIn title="Check your email"><button type="button" onClick={() => fadeFormThrough(() => setSent(false))}>Sign up again</button></SignIn>
        : (
          <SignIn title="Sign up for DrillMap">
            <button type="button" onClick={() => fadeFormThrough(() => setSent(true))}>Create account</button>
            <a href="/login">Log in</a>
          </SignIn>
        );
    }

    it("fades the form through when the page changes its own content, as Sign up does after Create account", async () => {
      mocks.pathname = "/signup";
      render(<><SignupThenCheckEmail /><SiteMotion signedIn={false} /></>);
      fireEvent.click(screen.getByRole("button", { name: "Create account" }));
      expect(exits().map((a) => a.el)).toEqual([formOf("Sign up for DrillMap"), card()]);
      expect(formOf("Sign up for DrillMap").hasAttribute("inert")).toBe(true);
      expect(screen.queryByRole("heading", { name: "Check your email" })).toBeNull();
      await act(async () => finishExits());

      expect(entrances().map((a) => a.el)).toEqual([formOf("Check your email"), card()]);
      expect(entrances()[0].keyframes[0]).toEqual({ opacity: 0, transform: "translateY(8px)" });
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Check your email" }));
      expect(calls.some((a) => anchors().includes(a.el as HTMLElement))).toBe(false);
      expect(card().hasAttribute("inert")).toBe(false);

      fireEvent.click(screen.getByRole("button", { name: "Sign up again" }));
      await act(async () => finishExits());
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Sign up for DrillMap" }));
      expect(live.some((a) => a.options.fill === "forwards")).toBe(false);
    });

    it("shows Check your email at once and still follows the link when the answer lands during a link's fade-out", async () => {
      mocks.pathname = "/signup";
      history.replaceState(null, "", "/signup");
      render(<><SignupThenCheckEmail /><SiteMotion signedIn={false} /></>);
      await click("Log in");
      fireEvent.click(screen.getByRole("button", { name: "Create account" }));
      expect(screen.getByRole("heading", { name: "Check your email" })).toBeTruthy();
      finishExits();
      await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/login", { scroll: false }));
    });

    it("fades in the form, with its notice, when a form sends the visitor to another sign-in page", async () => {
      const { rerender } = show("/forgot-password")!;
      show("/login?notice=passwordChanged", rerender);
      expect(exits()).toHaveLength(0);
      expect(entrances().map((a) => a.el)).toEqual([formOf("Log in to DrillMap"), card()]);
      expect(formOf("Log in to DrillMap").contains(screen.getByRole("status"))).toBe(true);
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Log in to DrillMap" }));
    });
  });

  describe("into and out of onboarding", () => {
    const fadeOuts = () => calls.filter((a) => a.options.fill === "forwards" && Number(a.options.duration) > 0);
    const holds = () => calls.filter((a) => a.options.fill === "forwards" && a.options.duration === 0 && !(a.el as HTMLElement).hasAttribute("data-page-logo"));
    const copy = () => document.querySelector<HTMLElement>("[data-page-copy]");
    const region = (name: string) => screen.getByLabelText(name);
    const settle = () => act(async () => {});
    const finishCopy = () => act(async () => {
      for (const a of live.filter((a) => a.el.closest("[data-page-copy]"))) a.finish();
    });

    function SignedInBar({ logoHref = "/" }: { logoHref?: string }) {
      return (
        <header>
          <Link data-page-logo href={logoHref}>DrillMap</Link>
          <div data-page-fade aria-label="Top bar">Log out</div>
        </header>
      );
    }
    const Pending = () => <><SignedInBar /><main tabIndex={-1} /></>;
    const Placeholder = () => (
      <>
        <SignedInBar />
        <main tabIndex={-1}>
          <div style={{ opacity: 1 }}>
            <PageCue page="placeholder" />
            <div data-page-swap aria-label="Step placeholder" style={{ opacity: 1 }} />
            <aside data-page-fade aria-label="Panel placeholder" style={{ opacity: 1 }}>
              <div data-page-swap aria-label="Card placeholder" style={{ opacity: 1 }} />
            </aside>
          </div>
        </main>
      </>
    );
    const Onboarding = () => (
      <>
        <SignedInBar />
        <main tabIndex={-1}>
          <div style={{ opacity: 1 }}>
            <PageCue page="onboarding" />
            <div data-page-swap aria-label="Step" style={{ opacity: 1 }}>
              <h1 tabIndex={-1}>Set your target</h1>
              <button type="button">Skip for now</button>
            </div>
            <aside data-page-fade aria-label="Panel" style={{ opacity: 1 }}>
              <div data-page-swap aria-label="Card" style={{ opacity: 1 }}>Preview</div>
            </aside>
          </div>
        </main>
      </>
    );
    const ThisWeek = () => (
      <>
        <SignedInBar logoHref="/dashboard" />
        <main tabIndex={-1}>
          <div data-page-fade aria-label="This week page" style={{ opacity: 1 }}>
            <PageCue page="this-week" />
            <h1 tabIndex={-1}>This week</h1>
          </div>
        </main>
      </>
    );

    function at(path: string, page: React.ReactNode, rerender?: (ui: React.ReactNode) => void) {
      mocks.pathname = path;
      const ui = <>{page}<SiteMotion signedIn /></>;
      if (rerender) rerender(ui);
      else return render(ui);
    }

    async function logIn() {
      const { rerender } = at("/login", PAGES["/login"]())!;
      at("/login", <Pending />, rerender);
      await settle();
      return rerender;
    }

    it("keeps Log in on screen as an inert copy until onboarding shows, then fades it through with the logo glide", async () => {
      const rerender = await logIn();
      expect(copy()?.textContent).toContain("Log in to DrillMap");
      expect(copy()!.inert).toBe(true);
      expect(copy()!.getAttribute("aria-busy")).toBe("true");
      expect(holds().map((a) => a.el)).toEqual([region("Top bar")]);
      expect(region("Top bar").hasAttribute("inert")).toBe(true);
      expect(region("Top bar").getAttribute("aria-busy")).toBe("true");
      expect(fadeOuts()).toHaveLength(0);

      at("/onboarding", <Onboarding />, rerender);
      expect(fadeOuts()).toHaveLength(1);
      expect(fadeOuts()[0].keyframes.at(-1)).toMatchObject({ opacity: 0 });
      expect(fadeOuts()[0].options).toMatchObject({ duration: 120, easing: "cubic-bezier(0.4, 0, 1, 1)" });
      expect(entrances()).toHaveLength(0);
      expect(document.activeElement).not.toBe(screen.getByRole("heading", { name: "Set your target" }));

      await finishCopy();
      expect(copy()).toBeNull();
      expect(entrances().map((a) => a.el.getAttribute("aria-label"))).toEqual(["Top bar", "Step", "Panel"]);
      for (const entrance of entrances()) {
        expect(entrance.keyframes).toEqual([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }]);
        expect(entrance.options).toEqual({ duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" });
      }
      expect(glides().at(-1)!.keyframes).toEqual([{ transform: "translate(72px, 12px)" }, { transform: "none" }]);
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Set your target" }));
      expect(document.querySelectorAll("[inert], [aria-busy]")).toHaveLength(0);
    });

    it("on a slow load, fades Log in to the placeholder, then swaps only the step and card under a still top bar and panel", async () => {
      const rerender = await logIn();
      at("/onboarding", <Placeholder />, rerender);
      await finishCopy();
      expect(entrances().map((a) => a.el.getAttribute("aria-label"))).toEqual(["Top bar", "Step placeholder", "Panel placeholder"]);
      calls = [];

      at("/onboarding", <Onboarding />, rerender);
      await settle();
      expect(copy()?.querySelectorAll("[data-page-swap]")).toHaveLength(2);
      expect(fadeOuts().map((a) => a.el.getAttribute("aria-label"))).toEqual(["Step placeholder", "Card placeholder"]);
      expect(entrances()).toHaveLength(0);

      await finishCopy();
      expect(entrances().map((a) => a.el.getAttribute("aria-label"))).toEqual(["Step", "Card"]);
      expect(entrances()[0].keyframes[0]).toEqual({ opacity: 0, transform: "translateY(8px)" });
      expect(calls.some((a) => ["Top bar", "Panel"].includes(a.el.getAttribute("aria-label")!))).toBe(false);
      expect(glides()).toHaveLength(0);
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Set your target" }));
    });

    it("on a fast load, never shows the placeholder", async () => {
      const rerender = await logIn();
      at("/onboarding", <Placeholder />, rerender);
      at("/onboarding", <Onboarding />, rerender);
      await settle();
      await finishCopy();
      expect(calls.filter((a) => a.el.getAttribute("aria-label")?.includes("placeholder") && a.options.fill !== "forwards")).toHaveLength(0);
      expect(entrances().map((a) => a.el.getAttribute("aria-label"))).toEqual(["Top bar", "Step", "Panel"]);
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Set your target" }));
    });

    it("fades onboarding through to This week after Skip for now, and moves focus to its heading", async () => {
      const { rerender } = at("/onboarding", <Onboarding />)!;
      at("/dashboard", <Pending />, rerender);
      await settle();
      expect(copy()?.textContent).toContain("Set your target");
      at("/dashboard/upload", <ThisWeek />, rerender);
      expect(fadeOuts()).toHaveLength(1);
      await finishCopy();
      expect(entrances().map((a) => a.el.getAttribute("aria-label"))).toEqual(["Top bar", "This week page"]);
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "This week" }));
    });

    it("leaves onboarding with the same fade when Back lands on a page that sends the student back to onboarding", async () => {
      const { rerender } = at("/onboarding", <Onboarding />)!;
      history.replaceState(ROUTER_ENTRY, "", "/login");
      const router = vi.fn();
      addEventListener("popstate", router);
      dispatchEvent(new PopStateEvent("popstate", { state: ROUTER_ENTRY }));
      removeEventListener("popstate", router);
      expect(router).toHaveBeenCalledOnce();

      at("/dashboard", <Pending />, rerender);
      await settle();
      at("/onboarding", <Onboarding />, rerender);
      expect(fadeOuts()).toHaveLength(1);
      await finishCopy();
      expect(entrances().map((a) => a.el.getAttribute("aria-label"))).toEqual(["Top bar", "Step", "Panel"]);
    });

    it("keeps Log in on screen until This week shows, then fades it through with the logo glide and focus on the heading", async () => {
      const rerender = await logIn();
      at("/dashboard", <ThisWeek />, rerender);
      expect(fadeOuts()).toHaveLength(1);
      expect(entrances()).toHaveLength(0);

      await finishCopy();
      expect(copy()).toBeNull();
      expect(entrances().map((a) => a.el.getAttribute("aria-label"))).toEqual(["Top bar", "This week page"]);
      expect(entrances()[1].keyframes[0]).toEqual({ opacity: 0, transform: "translateY(8px)" });
      expect(glides().at(-1)!.keyframes).toEqual([{ transform: "translate(72px, 12px)" }, { transform: "none" }]);
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "This week" }));
      expect(document.querySelectorAll("[inert], [aria-busy]")).toHaveLength(0);
    });

    it("fades Log in through to the weekly upload when This week first asks for analytics", async () => {
      const rerender = await logIn();
      at("/dashboard/upload", <ThisWeek />, rerender);
      await finishCopy();
      expect(entrances().map((a) => a.el.getAttribute("aria-label"))).toEqual(["Top bar", "This week page"]);
    });

    it("drops the Log in copy with no motion when the next page is not This week or onboarding, and This week reached any other way does not move", async () => {
      const rerender = await logIn();
      at("/admin", <main><h1>Admin</h1></main>, rerender);
      expect(copy()).toBeNull();
      expect(fadeOuts()).toHaveLength(0);
      expect(entrances()).toHaveLength(0);
      expect(live).toHaveLength(0);

      at("/progress", <main><h1>Progress</h1></main>, rerender);
      at("/dashboard", <ThisWeek />, rerender);
      await settle();
      expect(entrances()).toHaveLength(0);
    });

    it("drops the copy at once under reduced motion and fades onboarding in for 120 ms with no movement and no glide", async () => {
      reduced = true;
      const rerender = await logIn();
      expect(copy()).not.toBeNull();
      at("/onboarding", <Onboarding />, rerender);
      expect(copy()).toBeNull();
      await settle();
      expect(fadeOuts()).toHaveLength(0);
      expect(glides().filter((a) => a.options.fill !== "forwards")).toHaveLength(0);
      for (const entrance of entrances()) {
        expect(entrance.keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);
        expect(entrance.options).toEqual({ duration: 120, easing: "cubic-bezier(0.2, 0, 0, 1)" });
      }
      expect(entrances()).toHaveLength(3);
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Set your target" }));
    });
  });
});
