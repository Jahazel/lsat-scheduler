"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import AnalyticsReview from "@/components/AnalyticsReview";
import DailyCapacityFieldset, { DAY_LABEL, everyDay } from "@/components/DailyCapacityFieldset";
import type { SnapshotApprovalMetadata } from "@/lib/analyticsSnapshots";
import { DAY_ORDER } from "@/lib/engine";
import { dailyCapacityError } from "@/lib/studentProfile";
import type { AnalyticsExtractedRow, DayOfWeek, Student } from "@/lib/types";

// Actual administered LSAT test months — stored as the 1st of that month so
// the "weeks until test" countdown elsewhere has a real date to work with.
const GOAL_TEST_DATE_OPTIONS = [
  { label: "October 2026", value: "2026-10-01" },
  { label: "November 2026", value: "2026-11-01" },
  { label: "January 2027", value: "2027-01-01" },
  { label: "February 2027", value: "2027-02-01" },
  { label: "April 2027", value: "2027-04-01" },
  { label: "June 2027", value: "2027-06-01" },
];

// A new student has no preferred practice-test day until they choose one.
type StudentFormValues = Omit<Student, "preferredPracticeTestDay"> & {
  preferredPracticeTestDay: DayOfWeek | "";
};

const DEFAULT_VALUES: StudentFormValues = {
  platform: "7Sage",
  currentScore: 150,
  goalScore: 165,
  dailyCapacityMinutes: everyDay(90),
  preferredPracticeTestDay: "",
  accommodationMultiplier: 1,
  goalTestDate: "",
};

interface StudentIntakeFormProps {
  // "create" (onboarding) shows the analytics screenshot section, gated to
  // platform === "7Sage" — that's the only platform with OCR extraction
  // today. "edit" (account settings) is intake fields only; weekly
  // re-upload happens on the dashboard, not here.
  mode: "create" | "edit";
  initialValues?: Student;
  submitLabel: string;
  onSubmit: (
    input: Student & {
      analyticsRows: AnalyticsExtractedRow[];
      analyticsApproval: SnapshotApprovalMetadata | null;
    }
  ) => Promise<void>;
}

export default function StudentIntakeForm({
  mode,
  initialValues,
  submitLabel,
  onSubmit,
}: StudentIntakeFormProps) {
  const [analyticsRows, setAnalyticsRows] = useState<AnalyticsExtractedRow[]>([]);
  const [analyticsApproval, setAnalyticsApproval] = useState<SnapshotApprovalMetadata | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [practiceTestDayError, setPracticeTestDayError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    defaultValues: (initialValues ?? DEFAULT_VALUES) as StudentFormValues,
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      if (DAY_ORDER.some((day) => dailyCapacityError(value.dailyCapacityMinutes[day]))) {
        setSubmitError("Fix the daily capacity above.");
        return;
      }
      if (value.preferredPracticeTestDay === "") {
        setPracticeTestDayError("Select a preferred practice-test day.");
        return;
      }
      setSubmitting(true);
      try {
        await onSubmit({
          ...value,
          preferredPracticeTestDay: value.preferredPracticeTestDay,
          analyticsRows,
          analyticsApproval,
        });
      } catch {
        setSubmitError("Couldn't save. Try again.");
        setSubmitting(false);
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-5"
    >
      <form.Field name="platform">
        {(field) => (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Platform</span>
            <select
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value as Student["platform"])}
              className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
            >
              <option value="7Sage">7Sage</option>
              <option value="LSAT Demon">LSAT Demon</option>
            </select>
          </label>
        )}
      </form.Field>

      <form.Field name="currentScore">
        {(field) => (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Current / avg PT score</span>
            <input
              type="number"
              min={120}
              max={180}
              required
              value={field.state.value}
              onChange={(e) => field.handleChange(Number(e.target.value))}
              className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
            />
          </label>
        )}
      </form.Field>

      <form.Field name="goalScore">
        {(field) => (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Goal score</span>
            <input
              type="number"
              min={120}
              max={180}
              required
              value={field.state.value}
              onChange={(e) => field.handleChange(Number(e.target.value))}
              className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
            />
          </label>
        )}
      </form.Field>

      {mode === "edit" && (
        <p className="-mb-1 text-sm text-ink-500">
          Changes to daily capacity and your preferred practice-test day apply from next week&apos;s plan.
        </p>
      )}

      <form.Field name="dailyCapacityMinutes">
        {(field) => <DailyCapacityFieldset value={field.state.value} onChange={field.handleChange} />}
      </form.Field>

      <form.Field name="preferredPracticeTestDay">
        {(field) => (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Preferred practice-test day</span>
            <select
              required
              aria-invalid={practiceTestDayError ? true : undefined}
              aria-describedby={
                practiceTestDayError
                  ? "preferred-practice-test-day-error preferred-practice-test-day-hint"
                  : "preferred-practice-test-day-hint"
              }
              value={field.state.value}
              onChange={(e) => {
                setPracticeTestDayError(null);
                field.handleChange(e.target.value as DayOfWeek);
              }}
              className={`rounded-md border bg-white px-3 py-2 text-sm text-ink-900 ${
                practiceTestDayError ? "border-red-500" : "border-ink-200"
              }`}
            >
              <option value="" disabled>
                Select a day
              </option>
              {DAY_ORDER.map((day) => (
                <option key={day} value={day}>
                  {DAY_LABEL[day]}
                </option>
              ))}
            </select>
            {practiceTestDayError && (
              <span id="preferred-practice-test-day-error" className="text-sm text-red-600">
                {practiceTestDayError}
              </span>
            )}
            <span id="preferred-practice-test-day-hint" className="text-sm text-ink-500">
              We schedule your full practice test on this day. Pick a day you can give about 3 hours,
              longer with extra time.
            </span>
          </label>
        )}
      </form.Field>

      <form.Field name="accommodationMultiplier">
        {(field) => (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Accommodation</span>
            <select
              value={field.state.value}
              onChange={(e) =>
                field.handleChange(Number(e.target.value) as Student["accommodationMultiplier"])
              }
              className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
            >
              <option value={1}>Standard time</option>
              <option value={1.5}>150% extra time</option>
              <option value={2}>200% extra time</option>
            </select>
          </label>
        )}
      </form.Field>

      <form.Field name="goalTestDate">
        {(field) => (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Goal test date</span>
            <select
              required
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
            >
              <option value="" disabled>
                Select a test date
              </option>
              {GOAL_TEST_DATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </form.Field>

      {mode === "create" && (
        <form.Subscribe selector={(state) => state.values.platform}>
          {(platform) =>
            platform === "7Sage" ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink-700">Analytics screenshot (optional)</span>
                <AnalyticsReview
                  rows={analyticsRows}
                  onRowsChange={setAnalyticsRows}
                  onApprovalChange={setAnalyticsApproval}
                />
              </div>
            ) : null
          }
        </form.Subscribe>
      )}

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-accent-700 disabled:opacity-50"
      >
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
