"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useState } from "react";
import DailyCapacityFieldset from "@/components/DailyCapacityFieldset";
import { DAY_ORDER } from "@/lib/engine";
import { DAY_LABEL, dailyCapacityError, goalScoreError, type StudentProfileInput, type upcomingTestMonths } from "@/lib/studentProfile";
import type { DayOfWeek } from "@/lib/types";

interface StudentIntakeFormProps {
  initialValues: StudentProfileInput;
  goalTestDateOptions: ReturnType<typeof upcomingTestMonths>;
  submitLabel: string;
  onSubmit: (input: StudentProfileInput) => Promise<void>;
}

export default function StudentIntakeForm({
  initialValues,
  goalTestDateOptions,
  submitLabel,
  onSubmit,
}: StudentIntakeFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const savedTestMonthIsOffered = goalTestDateOptions.some((option) => option.value === initialValues.goalTestDate);
  const form = useForm({
    defaultValues: { ...initialValues, goalTestDate: savedTestMonthIsOffered ? initialValues.goalTestDate : "" },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      if (goalScoreError(value.currentScore, value.goalScore)) return;
      if (DAY_ORDER.some((day) => dailyCapacityError(value.dailyCapacityMinutes[day]))) {
        setSubmitError("Fix the daily capacity above.");
        return;
      }
      setSubmitting(true);
      try {
        await onSubmit(value);
      } catch {
        setSubmitError("Couldn't save. Try again.");
        setSubmitting(false);
      }
    },
  });

  const goalError = useStore(form.store, (state) => goalScoreError(state.values.currentScore, state.values.goalScore));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-5"
    >
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
              aria-invalid={goalError ? true : undefined}
              aria-describedby={goalError ? "goal-score-error" : undefined}
              value={field.state.value}
              onChange={(e) => field.handleChange(Number(e.target.value))}
              className={`rounded-md border bg-white px-3 py-2 text-sm text-ink-900 ${
                goalError ? "border-red-500" : "border-ink-200"
              }`}
            />
            {goalError && (
              <span id="goal-score-error" className="text-sm text-red-600">
                {goalError}
              </span>
            )}
          </label>
        )}
      </form.Field>

      <p className="-mb-1 text-sm text-ink-500">
        Changes to daily capacity and your preferred practice-test day apply to the next weekly schedule created.
      </p>

      <form.Field name="dailyCapacityMinutes">
        {(field) => <DailyCapacityFieldset value={field.state.value} onChange={field.handleChange} />}
      </form.Field>

      <form.Field name="preferredPracticeTestDay">
        {(field) => (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Preferred practice-test day</span>
            <select
              required
              aria-describedby="preferred-practice-test-day-hint"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value as DayOfWeek)}
              className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
            >
              {DAY_ORDER.map((day) => (
                <option key={day} value={day}>
                  {DAY_LABEL[day]}
                </option>
              ))}
            </select>
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
                field.handleChange(Number(e.target.value) as StudentProfileInput["accommodationMultiplier"])
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
              {goalTestDateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </form.Field>

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
