import Link from "next/link";

const STUDY_DAYS = [
  { day: "Mon", focus: "Strengthen", work: "12 questions", accuracy: "82%" },
  { day: "Tue", focus: "Flaw", work: "14 questions", accuracy: "67%" },
  { day: "Wed", focus: "Review", work: "Missed questions" },
  { day: "Thu", focus: "Necessary assumption", work: "10 questions", accuracy: "71%" },
];

export default function LandingPage() {
  return (
    <div className="overflow-hidden bg-vellum">
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-12 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:pt-20">
        <div>
          <p className="mb-5 text-label font-medium uppercase text-accent">
            A weekly plan from your real results
          </p>
          <h1 className="max-w-2xl text-h3 font-semibold text-ink sm:text-h2">
            Stop guessing what to study next.
          </h1>
          <p className="mt-7 max-w-xl text-lead text-smoke">
            DrillMap reads your LSAT analytics and turns them into a practical week of drilling, review, and recovery.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/signup" className="rounded-sm bg-ink px-6 py-3 text-body font-medium text-chalk transition-colors duration-150 ease-out hover:bg-graphite-raised">
              Build my first plan
            </Link>
            <span className="text-small text-smoke">Your first week is free.</span>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-vellum-line pt-6 sm:grid-cols-4 sm:gap-x-12">
            <Metric value="178" label="founder LSAT" />
            <Metric value="Stanford" label="Law School" />
            <Metric value="200+" label="students coached" />
            <Metric value="3,000+" label="hours coached" />
          </div>
        </div>

        <section className="rounded-md bg-ink p-5 text-chalk shadow-e2 sm:p-7" aria-label="Sample weekly study plan">
          <div className="flex items-start justify-between border-b border-graphite-line pb-5">
            <div>
              <p className="text-label font-medium uppercase text-fog">Your study week</p>
              <h2 className="mt-1 text-h4 font-semibold">An example week</h2>
            </div>
            <span className="rounded-full bg-vellum-line px-2.5 py-1 text-caption font-medium text-smoke">Sample</span>
          </div>
          <div className="mt-5 space-y-2">
            {STUDY_DAYS.map((studyDay) => (
              <div key={studyDay.day} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-xs bg-graphite-raised px-3 py-3">
                <span className="text-caption font-medium text-fog">{studyDay.day}</span>
                <div>
                  <p className="font-medium">{studyDay.focus}</p>
                  <p className="text-caption text-fog">{studyDay.work}</p>
                </div>
                {studyDay.accuracy && <span className="text-h4 font-semibold text-chalk">{studyDay.accuracy}</span>}
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-xs bg-chalk px-4 py-3 text-small text-ink">
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
      <p className="text-h4 font-semibold text-ink">{value}</p>
      <p className="mt-1 text-caption text-smoke">{label}</p>
    </div>
  );
}
