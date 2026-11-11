import type { Shot } from "@/components/landing/HowItWorksPin";

// key: the underlined words, 18 characters at most so they never wrap.
// crop: source pixels cut from the top of each screen so its own "STEP n OF 4" label stays hidden.
export type HowStep = { lead: string; key: string; body: string; screen: Shot; phoneScreen: Shot; crop: { screen: number; phone: number } };

export const STEPS: HowStep[] = [
  {
    lead: "Tell us about ",
    key: "your prep",
    body: "Your scores, your study hours, and your goal test date.",
    screen: { src: "/landing/step-1-prep.png", alt: "Set your target screen: current PT score, goal score, goal test date and test time", width: 1356, height: 870 },
    phoneScreen: { src: "/landing/step-1-prep-phone.png", alt: "Plan your week screen: study time for each day", width: 780, height: 956 },
    crop: { screen: 123, phone: 127 },
  },
  {
    lead: "Upload your ",
    key: "practice analytics",
    body: "Two screenshots. You check every number we read before we save it. You can also type them by hand.",
    screen: { src: "/landing/step-2-check.png", alt: "Check what we read screen: each value read from your 7Sage screenshots, ready to edit", width: 1356, height: 870 },
    phoneScreen: { src: "/landing/step-2-check-phone.png", alt: "Check what we read screen: each value read from your 7Sage screenshots, ready to edit", width: 780, height: 956 },
    crop: { screen: 157, phone: 126 },
  },
  {
    lead: "Get ",
    key: "your week",
    body: "A Monday–Sunday plan aimed at your weakest question types. Check off each drill as you go.",
    screen: { src: "/landing/step-3-week.png", alt: "This week screen: Saturday and Sunday drills with check boxes", width: 1560, height: 1000 },
    phoneScreen: { src: "/landing/step-3-week-phone.png", alt: "This week screen: Saturday drills with check boxes", width: 780, height: 489 },
    crop: { screen: 58, phone: 0 },
  },
  {
    lead: "Repeat ",
    key: "every weekend",
    body: "Upload new analytics. Next week's plan adjusts to what changed.",
    screen: { src: "/landing/step-4-repeat.png", alt: "Plan next week screen: current score and the 7Sage screenshot upload", width: 1356, height: 870 },
    phoneScreen: { src: "/landing/step-4-repeat-phone.png", alt: "Plan next week screen: current score and the 7Sage screenshot upload", width: 780, height: 956 },
    crop: { screen: 128, phone: 81 },
  },
];

export const WORST_INTRO = "Four steps. The last one repeats every weekend until your official LSAT test day.";

const WORST_TEXT: Pick<HowStep, "lead" | "key" | "body">[] = [
  { lead: "Tell us about ", key: "your goal test day", body: "Your latest practice test score, your goal score, how many hours you can study each day, and the official test date you are aiming for." },
  { lead: "Upload your ", key: "7Sage PT analytics", body: "Two screenshots from 7Sage: accuracy by question type and time per question. You check every number we read before we save it. You can also type them by hand if a screenshot is blurry." },
  { lead: "Get ", key: "your week", body: "A Monday–Sunday plan." },
  { lead: "Repeat every weekend until ", key: "test day", body: "Upload new analytics. Next week's plan adjusts to what changed: question types you improved get fewer drills, and new weak spots move to the top." },
];

export const WORST_STEPS: HowStep[] = STEPS.map((step, index) => ({ ...step, ...WORST_TEXT[index] }));

if (process.env.NODE_ENV === "development") {
  for (const { key } of [...STEPS, ...WORST_STEPS]) console.assert(key.length <= 18, `Step key "${key}" is longer than 18 characters`);
}
