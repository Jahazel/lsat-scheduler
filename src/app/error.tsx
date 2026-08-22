"use client";

import { useEffect } from "react";

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 border-y border-ink-100 px-6 py-16 text-center">
        <AlertIcon className="size-6 text-ink-400" />
        <p className="text-sm text-ink-500">
          Couldn&rsquo;t load students. Check the connection and try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-1 inline-flex items-center rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-25"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
