"use client";

import { useState } from "react";
import { PasswordField } from "@/app/account/PasswordField";
import { Button } from "@/components/ui/Button";
import { FOCUS, MOTION, cx } from "@/components/ui/classes";
import { useProtoData, useProtoState } from "../../protoContext";
import { planCardFacts } from "../../protoData";
import { NoteGlyph } from "../notes/week";
import { AccountPage } from "../plan-card/account";
import { PlanCard } from "../plan-card/FactRows";

const REMOVED = ["Your profile", "Approved and legacy analytics snapshots", "Weekly schedules", "Activity check-ins"];

/** The Account deletion card with the plan warning above its fields. A still copy: the real card's form needs a session. */
export default function DeletionWarning() {
  const data = useProtoData();
  const hasPlan = (useProtoState() || "has-plan") === "has-plan";
  return (
    <AccountPage
      planCard={<PlanCard facts={planCardFacts(hasPlan ? "paid" : "lapsed", data)} />}
      deletion={<DeletionCard warn={hasPlan} />}
    />
  );
}

function DeletionCard({ warn }: { warn: boolean }) {
  const [password, setPassword] = useState("");
  return (
    <section
      id="delete-account"
      aria-label="Delete account"
      className="flex flex-col gap-8 rounded-md border border-vellum-line bg-paper p-5 md:flex-row md:justify-between md:gap-16 md:p-8"
    >
      <div className="flex max-w-[560px] grow flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-h4 font-semibold text-danger-ink">Delete account</h2>
          <p className="text-body text-smoke">This permanently removes from active storage:</p>
        </div>
        <ul className="border-t border-vellum-line">
          {REMOVED.map((item) => (
            <li key={item} className="border-b border-vellum-line py-3 text-body text-ink">{item}</li>
          ))}
        </ul>
      </div>
      <form className="flex shrink-0 flex-col justify-end gap-4 md:w-[360px]" onSubmit={(event) => event.preventDefault()}>
        {warn && (
          <div className="flex items-start gap-3 rounded-xs border border-warning-line bg-warning-wash p-4">
            <NoteGlyph tone="warning" className="mt-px" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-body leading-[20px] font-medium text-ink">Your plan ends now.</p>
              <p className="text-small leading-[20px] text-smoke">Unused time is not refunded.</p>
            </div>
          </div>
        )}
        <PasswordField label="Current password" name="currentPassword" autoComplete="current-password" value={password} onChange={setPassword} readOnly={false} />
        <div className="flex flex-col gap-2">
          <label htmlFor="deletion-confirmation" className="text-small font-medium text-ink">Type DELETE to confirm</label>
          <input
            id="deletion-confirmation"
            autoComplete="off"
            placeholder="DELETE"
            className={cx("h-11 rounded-sm border border-vellum-line px-3 font-mono text-body text-ink placeholder:text-fog", FOCUS)}
          />
        </div>
        <Button
          type="submit"
          variant="bare"
          className={cx(
            "flex h-11 items-center justify-center rounded-sm border border-danger bg-paper text-body leading-[20px] font-medium text-danger-ink",
            "hover:bg-danger/faint",
            MOTION,
            FOCUS,
          )}
        >
          Delete account
        </Button>
      </form>
    </section>
  );
}
