import Link from "next/link";

const STUDY_DAYS = [
  { day: "Mon", focus: "Strengthen", work: "12 questions", accuracy: "82%" },
  { day: "Tue", focus: "Flaw", work: "14 questions", accuracy: "67%" },
  { day: "Wed", focus: "Review", work: "Missed questions" },
  { day: "Thu", focus: "Necessary assumption", work: "10 questions", accuracy: "71%" },
];

export default function LandingPage() {
  return (
    <div className="overflow-hidden bg-ink-25">
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-12 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:pt-20">
        <div>
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-accent-600">
            A weekly plan from your real results
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
            Stop guessing what to study next.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-ink-600">
            DrillMap reads your LSAT analytics and turns them into a practical week of drilling, review, and recovery.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/signup" className="rounded-md bg-accent-600 px-6 py-3 text-base font-medium text-white transition-colors duration-150 ease-out hover:bg-accent-700">
              Build my first plan
            </Link>
            <span className="text-sm text-ink-500">Your first week is free.</span>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-ink-100 pt-6 sm:grid-cols-4 sm:gap-x-12">
            <Metric value="178" label="founder LSAT" />
            <Metric value="Stanford" label="Law School" />
            <Metric value="200+" label="students coached" />
            <Metric value="3,000+" label="hours coached" />
          </div>
        </div>

        <section className="rounded-xl bg-ink-900 p-5 text-white shadow-proof-ambient sm:p-7" aria-label="Sample weekly study plan">
          <div className="flex items-start justify-between border-b border-white/15 pb-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent-100">Your study week</p>
              <h2 className="mt-1 text-2xl font-semibold">An example week</h2>
            </div>
            <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-500">Sample</span>
          </div>
          <div className="mt-5 space-y-2">
            {STUDY_DAYS.map((studyDay) => (
              <div key={studyDay.day} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-lg bg-white/10 px-3 py-3">
                <span className="text-xs font-medium text-accent-100">{studyDay.day}</span>
                <div>
                  <p className="font-medium">{studyDay.focus}</p>
                  <p className="text-xs text-white/55">{studyDay.work}</p>
                </div>
                {studyDay.accuracy && <span className="text-2xl font-semibold tracking-tight text-accent-600">{studyDay.accuracy}</span>}
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-lg bg-accent-600 px-4 py-3 text-sm">
            This week targets two question types that cost you 8 points on your last test.
          </p>
        </section>
      </section>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold tracking-tight text-ink-900">{value}</p>
      <p className="mt-1 text-xs text-ink-500">{label}</p>
    </div>
  );
}
