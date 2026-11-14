"use client";

import { useFormStatus } from "react-dom";
import { openCustomerPortalFromThisWeek } from "@/app/account/actions";
import { ActionForm } from "@/components/FailureNotice";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FOCUS, NOTICE_SLOT, PAGE_COLUMN, cx } from "@/components/ui/classes";
import { WeekTitle } from "@/components/WeekHeader";
import type { PlanNote } from "@/lib/planNotes";

const PILL_SHAPE = cx(
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-pill px-4 text-small font-medium",
  "transition-[background-color,scale] duration-(--duration-fast) ease-(--ease-out-strong) active:scale-[0.97] motion-reduce:active:scale-100",
  FOCUS,
);
const PILL = cx(PILL_SHAPE, "bg-ink text-chalk pointer-hover:bg-graphite-line");
const OUTLINE_PILL = cx(PILL_SHAPE, "border border-vellum-line bg-paper text-ink pointer-hover:bg-vellum");
const NOTICE_CARD = "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-vellum-line bg-paper p-4 shadow-control";

export function PlanNotices({ note, uploadDue }: { note: PlanNote | null; uploadDue: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {note && <PlanNotice note={note} />}
      {uploadDue && <UploadCard outline={note?.action === "update_card"} />}
    </div>
  );
}

function UploadCard({ outline }: { outline: boolean }) {
  return (
    <section aria-label="Next week" className={NOTICE_CARD}>
      <div className="flex min-w-0 gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-vellum text-smoke">
          <svg aria-hidden viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4.5 14v3a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-3" />
          </svg>
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-small font-medium text-ink">Next week starts Monday.</h2>
          <p className="text-caption text-smoke">Add your screenshots to build your weekly schedule.</p>
        </div>
      </div>
      <Link href="/dashboard/upload" className={cx(outline ? OUTLINE_PILL : PILL, "ml-11 sm:ml-0")}>Plan next week</Link>
    </section>
  );
}

export function PlanNotice({ note }: { note: PlanNote }) {
  const { action } = note;
  return (
    <section aria-label="Your plan" className={NOTICE_CARD}>
      <div className="flex min-w-0 gap-3">
        <span className={cx("flex size-8 shrink-0 items-center justify-center rounded-md", action ? "bg-warning-wash text-warning-ink" : "bg-vellum text-smoke")}>
          <svg aria-hidden viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {action ? (
              <><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10.5h18M7 15h3" /></>
            ) : (
              <><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /><circle cx="12" cy="15" r="1.2" /></>
            )}
          </svg>
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-small font-medium text-ink">{note.lead}</h2>
          <p className="text-caption text-smoke">{note.rest}</p>
        </div>
      </div>
      {action && (
        <div className="ml-11 sm:ml-0">
          {action === "pick_plan" ? (
            <Link href="/dashboard/upload" className={PILL}>Pick a plan</Link>
          ) : (
            <ActionForm action={openCustomerPortalFromThisWeek}>
              <UpdateCardButton />
            </ActionForm>
          )}
        </div>
      )}
    </section>
  );
}

function UpdateCardButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="bare" size="md" className={PILL} waiting={pending} waitLabel="Opening Stripe…">Update card</Button>;
}

const WAITING = {
  held: { title: "Your week is ready.", body: "It appears when your first payment goes through." },
  lapsed: { title: "Your week is saved.", body: "It appears as soon as you pick a plan." },
};

export function HeldWeek({ weekOf, preview, problem, freeWeekEnding, lapsed }: {
  weekOf: string;
  preview: boolean;
  problem: PlanNote | null;
  freeWeekEnding: PlanNote | null;
  lapsed: boolean;
}) {
  const note = problem ?? freeWeekEnding;
  const noteSaysWhen = note !== null && note === freeWeekEnding;
  const { title, body } = WAITING[lapsed ? "lapsed" : "held"];
  return (
    <>
      {note && <div data-page-section className={cx(PAGE_COLUMN, NOTICE_SLOT)}><PlanNotice note={note} /></div>}
      <div data-page-section className={cx(PAGE_COLUMN, "flex flex-col gap-6 pb-16 md:pb-24", note ? "pt-6" : "pt-8 lg:pt-10")}>
        <WeekTitle weekOf={weekOf} preview={preview} />
        {!noteSaysWhen && (
          <Card className="items-center gap-3 px-6 py-14 text-center md:py-20">
            <span className="mb-1 flex size-12 items-center justify-center rounded-pill bg-vellum text-smoke">
              <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5V12l3 2" />
              </svg>
            </span>
            <h2 className="text-h5 font-medium text-ink">{title}</h2>
            <p className="max-w-[36ch] text-small text-pretty text-smoke">{body}</p>
          </Card>
        )}
      </div>
    </>
  );
}
