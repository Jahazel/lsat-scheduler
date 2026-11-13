"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FailureNotice } from "@/components/FailureNotice";
import type { FailureCode } from "@/lib/unexpectedFailure";
import type { Enter, Today, View } from "../view";
import { StandIn, WeekContent } from "./content";
import { startTicks, weekFor } from "./data";
import { FRAMES } from "./frames";
import { HEADERS } from "./headers";
import { LOADING_VARIANTS } from "./loading";
import { NOTICE_VARIANTS } from "./notices";
import { REST_VARIANTS } from "./rest";
import { TODAY_VARIANTS } from "./today";

// Where each way in lands. The redirects happen on the server, so the student lands on the target page directly.
const LANDS_ON: Record<Enter, string> = { direct: "thisweek", login: "login", drill: "thisweek", nodrill: "thisweek", history: "progress", noschedule: "upload", noprofile: "onboarding" };
const ARRIVES_FROM = new Set(["login", "onboarding", "plan", "card"]);
const SAVE_FAILED = { unexpectedFailure: "3f9a01c2" as FailureCode };
// A real save takes a round trip; the failed one returns after this long.
const ROUND_TRIP_MS = 600;

export function Prototype({ view: initial }: { view: View }) {
  const week = weekFor(initial);
  // Admin can move the simulated date; the page then shows This week for that date.
  const [today, setToday] = useState<Today>(initial.today);
  const view = { ...initial, today };
  const [page, setPage] = useState(LANDS_ON[initial.enter]);
  const [done, setDone] = useState(() => new Set(startTicks(week, initial.ticks, initial.today)));
  const [lastSave, setLastSave] = useState<{ id: string; answer: unknown } | null>(null);
  const [arrived, setArrived] = useState(view.load === "off");
  // "Arrives after 1.5 s" plays the hand-off from placeholder to page; Reload page replays it.
  useEffect(() => {
    if (view.load !== "cycle") return;
    const t = setTimeout(() => setArrived(true), 1500);
    return () => clearTimeout(t);
  }, [view.load]);

  const [arrival, setArrival] = useState(false);
  const go = (next: string) => {
    // Finishing Log in, onboarding, or a Stripe page is an arrival, as on the live site; tab switches only fade.
    setArrival(ARRIVES_FROM.has(page) && next === "thisweek");
    setPage(next);
    scrollTo(0, 0);
  };
  const flip = (id: string) => setDone((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  // The row changes at once; a failed save puts it back and shows the live failure toast.
  const toggle = (id: string) => {
    flip(id);
    if (!view.fail) return setLastSave({ id, answer: { saved: id } });
    setTimeout(() => {
      flip(id);
      setLastSave({ id, answer: SAVE_FAILED });
    }, ROUND_TRIP_MS);
  };
  const setDate = (next: Today) => {
    setToday(next);
    setPage("thisweek");
    parent.postMessage({ type: "view", change: { today: next } }, location.origin);
  };

  const { Frame } = FRAMES[0]!;
  const { Header } = HEADERS[0]!;
  const { Today } = TODAY_VARIANTS[0]!;
  const { Rest } = REST_VARIANTS[0]!;
  const Notices = NOTICE_VARIANTS[0]!;
  const { Placeholder } = LOADING_VARIANTS[0]!;
  const loading = page === "thisweek" && !arrived;
  // The plan note comes with the page data, so it waits with the rest.
  const frameView = loading ? { ...view, note: "none" as const } : view;

  if (page === "login" || page === "onboarding") {
    const login = page === "login";
    return (
      <main key={page} className="page-in flex min-h-dvh flex-col items-center justify-center gap-6 bg-paper px-5 text-center">
        <p className="w-fit rounded-pill bg-vellum px-3 py-1 text-caption text-smoke">Stand-in page</p>
        <h1 className="text-h3 font-semibold text-ink">{login ? "Log in" : "Onboarding"}</h1>
        {!login && <p className="max-w-[40ch] text-small text-smoke">This week sends a student with no profile here. Onboarding has its own redesign (issue 852).</p>}
        <Button onClick={() => go("thisweek")}>{login ? "Log in with Google" : "Finish onboarding"}</Button>
      </main>
    );
  }

  return (
    <>
      <Frame view={frameView} week={week} page={page} go={go} setDate={setDate} content={(surface) => (
        loading ? <Placeholder /> : <div key={`${page}-${today}`} className={arrival ? "page-arrive" : "page-in"}>
          {page === "thisweek" ? <WeekContent view={view} week={week} done={done} toggle={toggle} go={go} WeekHeader={Header} Today={Today} Rest={Rest} Notices={Notices} /> : <StandIn page={page} surface={surface} go={go} enter={view.enter} />}
        </div>
      )} />
      <FailureNotice action={lastSave?.id} answer={lastSave?.answer ?? null} />
    </>
  );
}
