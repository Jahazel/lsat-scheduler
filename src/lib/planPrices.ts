export type PlanPrices = { weeklyCents: number; monthlyCents: number };

export const PLAN_PRICES: PlanPrices = { weeklyCents: 1000, monthlyCents: 2999 };

const WEEKS_PER_MONTH = 52 / 12;

function dollars(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

const nearestTenCents = (cents: number) => Math.round(cents / 10) * 10;

export function planPriceText({ weeklyCents, monthlyCents }: PlanPrices) {
  const monthOnWeeklyCents = weeklyCents * WEEKS_PER_MONTH;
  const exactPercentLess = (1 - monthlyCents / monthOnWeeklyCents) * 100;
  const percentLess = Math.round(exactPercentLess);
  return {
    weekly: dollars(weeklyCents),
    monthly: dollars(monthlyCents),
    monthlySaving: exactPercentLess >= 1 ? `about ${percentLess}% less` : null,
    monthOnWeekly: `About ${dollars(nearestTenCents(monthOnWeeklyCents))} a month on Weekly`,
  };
}
