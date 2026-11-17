"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetEverything, setSimulatedDate } from "@/app/admin/test/actions";
import { callAction } from "@/lib/callAction";
import { isUnexpectedFailure } from "@/lib/unexpectedFailure";
import { dayName, type LiveSide, type ReadySide } from "./model";
import type { RealPages } from "./RealPages";

export function useWalk(live: LiveSide, pages: RealPages) {
  const router = useRouter();
  const [action, setAction] = useState<"move" | "start-over" | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(0);

  async function run(what: "move" | "start-over", call: () => Promise<unknown>, then: () => void, message: string) {
    if (action || refreshing) return;
    setAction(what);
    setNotice(null);
    setFailed(false);
    try {
      if (isUnexpectedFailure(await call())) { setFailed(true); return; }
      then();
      setNotice(message);
      setDone((n) => n + 1);
      startRefresh(() => router.refresh());
    } catch {
      setFailed(true);
    } finally {
      setAction(null);
    }
  }

  return {
    facts: live.kind === "ready" ? live : null,
    busy: action ?? (refreshing ? "refresh" : null),
    notice, failed, done,
    move: (to: string) => run("move", () => callAction(setSimulatedDate)(to), () => pages.load(), `Moved to ${dayName(to)}.`),
    startOver: () => run("start-over", () => callAction(resetEverything)(), () => pages.load("/onboarding"), "Started over on the real date."),
    refresh: () => startRefresh(() => router.refresh()),
  };
}
type Walk = ReturnType<typeof useWalk>;
export type WalkState = Omit<Walk, "facts"> & { facts: ReadySide };
export const readyWalk = (walk: Walk): WalkState | null => (walk.facts ? { ...walk, facts: walk.facts } : null);
