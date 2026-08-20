"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewStudentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<"7Sage" | "LSAT Demon">("7Sage");
  const [weekdayHours, setWeekdayHours] = useState("1.5");
  const [weekendHours, setWeekendHours] = useState("1.5");
  const [accommodationMultiplier, setAccommodationMultiplier] = useState("1");
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
          weekdayHours: Number(weekdayHours),
          weekendHours: Number(weekendHours),
          accommodationMultiplier: Number(accommodationMultiplier),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save student");
      }

      const { id } = await res.json();
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
