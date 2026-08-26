"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import AnalyticsReview from "@/components/AnalyticsReview";
import type { AnalyticsExtractedRow, Student } from "@/lib/types";

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

const DEFAULT_VALUES: Student = {
  platform: "7Sage",
  currentScore: 150,
  goalScore: 165,
  weekdayHours: 1.5,
  weekendHours: 1.5,
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
  onSubmit: (input: Student & { analyticsRows: AnalyticsExtractedRow[] }) => Promise<void>;
}

export default function StudentIntakeForm({
  mode,
  initialValues,
  submitLabel,
  onSubmit,
}: StudentIntakeFormProps) {
  const [analyticsRows, setAnalyticsRows] = useState<AnalyticsExtractedRow[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    defaultValues: initialValues ?? DEFAULT_VALUES,
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      setSubmitting(true);
      try {
        await onSubmit({ ...value, analyticsRows });
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

      <form.Field name="weekdayHours">
        {(field) => (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Weekday hours/day</span>
            <input
              type="number"
              step={0.5}
              min={0}
              required
              value={field.state.value}
              onChange={(e) => field.handleChange(Number(e.target.value))}
              className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
            />
          </label>
        )}
      </form.Field>

      <form.Field name="weekendHours">
        {(field) => (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Weekend hours/day</span>
            <input
              type="number"
              step={0.5}
              min={0}
              required
              value={field.state.value}
              onChange={(e) => field.handleChange(Number(e.target.value))}
              className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
            />
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
                <AnalyticsReview rows={analyticsRows} onRowsChange={setAnalyticsRows} />
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
