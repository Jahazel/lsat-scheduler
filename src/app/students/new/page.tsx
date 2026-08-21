"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AnalyticsReview from "../AnalyticsReview";
import type { AnalyticsExtractedRow } from "@/lib/types";

export default function NewStudentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<"7Sage" | "LSAT Demon">("7Sage");
  const [currentScore, setCurrentScore] = useState("");
  const [weekdayHours, setWeekdayHours] = useState("1.5");
  const [weekendHours, setWeekendHours] = useState("1.5");
  const [accommodationMultiplier, setAccommodationMultiplier] = useState("1");
  const [analyticsRows, setAnalyticsRows] = useState<AnalyticsExtractedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          platform,
          currentScore: Number(currentScore),
          weekdayHours: Number(weekdayHours),
          weekendHours: Number(weekendHours),
          accommodationMultiplier: Number(accommodationMultiplier),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save student");
      }

      const { id } = await res.json();

      if (analyticsRows.length > 0) {
        const lrAccuracyByType: Record<string, number> = {};
        const lrTopPriorityLogicTypes: string[] = [];

        for (const row of analyticsRows) {
          if (row.category === "regular" && row.accuracy !== undefined) {
            lrAccuracyByType[row.type] = row.accuracy / 100;
          }
          if (row.category === "restricted" && row.isTopPriority) {
            lrTopPriorityLogicTypes.push(row.type);
          }
        }

        await fetch(`/api/students/${id}/analytics`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lrAccuracyByType, lrTopPriorityLogicTypes }),
        });
      }

      router.push(`/students/${id}`);
    } catch {
      setError("Couldn't save this student. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Add a student</h1>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Platform</span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as "7Sage" | "LSAT Demon")}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="7Sage">7Sage</option>
              <option value="LSAT Demon">LSAT Demon</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Avg PT score
            </span>
            <input
              type="number"
              min="120"
              max="180"
              required
              value={currentScore}
              onChange={(e) => setCurrentScore(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Weekday hours/day
            </span>
            <input
              type="number"
              step="0.5"
              min="0"
              required
              value={weekdayHours}
              onChange={(e) => setWeekdayHours(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Weekend hours/day
            </span>
            <input
              type="number"
              step="0.5"
              min="0"
              required
              value={weekendHours}
              onChange={(e) => setWeekendHours(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Accommodation
            </span>
            <select
              value={accommodationMultiplier}
              onChange={(e) => setAccommodationMultiplier(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="1">Standard time</option>
              <option value="1.5">150% extra time</option>
              <option value="2">200% extra time</option>
            </select>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Analytics screenshot (optional)
            </span>
            <AnalyticsReview rows={analyticsRows} onRowsChange={setAnalyticsRows} />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {submitting ? "Saving…" : "Save student"}
          </button>
        </form>
      </div>
    </div>
  );
}
