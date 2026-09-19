"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function ResetTestAccountButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reset() {
    if (!window.confirm("Remove this account's test schedules, check-ins, and analytics uploads? Your profile will stay.")) return;
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/dashboard/reset-test-account", { method: "POST" });
        if (!response.ok) throw new Error();
        router.replace("/dashboard");
        router.refresh();
      } catch {
        setError("Couldn't reset the test account. Try again.");
      }
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <button className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={pending} onClick={reset} type="button">
        {pending ? "Resetting…" : "Reset test account"}
      </button>
      <p className="text-sm text-ink-700">Removes schedules, check-ins, and analytics uploads. Your profile remains.</p>
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </div>
  );
}
