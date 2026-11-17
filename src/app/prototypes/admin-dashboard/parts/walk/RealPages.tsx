"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui/classes";

const HIDE_REAL_CHROME = "[data-site-header], [data-site-header] + [data-page-fade], [data-tab-bar] { display: none !important; }";

function hideRealChrome(page: Window) {
  const sheet = new (page as typeof window).CSSStyleSheet();
  sheet.replaceSync(HIDE_REAL_CHROME);
  page.document.adoptedStyleSheets = [...page.document.adoptedStyleSheets, sheet];
}

export function useRealPages() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [path, setPath] = useState<string | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Next.js moves between pages without a load event, so the path is read on a timer.
    const timer = setInterval(() => {
      const now = frame.current?.contentWindow?.location.pathname;
      if (now && now !== "blank") setPath(now);
    }, 250);
    return () => clearInterval(timer);
  }, []);

  const onLoad = useCallback(() => {
    const page = frame.current?.contentWindow;
    if (!page) return;
    hideRealChrome(page);
    page.addEventListener("pagehide", () => setShown(false), { once: true });
    setShown(true);
  }, []);

  const load = (to?: string) => {
    const page = frame.current?.contentWindow;
    if (!page) return;
    if (to) page.location.assign(to);
    else page.location.reload();
  };

  return { frame, path, shown, onLoad, load };
}
export type RealPages = ReturnType<typeof useRealPages>;

export function RealPagesFrame({ frame, shown, onLoad }: Pick<RealPages, "frame" | "shown" | "onLoad">) {
  // The frame can finish its first load before hydration attaches onLoad.
  useEffect(() => {
    const page = frame.current?.contentWindow;
    if (page && page.location.href !== "about:blank" && page.document.readyState === "complete") onLoad();
  }, [frame, onLoad]);
  return (
    <iframe ref={frame} src="/dashboard" title="Student side" onLoad={onLoad}
      className={cx("block min-h-0 w-full flex-1 border-0 bg-paper", shown ? "real-page-in" : "invisible")} />
  );
}

/* Google sign-in does not open inside a frame, so the admin signs in in a normal tab first. */
export function SignInFirst({ kind }: { kind: "signed-out" | "not-admin" }) {
  return (
    <div className="flex flex-col items-start gap-3 py-10">
      <h1 className="text-h3 font-semibold text-ink">{kind === "signed-out" ? "Sign in first" : "This account is not an admin"}</h1>
      <p className="max-w-prose text-small text-smoke">
        {kind === "signed-out"
          ? "Open Log in in a new tab and sign in with your admin account. Then tap Reload in the toolbar above."
          : "Sign in with an admin account in a new tab. Then tap Reload in the toolbar above."}
      </p>
      <a href="/login" target="_blank" rel="noreferrer" className="text-small font-medium text-accent">Open Log in ↗</a>
    </div>
  );
}
