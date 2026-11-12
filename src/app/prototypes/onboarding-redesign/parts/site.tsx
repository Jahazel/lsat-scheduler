"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BAR, HEADER, Logo } from "@/components/nav/shared";
import { Button } from "@/components/ui/Button";
import type { Page, View } from "../view";
import { changePage } from "./motion";
import { OnboardingPrototype, TopBar } from "./Prototype";

// Pages outside onboarding are stand-ins: they exist so every way in and out of the flow map can be clicked.
// "page": today's whole-page motion between app pages. "cut": a browser load or a server redirect, with no app motion.
type Arrival = "page" | "cut";
const ARRIVAL: Record<Page, Arrival> = { onboarding: "page", thisweek: "page", signup: "cut", login: "cut", stripe: "cut" };

function StandIn({ title, note, children, onLogOut }: { title: string; note: string; children?: ReactNode; onLogOut?: () => void }) {
  return (
    <div className="min-h-dvh bg-paper">
      {onLogOut ? (
        <TopBar onLogOut={onLogOut} beside={<span className="text-small font-medium text-ink">This week</span>} />
      ) : (
        <header data-page-section className={HEADER}>
          <div className={BAR}>
            <Logo href="#" form="mark-below-md" />
          </div>
        </header>
      )}
      <main data-page-section className="mx-auto flex max-w-[440px] flex-col gap-6 px-5 py-16">
        <p className="w-fit rounded-pill bg-vellum px-3 py-1 text-caption text-smoke">Stand-in page</p>
        <h1 className="text-h3 font-semibold text-ink">{title}</h1>
        <p className="text-body text-smoke">{note}</p>
        {children}
      </main>
    </div>
  );
}

export function Site({ view }: { view: View }) {
  const [page, setPage] = useState<Page>(view.page);
  // A fresh onboarding (after sign-up, log in, or a reload) starts at the first question with nothing typed.
  const [fresh, setFresh] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  const go = (next: Page, arrival: Arrival = ARRIVAL[next]) => {
    const update = () => {
      setPage(next);
      if (next === "onboarding") setFresh((n) => n + 1);
      scrollTo(0, 0);
    };
    if (arrival === "cut") update();
    else changePage(root.current, update);
  };

  useEffect(() => {
    if (page !== "onboarding") parent.postMessage({ type: "at", at: { page, step: 0, admin: false } }, location.origin);
  }, [page]);

  return (
    <div ref={root}>
      {page === "onboarding" && (
        <OnboardingPrototype
          key={fresh}
          data={fresh ? "empty" : view.data}
          name={view.name}
          startAt={fresh ? 0 : view.step - 1}
          reveal={view.reveal}
          plan={view.plan}
          cases={{ save: view.save, read: view.read, scanOff: view.scanOff, leave: (next) => go(next) }}
        />
      )}
      {page === "signup" && (
        <StandIn title="Create your account" note="Today's Sign-up page. Google sign-in finishes, then onboarding opens at the first question.">
          <Button className="w-full" onClick={() => go("onboarding")}>Continue with Google</Button>
        </StandIn>
      )}
      {page === "login" && (
        <StandIn title="Log in" note="Today's Log in page. Logging in again with no profile opens onboarding at the first question.">
          <Button className="w-full" onClick={() => go("onboarding")}>Log in with Google</Button>
        </StandIn>
      )}
      {page === "stripe" && (
        <StandIn title="Stripe Checkout" note="Stripe hosts this page. After the card is added, Stripe sends the student back, and This week opens.">
          <Button className="w-full" onClick={() => go("thisweek", "cut")}>Add card (stand-in)</Button>
        </StandIn>
      )}
      {page === "thisweek" && (
        <StandIn onLogOut={() => go("login")} title="This week" note="Today's This week page. Onboarding ends here.">
          <Button variant="outline" className="w-full" onClick={() => go("onboarding")}>Open with no profile yet</Button>
        </StandIn>
      )}
    </div>
  );
}
