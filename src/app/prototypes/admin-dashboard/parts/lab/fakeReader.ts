import { generateSampleAnalytics } from "@/lib/sampleAnalytics";
import { PASSAGE_TYPES } from "@/lib/analyticsReview";
import { mockRules } from "@/lib/mockData";
import { PT158_FIXTURES } from "@/lib/practiceTestFixtures/pt158";
import type { AnalyticsExtractedRow } from "@/lib/types";

const regularTypes = [...mockRules.lrStemTypes, ...mockRules.lrLogicExceptions];
const restrictedTypes = mockRules.lrLogicTypes.filter((t) => !mockRules.lrLogicExceptions.includes(t));
let seed = 7;
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const values = generateSampleAnalytics({ previous: null, direction: "steady", currentScore: 152, earlierSampleCount: 0, regularTypes, restrictedTypes, random });
const LR_ROWS: AnalyticsExtractedRow[] = [
  ...regularTypes.map((type) => ({ type, category: "regular" as const, accuracy: Math.round(values.lrAccuracyByType[type]! * 100) })),
  ...restrictedTypes.map((type) => ({ type, category: "restricted" as const, isTopPriority: values.lrTopPriorityLogicTypes.includes(type) })),
];
const RC_ROWS: AnalyticsExtractedRow[] = PASSAGE_TYPES.map((type) => ({ type, category: "passage" as const, accuracy: Math.round(values.rcAccuracyByType[type]! * 100) }));
const READ_MS = 1400;

export function installFakeReader() {
  const real = window.fetch;
  let section = 0;
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.includes("/api/analytics/extract") && !url.includes("/api/practice-test/extract")) return real(input, init);
    await new Promise((done) => setTimeout(done, READ_MS));
    if (url.includes("/api/practice-test/extract")) {
      const reading = PT158_FIXTURES[section % PT158_FIXTURES.length]!.reading;
      section += 1;
      return Response.json({ reading });
    }
    const asked = init?.body instanceof FormData ? init.body.get("section") : null;
    return Response.json(asked === "RC" ? { rows: RC_ROWS, showsPassageTypes: true } : { rows: LR_ROWS });
  };
  return () => { window.fetch = real; };
}
