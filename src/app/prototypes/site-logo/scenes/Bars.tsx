"use client";

import type { ReactNode } from "react";
import AdminNav from "@/components/nav/AdminNav";
import { BAR, HEADER, Logo } from "@/components/nav/shared";
import StudentNav from "@/components/nav/StudentNav";
import { SignOutButton } from "@/components/SignOutForm";
import { afterSignOut, type SignOutAnswer } from "@/lib/requestPolicy";

const logOut = async (): Promise<SignOutAnswer> => ({ goTo: afterSignOut("/") });

function Caption({ children }: { children: ReactNode }) {
  return <p className="bg-graphite px-5 py-2 font-mono text-label text-fog uppercase md:px-18">{children}</p>;
}

function FakeSwitcher({ worst }: { worst: boolean }) {
  return (
    <span className="flex items-center gap-1 rounded-xs text-small font-medium whitespace-nowrap text-ink">
      {worst ? "Student workspace" : "Student"}
      <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" className="stroke-smoke" fill="none" strokeWidth="1.5"><path d="M3 4.5L6 7.5L9 4.5" /></svg>
    </span>
  );
}

function Below() {
  return <div className="h-24 bg-paper" />;
}

export function Bars({ landingBar, worst }: { landingBar: ReactNode; worst: boolean }) {
  const student = {
    initials: worst ? "WM" : "JS",
    email: worst ? "wilhelmina.montgomery-fitzgerald@university-law-prep.example.edu" : "jamie@example.com",
    countdownLabel: worst ? "Official LSAT in 128 days" : "LSAT in 24 days",
    isTestDay: false,
    uploadNeeded: worst,
    logOut,
  };
  return (
    <div className="flex flex-col">
      <Caption>Landing top bar · signed out</Caption>
      <div className="relative bg-vellum">{landingBar}<Below /></div>
      <Caption>Signed-in top bar · student</Caption>
      <header data-site-header="workspace" className={HEADER}><StudentNav {...student} /></header>
      <Below />
      <Caption>Signed-in top bar · admin on the student side</Caption>
      <header data-site-header="workspace-lg" className={HEADER}><StudentNav {...student} workspaceSwitcher={<FakeSwitcher worst={worst} />} /></header>
      <Below />
      <Caption>Admin top bar</Caption>
      <div className="[&_[data-site-header]]:static"><AdminNav {...student} /></div>
      <Below />
      <Caption>Signed-in top bar · no plan yet</Caption>
      <header data-site-header="workspace" className={HEADER}>
        <div className={BAR}>
          <Logo href="/" />
          <SignOutButton variant="text" size="md">Log out</SignOutButton>
        </div>
      </header>
      <Below />
    </div>
  );
}
