"use client";

import type { ComponentType } from "react";
import { cx } from "@/components/ui/classes";
import type { View } from "../view";
import type { Week } from "./data";
import { Icon } from "./icons";

const CARD = "rounded-lg border border-vellum-line bg-paper shadow-control";
// Same black pill as the plan note card, so every notice button looks the same.
const PILL = "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-pill px-4 text-small font-medium select-none [transition:background-color_var(--duration-fast)_ease,scale_var(--duration-fast)_var(--ease-out-strong)] active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const SOLID = "bg-ink text-chalk pointer-hover:hover:bg-graphite-line";
// Under a payment note, that note's button is the one to press first.
const OUTLINE = "border border-vellum-line bg-paper text-ink pointer-hover:hover:bg-vellum";

const UPLOAD = { lead: "Next week starts Monday.", rest: "Add your screenshots to build your weekly schedule.", action: "Plan next week" };
const WAITING = {
  held: { title: "Your week is ready.", body: "It appears when your first payment goes through." },
  lapsed: { title: "Your week is saved.", body: "It appears as soon as you pick a plan." },
};
const waiting = (view: View) => WAITING[view.note === "lapsed" ? "lapsed" : "held"];

export type NoticeProps = { view: View; week: Week; go: (page: string) => void };
export type NoticeVariant = {
  name: string;
  /* Weekend, upload due: a card above the page. */
  Upload: ComponentType<NoticeProps>;
  /* Held week: the whole page under the frame. */
  Held: ComponentType<NoticeProps>;
};

function TitleBlock({ view, week }: { view: View; week: Week }) {
  const preview = view.week === "heldpreview";
  return (
    <div className="flex flex-col gap-1.5">
      {/* Same eyebrow and title as the section-2 header's preview. */}
      <p className="text-small text-smoke">{preview ? "Next week · starts Monday, Nov 16" : `Week of ${week.weekOf}`}</p>
      <h1 className="text-h3 font-semibold text-balance text-ink">{preview ? "Your plan for next week" : "Your plan for this week"}</h1>
    </div>
  );
}

/* The live strip becomes a card shaped like the plan note card; the held week keeps the live centred message. */
function LiveUpload({ view, go }: NoticeProps) {
  // A lapsed student cannot get a new week from an upload; the live page hides this card too.
  if (view.note === "lapsed") return null;
  return (
    <section aria-label="Next week" className={cx(CARD, "flex flex-wrap items-center justify-between gap-3 p-4")}>
      <div className="flex min-w-0 gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-vellum text-smoke"><Icon name="upload" className="size-4.5" /></span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-small font-medium text-ink">{UPLOAD.lead}</p>
          <p className="text-caption text-smoke">{UPLOAD.rest}</p>
        </div>
      </div>
      <button type="button" onClick={() => go("upload")} className={cx(PILL, view.note === "retrying" ? OUTLINE : SOLID, "ml-11 sm:ml-0")}>{UPLOAD.action}</button>
    </section>
  );
}

function LiveHeld({ view, week }: NoticeProps) {
  const w = waiting(view);
  // The free-week note above already says when next week appears, so the live page drops this card.
  const noteSaysIt = view.week === "heldpreview" && view.note === "ending";
  return (
    <div className="flex flex-col gap-6">
      <TitleBlock view={view} week={week} />
      {!noteSaysIt && <section aria-label="Your week" className={cx(CARD, "flex flex-col items-center gap-3 px-6 py-14 text-center md:py-20")}>
        <span className="mb-1 flex size-12 items-center justify-center rounded-pill bg-vellum text-smoke"><Icon name="clock" className="size-6" /></span>
        <h2 className="text-h5 font-medium text-ink">{w.title}</h2>
        <p className="max-w-[36ch] text-small text-pretty text-smoke">{w.body}</p>
      </section>}
    </div>
  );
}

/* Section 5 pick (2026-11-12): Live, refined. The preview adds nothing; the section-2 header already says check-ins open on Monday. */
export const NOTICE_VARIANTS: NoticeVariant[] = [{ name: "Live, refined", Upload: LiveUpload, Held: LiveHeld }];
