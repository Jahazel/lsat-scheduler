"use client";

import { useCallback, useRef, useState } from "react";
import { cx } from "@/components/ui/classes";
import type { Page, View } from "../view";
import { adminFor, studentsFor } from "./data";
import { AdminFrame } from "./frames";
import { detailFor } from "./detail/data";
import { Facts, FactsLoading } from "./detail/Facts";
import type { Tab } from "./detail/tabs";
import { LoadingPage, MissingStudent } from "./pages";
import { Ledger, LedgerLoading } from "./students/Ledger";
import { LabPage } from "./lab/LabPage";
import { encodeDraft } from "./lab/model";
import { startFor } from "./lab/parts";
import { LIST_START, type ListState } from "./students/list";
import type { LiveSide } from "./walk/model";
import { RealPagesFrame, SignInFirst, useRealPages } from "./walk/RealPages";
import { readyWalk, useWalk } from "./walk/useWalk";
import { SwitchDate, Walkthrough, dateName } from "./walk/Switch";
import type { FrameProps } from "./chrome";

export function Prototype({ view, live }: { view: View; live: LiveSide }) {
  const students = studentsFor(view.data);
  const admin = adminFor(view.who);
  const [page, setPage] = useState<Page>(view.page);
  const [lastAdmin, setLastAdmin] = useState<Page>(view.page === "side" ? "students" : view.page);
  const [list, setList] = useState<ListState>(LIST_START);
  const [openId, setOpenId] = useState<string | undefined>(undefined);
  const [labFrom, setLabFrom] = useState<string | null>(null);
  const [labLink, setLabLink] = useState(view.lab);
  const linkLab = (lab: string) => {
    setLabLink(lab);
    parent.postMessage({ type: "view", change: { lab } }, location.origin);
  };
  const pages = useRealPages();
  const walk = readyWalk(useWalk(live, pages));

  const [walkOpen, setWalkOpenState] = useState(view.walk);
  const refreshWalk = walk?.refresh;
  const setWalkOpen = useCallback((open: boolean) => {
    if (open) refreshWalk?.();
    setWalkOpenState(open);
    parent.postMessage({ type: "view", change: { walk: open } }, location.origin);
  }, [refreshWalk]);
  const walkTrigger = useRef<HTMLButtonElement>(null);
  const walkBar: FrameProps["walk"] = walk && {
    label: <SwitchDate w={walk} open={walkOpen} />, name: dateName(walk), toggle: () => setWalkOpen(!walkOpen), expanded: walkOpen,
    wrap: (control) => <Walkthrough w={walk} open={walkOpen} setOpen={setWalkOpen} trigger={walkTrigger}>{control}</Walkthrough>,
  };
  const [tab, setTabState] = useState<Tab>(view.tab);
  const setTab = (next: Tab) => {
    setTabState(next);
    parent.postMessage({ type: "view", change: { tab: next } }, location.origin);
  };

  const go = (next: Page, from: string | null = null) => {
    if (next === "lab") {
      setLabFrom(from);
      const student = students.find((s) => s.id === from);
      if (student) linkLab(encodeDraft(startFor(student)));
    }
    if (next !== "side") { setLastAdmin(next); setWalkOpen(false); }
    setPage(next);
    scrollTo(0, 0);
    parent.postMessage({ type: "view", change: { page: next } }, location.origin);
  };

  const openStudent = students.find((s) => s.id === openId) ?? students[0];
  const content = view.load === "hold" ? (page === "students" ? <LedgerLoading /> : page === "detail" ? <FactsLoading /> : <LoadingPage />) : {
    students: <Ledger students={students} state={list} set={(change) => setList((l) => ({ ...l, ...change }))} open={(id) => { setOpenId(id); setTab("week"); go("detail"); }} />,
    detail: openStudent ? <Facts student={openStudent} detail={detailFor(openStudent)} back={() => go("students")} lab={() => go("lab", openStudent.id)} tab={tab} setTab={setTab} /> : <MissingStudent go={go} />,
    lab: <LabPage key={labFrom ?? "steady"} from={students.find((s) => s.id === labFrom)} link={labLink} onLink={linkLab} />,
    side: live.kind === "ready" ? <RealPagesFrame frame={pages.frame} shown={pages.shown} onLoad={pages.onLoad} /> : <SignInFirst kind={live.kind} />,
  }[page];

  return (
    <>
      <AdminFrame view={view} admin={admin} page={page} go={go} backToAdmin={() => go(lastAdmin)}
        walkTrigger={walkTrigger} walk={walkBar} pages={pages}
        content={<div key={page} className={cx("page-in", page === "side" && live.kind === "ready" && "flex min-h-0 flex-1 flex-col")}>{content}</div>} />
    </>
  );
}
