export default function Loading() {
  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-2xl animate-pulse">
        <div className="flex items-end justify-between gap-4">
          <div className="h-7 w-24 rounded bg-ink-100" />
          <div className="h-9 w-28 rounded-md bg-ink-100" />
        </div>

        <div className="mt-8 divide-y divide-ink-100 border-y border-ink-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-1 py-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-ink-100" />
                <div className="h-3 w-48 rounded bg-ink-100" />
              </div>
              <div className="size-4 shrink-0 rounded bg-ink-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
