"use client";

import { useState } from "react";
import { SegmentedSwitch } from "@/components/ui/SegmentedSwitch";
import { TextInput } from "@/components/ui/TextInput";
import { FOCUS, cx } from "@/components/ui/classes";
import { MAX_OFFICIAL_ATTEMPTS, attemptMonths } from "@/lib/studentProfile";
import { attemptProblemMessage, inScoreRange, parseScoreText } from "@/lib/studyProfileDraft";
import { TEST_DATES, scoreProblem, type Flow, type FlowValues } from "./flow";

const SHORT_MONTH = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
// Short labels ("Nov 2025") so the month fits beside the score on a 320 px phone without shrinking the text below 16 px.
const MONTHS = attemptMonths("2026-11-11").map((m) => ({ value: m.value, label: SHORT_MONTH.format(new Date(`${m.value}-01T00:00:00Z`)) }));
const TIMES: { value: FlowValues["testTime"]; label: string; long: string }[] = [
  { value: "standard", label: "Standard", long: "standard time" },
  { value: "1.5", label: "1.5× time", long: "1.5× time" },
  { value: "2", label: "2× time", long: "2× time" },
];

function useLeft() {
  const [left, setLeft] = useState<Record<string, boolean>>({});
  return { left, leave: (box: string) => setLeft((old) => ({ ...old, [box]: true })) };
}

export function Attempts({ flow, compact = false, stacked = false }: { flow: Flow; compact?: boolean; stacked?: boolean }) {
  const { values, edit } = flow;
  const { attempts } = values;
  const { left, leave } = useLeft();
  const setRows = (rows: FlowValues["attempts"]["rows"]) => edit({ attempts: { ...attempts, rows } });
  return (
    <div className="flex flex-col gap-3">
      {!compact && (
        <div className={cx("flex flex-col gap-x-3 gap-y-0.5", !stacked && "sm:flex-row sm:items-baseline sm:justify-between")}>
          <span className="text-small font-medium text-ink">Official LSAT attempts</span>
          <span className={cx("text-caption text-smoke", !stacked && "sm:text-right")}>For your record. It does not change your plan.</span>
        </div>
      )}
      <SegmentedSwitch
        name="attempts"
        label="Official LSAT attempts"
        value={attempts.taken ? "taken" : "none"}
        onChange={(choice) => edit({ attempts: { ...attempts, taken: choice === "taken" } })}
        options={[{ value: "none", label: "None yet" }, { value: "taken", label: "I've taken it" }]}
      />
      {attempts.taken && (
        <div className="flex flex-col gap-2">
          {attempts.rows.map((row) => {
            const message = left[`row-${row.id}`] ? attemptProblemMessage(row) : null;
            return (
              <div key={row.id} className="flex flex-col gap-1" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && leave(`row-${row.id}`)}>
                <div className={cx("grid items-center gap-2", attempts.rows.length > 1 ? "grid-cols-[72px_minmax(0,1fr)_40px] sm:grid-cols-[88px_minmax(0,1fr)_40px]" : "grid-cols-[72px_minmax(0,1fr)] sm:grid-cols-[88px_minmax(0,1fr)]")}>
                  <input
                    aria-label="Score"
                    inputMode="numeric"
                    maxLength={3}
                    placeholder="Score"
                    value={row.score}
                    onChange={(e) => setRows(attempts.rows.map((r) => (r.id === row.id ? { ...r, score: e.target.value } : r)))}
                    className={cx("h-11 rounded-sm border bg-paper px-3 text-body text-ink", message?.box === "score" ? "border-danger" : "border-vellum-line", FOCUS)}
                  />
                  <select
                    aria-label="Month and year"
                    value={row.month}
                    onChange={(e) => setRows(attempts.rows.map((r) => (r.id === row.id ? { ...r, month: e.target.value } : r)))}
                    className={cx("h-11 min-w-0 rounded-sm border bg-paper pl-3 pr-8 text-body text-ink", message?.box === "month" ? "border-danger" : "border-vellum-line", FOCUS)}
                  >
                    <option value="" disabled>Month</option>
                    {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  {attempts.rows.length > 1 && (
                    <button type="button" aria-label="Remove attempt" onClick={() => setRows(attempts.rows.filter((r) => r.id !== row.id))} className={cx("grid size-10 place-items-center rounded-sm text-smoke hover:bg-vellum hover:text-ink", FOCUS)}>
                      ×
                    </button>
                  )}
                </div>
                {message && <p className="text-caption text-danger-ink">{message.text}</p>}
              </div>
            );
          })}
          {attempts.rows.length < MAX_OFFICIAL_ATTEMPTS && (
            <button
              type="button"
              onClick={() => setRows([...attempts.rows, { id: Math.max(...attempts.rows.map((r) => r.id)) + 1, score: "", month: "" }])}
              className={cx("self-start text-small font-medium text-ink underline underline-offset-[3px]", FOCUS)}
            >
              + Add another attempt
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function GoalForm({ flow }: { flow: Flow }) {
  const { values, edit } = flow;
  const { left, leave } = useLeft();
  const currentProblem = left.current ? scoreProblem(values, "current") : null;
  const goalProblem = left.goal ? scoreProblem(values, "goal") : null;
  const current = parseScoreText(values.current);
  const goal = parseScoreText(values.goal);
  const gap = inScoreRange(current) && inScoreRange(goal) && goal > current ? goal - current : null;
  const date = TEST_DATES.find((d) => d.label === values.testDate);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 items-start gap-3">
        <TextInput label="Current PT score" inputMode="numeric" maxLength={3} placeholder="150" value={values.current} error={currentProblem ?? undefined} onChange={(e) => edit({ current: e.target.value })} onBlur={() => leave("current")} />
        <div className="flex flex-col gap-2">
          <TextInput label="Goal score" inputMode="numeric" maxLength={3} placeholder="165" value={values.goal} error={goalProblem ?? undefined} onChange={(e) => edit({ goal: e.target.value })} onBlur={() => leave("goal")} />
          {!goalProblem && gap !== null && <p className="text-caption font-medium text-accent">+{gap} from your current score</p>}
        </div>
      </div>
      <label className="flex flex-col gap-2 text-small font-medium text-ink">
        Goal test date
        <select value={values.testDate} onChange={(e) => edit({ testDate: e.target.value })} className={cx("h-11 w-full rounded-sm border border-vellum-line bg-paper px-3 text-body font-regular text-ink", FOCUS)}>
          <option value="" disabled>Select a test date</option>
          {TEST_DATES.map((d) => <option key={d.label} value={d.label}>{d.label}</option>)}
        </select>
        {date && <span className="text-caption font-regular text-smoke">About {date.weeks} weeks away</span>}
      </label>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-x-3 gap-y-0.5 sm:flex-row sm:items-baseline sm:justify-between">
          <span className="text-small font-medium text-ink">Test time</span>
          <span className="text-caption text-smoke sm:text-right">Your approved accommodation, if any.</span>
        </div>
        <SegmentedSwitch name="test-time" label="Test time" value={values.testTime} onChange={(testTime) => edit({ testTime })} options={TIMES} />
      </div>
      <div className="border-t border-vellum-line pt-6">
        <Attempts flow={flow} />
      </div>
    </div>
  );
}
