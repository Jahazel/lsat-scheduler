"use client";

import { useFormStatus } from "react-dom";
import { openCustomerPortalFromThisWeek } from "@/app/account/actions";
import { ActionForm } from "@/components/FailureNotice";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cx } from "@/components/ui/classes";
import type { PlanNote } from "@/lib/planNotes";

export function PlanNotice({ note }: { note: PlanNote }) {
  const { action } = note;
  return (
    <section
      aria-label="Your plan"
      className={cx(
        "flex flex-col gap-4 rounded-md border p-5 md:flex-row md:items-center md:gap-6",
        action ? "border-warning-line bg-warning-wash" : "border-vellum-line bg-vellum",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {action ? (
          <svg aria-hidden viewBox="0 0 24 24" className="mt-[3px] size-[18px] shrink-0 text-warning-ink" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16.5v.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg aria-hidden viewBox="0 0 24 24" className="mt-[3px] size-[18px] shrink-0 text-smoke" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3.5" y="5" width="17" height="15" rx="2" />
            <path d="M3.5 9.5h17M8 3v4M16 3v4" strokeLinecap="round" />
          </svg>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-h6 font-medium text-ink">{note.lead}</h2>
          <p className="text-small text-smoke">{note.rest}</p>
        </div>
      </div>
      {action && (
        <div className="pl-[30px] md:pl-0">
          {action === "pick_plan" ? (
            <ButtonLink href="/dashboard/upload" size="md">Pick a plan</ButtonLink>
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
  return <Button type="submit" variant="outline" size="md" waiting={pending} waitLabel="Opening Stripe…">Update card</Button>;
}

const WAITING = {
  held: { title: "Your week is ready.", body: "It appears when your first payment goes through." },
  lapsed: { title: "Your week is saved.", body: "It appears as soon as you pick a plan." },
};

export function HeldWeek({ lapsed = false }: { lapsed?: boolean }) {
  const { title, body } = WAITING[lapsed ? "lapsed" : "held"];
  return (
    <Card className="items-center gap-3 px-6 py-14 text-center md:py-20">
      <span className="mb-1 flex size-12 items-center justify-center rounded-pill bg-vellum text-smoke">
        <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      </span>
      <h2 className="text-h5 font-medium text-ink">{title}</h2>
      <p className="max-w-[36ch] text-small text-smoke">{body}</p>
    </Card>
  );
}
