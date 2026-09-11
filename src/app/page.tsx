import Link from "next/link";
import { generateWeek } from "@/lib/engine";
import { mockAnalytics, mockRules, mockStudent, mockStudentName } from "@/lib/mockData";
import WeeklyScheduleView from "@/components/WeeklyScheduleView";
import EmailCaptureForm from "./EmailCaptureForm";

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Connect your analytics",
    body: "Upload a 7Sage analytics screenshot — DrillMap reads your accuracy by question type automatically.",
  },
  {
    step: "2",
    title: "Get this week's plan",
    body: "A weekly drilling schedule built around your specific weak spots, not a generic syllabus.",
  },
  {
    step: "3",
    title: "Re-check in every week",
    body: "Upload fresh analytics each week and your plan updates — like a coach, not a static PDF.",
  },
];

const sampleSchedule = generateWeek(mockStudent, mockAnalytics, mockRules, mockStudentName);

export default function LandingPage() {
  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <section className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
            Your LSAT score, engineered week by week.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-600">
            Most students don&rsquo;t lack effort — they lack direction. DrillMap turns your analytics into a
            targeted weekly drilling plan, automatically.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="rounded-md bg-accent-600 px-6 py-3 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-accent-700"
            >
              Get my first week free
            </Link>
            <Link
              href="/legal/ai-disclosure"
              className="text-sm font-medium text-ink-500 hover:text-ink-700"
            >
              How DrillMap uses AI
            </Link>
          </div>
        </section>

        <section className="mt-12 rounded-xl border border-ink-100 bg-white px-6 py-8 shadow-proof-ambient sm:px-10 sm:py-10">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xl font-semibold text-accent-700">
              [XX]
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-ink-900">[Partner Name]</h2>
              <p className="text-sm text-ink-500">Founder &amp; LSAT Tutor</p>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-xl text-center text-sm text-ink-600 sm:mx-0 sm:text-left">
            [2-3 sentence bio — how they got into LSAT tutoring, what they care about, what makes these
            numbers personal.]
          </p>

          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-ink-100 pt-8 text-center sm:grid-cols-4">
            <div>
              <div className="text-2xl font-semibold tracking-tight text-accent-600 sm:text-3xl">178</div>
              <div className="mt-1 text-xs font-medium text-ink-500">LSAT score</div>
            </div>
            <div>
              <div className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">Stanford</div>
              <div className="mt-1 text-xs font-medium text-ink-500">Law School</div>
            </div>
            <div>
              <div className="text-2xl font-semibold tracking-tight text-accent-600 sm:text-3xl">200+</div>
              <div className="mt-1 text-xs font-medium text-ink-500">students coached</div>
            </div>
            <div>
              <div className="text-2xl font-semibold tracking-tight text-accent-600 sm:text-3xl">3,000+</div>
              <div className="mt-1 text-xs font-medium text-ink-500">tutoring hours</div>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-ink-900">How it works</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="rounded-lg border border-ink-100 bg-white p-5">
                <span className="flex size-7 items-center justify-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700">
                  {item.step}
                </span>
                <h3 className="mt-3 font-medium text-ink-900">{item.title}</h3>
                <p className="mt-1 text-sm text-ink-600">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-ink-900">
            A real weekly plan, not a template
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-ink-600">
            Here&rsquo;s an actual DrillMap plan — targeted drilling, one practice test, one review day.
          </p>
          <div className="mt-8 rounded-xl border border-ink-100 bg-ink-25 p-6">
            <WeeklyScheduleView schedule={sampleSchedule} student={mockStudent} isRealAnalytics />
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-ink-900">Pricing</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-ink-600">
            Start with your first week free. After that:
          </p>
          <div className="mx-auto mt-10 grid max-w-2xl items-center gap-6 sm:mt-8 sm:grid-cols-2">
            <div className="rounded-xl border border-ink-100 bg-white p-8 text-center">
              <h3 className="text-sm font-medium text-ink-500">Weekly</h3>
              <div className="mt-2 text-4xl font-semibold tracking-tight text-ink-900">
                $7.99<span className="text-base font-medium text-ink-500">/wk</span>
              </div>
              <p className="mt-4 text-xs text-ink-500">No monthly commitment — cancel anytime.</p>
              <Link
                href="/signup"
                className="mt-6 block rounded-md border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors duration-150 ease-out hover:border-ink-400"
              >
                Start weekly
              </Link>
            </div>
            <div className="relative rounded-xl border-2 border-accent-600 bg-accent-100 p-8 text-center shadow-proof-ambient sm:scale-105">
              <span className="absolute -top-3 right-6 rounded-full bg-accent-600 px-3 py-1 text-xs font-medium text-white">
                Best value
              </span>
              <h3 className="text-sm font-medium text-accent-700">Monthly</h3>
              <div className="mt-2 text-4xl font-semibold tracking-tight text-ink-900">
                $25<span className="text-base font-medium text-ink-500">/mo</span>
              </div>
              <p className="mt-4 text-xs font-medium text-accent-700">
                Signed up to 7Sage through our link? Mention it during signup and we&rsquo;ll confirm and
                apply $10/mo.
              </p>
              <Link
                href="/signup"
                className="mt-6 block rounded-md bg-accent-600 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-accent-700"
              >
                Start monthly
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-16 rounded-xl border border-ink-100 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">Not ready to start yet?</h2>
          <p className="mt-1 text-sm text-ink-600">
            Leave your email and we&rsquo;ll let you know when DrillMap adds your platform or features.
          </p>
          <div className="mx-auto mt-4 max-w-sm">
            <EmailCaptureForm />
          </div>
        </section>
      </div>
    </div>
  );
}
