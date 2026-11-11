import { notFound } from "next/navigation";
import Link from "next/link";
import "../proto.css";
import { DEMO_LABELS, LandingScreen, type SectionLabels } from "../LandingScreen";
import { Pin } from "../sections/how/Pin";
import { WORST_INTRO, WORST_STEPS } from "../sections/how/steps";

import { ProtoLinks } from "./ProtoLinks";
import { StillMotion } from "./StillMotion";
import { AuthScreen } from "../sections/auth/AuthScreen";

// Long prices, and a Monthly price above four Weekly weeks, so the saving text disappears.
const WORST_PRICES = { weeklyCents: 1499, monthlyCents: 6499 };

// The longest Log in notice, shown above Continue with Google.
const WORST_LOGIN = { error: "AccessDenied" };

const WORST_QUESTIONS = [
  {
    question: "Can I use DrillMap with LSAT Lab, LSAT Demon, Blueprint, or PowerScore analytics instead of 7Sage?",
    answer: "Not yet. DrillMap reads the analytics that 7Sage shows you today. We are adding more sites, and we will email you when the one you use is ready.",
  },
  { question: "Refunds?", answer: "No." },
];

const WORST_LABELS: SectionLabels = {
  pricing: "Plans and pricing for your free week and after",
  questions: "Questions students ask before they start a plan",
  closing: "Start your first full week of practice free",
};

export default async function LandingColorsScreen({ searchParams }: PageProps<"/prototypes/landing-colors/screen">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  if (params.page === "login" || params.page === "signup") {
    return (
      <>
        <StillMotion on={params.rm === "1"} />
        <ProtoLinks page={params.page} query={`rm=${params.rm === "1" ? "1" : "0"}`} />
        <AuthScreen page={params.page} loginParams={params.data === "worst" ? WORST_LOGIN : undefined} />
        <DataSwitch worst={params.data === "worst"} href={(data) => `?${new URLSearchParams({ page: String(params.page), rm: params.rm === "1" ? "1" : "0", data })}`} />
      </>
    );
  }
  const worst = params.data === "worst";
  const href = (data: string) => `?${new URLSearchParams({ rm: params.rm === "1" ? "1" : "0", v: String(params.v ?? "1"), data })}`;
  return (
    <>
      <StillMotion on={params.rm === "1"} />
      <ProtoLinks page="landing" query={`rm=${params.rm === "1" ? "1" : "0"}`} />
      <LandingScreen prices={worst ? WORST_PRICES : undefined} moreQuestions={worst ? WORST_QUESTIONS : undefined} how={worst ? <Pin steps={WORST_STEPS} intro={WORST_INTRO} /> : <Pin />} labels={worst ? WORST_LABELS : DEMO_LABELS} />
      <DataSwitch worst={worst} href={href} />
    </>
  );
}

function DataSwitch({ worst, href }: { worst: boolean; href: (data: string) => string }) {
  return (
    <nav aria-label="Test data" className="fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 gap-0.5 rounded-full bg-[#e5e5e5] p-0.5 font-sans text-[12px] text-[#333]">
      {(["demo", "worst"] as const).map((data) => (
        <Link key={data} href={href(data)} replace scroll={false} className={`rounded-full px-3 py-1 ${worst === (data === "worst") ? "bg-[#fff] shadow-sm" : ""}`}>
          {data === "demo" ? "Demo data" : "Worst case"}
        </Link>
      ))}
    </nav>
  );
}
