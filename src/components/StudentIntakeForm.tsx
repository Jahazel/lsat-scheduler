"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useState } from "react";
import DailyCapacityFieldset from "@/components/DailyCapacityFieldset";
import { DAY_ORDER } from "@/lib/engine";
import { TEST_TIME_LABEL, practiceTestHint } from "@/lib/onboardingWizard";
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
  const accommodation = useStore(form.store, (state) => state.values.accommodationMultiplier);

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
            <span className="text-small font-medium text-smoke">Current / avg PT score</span>
            <input
              type="number"
              min={120}
              max={180}
              required
              value={field.state.value}
              onChange={(e) => field.handleChange(Number(e.target.value))}
              className="rounded-sm border border-vellum-line bg-paper px-3 py-2 text-small text-ink"
            />
          </label>
        )}
      </form.Field>

      <form.Field name="goalScore">
        {(field) => (
          <label className="flex flex-col gap-1.5">
            <span className="text-small font-medium text-smoke">Goal score</span>
            <input
              type="number"
              min={120}
              max={180}
              required
              aria-invalid={goalError ? true : undefined}
              aria-describedby={goalError ? "goal-score-error" : undefined}
              value={field.state.value}
              onChange={(e) => field.handleChange(Number(e.target.value))}
              className={`rounded-sm border bg-paper px-3 py-2 text-small text-ink ${
                goalError ? "border-danger" : "border-vellum-line"
              }`}
            />
            {goalError && (
              <span id="goal-score-error" className="text-small text-danger-ink">
                {goalError}
              </span>
            )}
          </label>
        )}
      </form.Field>

      <p className="-mb-1 text-small text-smoke">
        Changes to daily capacity and your preferred practice-test day apply to the next weekly schedule created.
      </p>

      <form.Field name="dailyCapacityMinutes">
        {(field) => <DailyCapacityFieldset value={field.state.value} onChange={field.handleChange} />}
      </form.Field>

      <form.Field name="preferredPracticeTestDay">
        {(field) => (
          <label className="flex flex-col gap-1.5">
            <span className="text-small font-medium text-smoke">Preferred practice-test day</span>
            <select
              required
              aria-describedby="preferred-practice-test-day-hint"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value as DayOfWeek)}
              className="rounded-sm border border-vellum-line bg-paper px-3 py-2 text-small text-ink"
            >
              {DAY_ORDER.map((day) => (
                <option key={day} value={day}>
                  {DAY_LABEL[day]}
                </option>
              ))}
            </select>
            <span id="preferred-practice-test-day-hint" className="text-small text-smoke">
              We schedule your full practice test on this day. {practiceTestHint(accommodation)}
            </span>
          </label>
        )}
      </form.Field>

      <form.Field name="accommodationMultiplier">
        {(field) => (
          <label className="flex flex-col gap-1.5">
            <span className="text-small font-medium text-smoke">Accommodation</span>
            <select
              value={field.state.value}
              onChange={(e) =>
                field.handleChange(Number(e.target.value) as StudentProfileInput["accommodationMultiplier"])
              }
              className="rounded-sm border border-vellum-line bg-paper px-3 py-2 text-small text-ink"
            >
              {([1, 1.5, 2] as const).map((multiplier) => (
                <option key={multiplier} value={multiplier}>
                  {TEST_TIME_LABEL[multiplier]}
                </option>
              ))}
            </select>
          </label>
        )}
      </form.Field>

      <form.Field name="goalTestDate">
        {(field) => (
          <label className="flex flex-col gap-1.5">
            <span className="text-small font-medium text-smoke">Goal test date</span>
            <select
              required
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="rounded-sm border border-vellum-line bg-paper px-3 py-2 text-small text-ink"
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

      {submitError && <p className="text-small text-danger-ink">{submitError}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-sm bg-ink px-4 py-2 text-small font-medium text-chalk transition-colors duration-150 ease-out hover:bg-graphite-raised disabled:opacity-50"
      >
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
