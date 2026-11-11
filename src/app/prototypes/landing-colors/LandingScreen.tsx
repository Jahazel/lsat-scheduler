import type { Question } from "@/components/landing/QuestionList";
import type { PlanPrices } from "@/lib/planPrices";
import { ClosingSection, PricingSection, ProtoFooter, QuestionsSection, type SectionLabels } from "./sections/close/parts";
import { GridGap, PageGrid } from "./sections/grid/Grid";
import { Wallpaper } from "./sections/hero/Wallpaper";

export type { SectionLabels };

export const DEMO_LABELS: SectionLabels = { pricing: "Pricing", questions: "FAQ", closing: "Start" };

export function LandingScreen({ how, labels = DEMO_LABELS, prices, moreQuestions }: { how: React.ReactNode; labels?: SectionLabels; prices?: PlanPrices; moreQuestions?: Question[] }) {
  return (
    <div data-page-fade>
      <PageGrid hero={<Wallpaper />}>
        <GridGap />
        {how}
        <GridGap />
        <PricingSection label={labels.pricing} prices={prices} />
        <GridGap />
        <QuestionsSection label={labels.questions} prices={prices} more={moreQuestions} />
        <GridGap />
        <ClosingSection label={labels.closing} prices={prices} />
      </PageGrid>
      <ProtoFooter />
    </div>
  );
}

