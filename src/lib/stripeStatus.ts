export const STRIPE_STATUSES = [
  "trialing", "active", "past_due", "unpaid", "canceled", "incomplete", "incomplete_expired", "paused",
] as const;

type StripeStatus = (typeof STRIPE_STATUSES)[number];

type Meaning = {
  stripeCannotCancel: boolean;
  givesNoWeeklySchedules: boolean;
  neverPaidForThisPeriod: boolean;
  firstChargeFailed: boolean;
  mayStillBeStarting: boolean;
  paidByLateRetry: boolean;
};

const MEANINGS: Record<StripeStatus, Meaning> = {
  trialing: { stripeCannotCancel: false, givesNoWeeklySchedules: false, neverPaidForThisPeriod: false, firstChargeFailed: false, mayStillBeStarting: true, paidByLateRetry: true },
  active: { stripeCannotCancel: false, givesNoWeeklySchedules: false, neverPaidForThisPeriod: false, firstChargeFailed: false, mayStillBeStarting: true, paidByLateRetry: true },
  past_due: { stripeCannotCancel: false, givesNoWeeklySchedules: false, neverPaidForThisPeriod: false, firstChargeFailed: true, mayStillBeStarting: true, paidByLateRetry: false },
  unpaid: { stripeCannotCancel: false, givesNoWeeklySchedules: true, neverPaidForThisPeriod: true, firstChargeFailed: true, mayStillBeStarting: false, paidByLateRetry: false },
  canceled: { stripeCannotCancel: true, givesNoWeeklySchedules: true, neverPaidForThisPeriod: false, firstChargeFailed: true, mayStillBeStarting: false, paidByLateRetry: false },
  incomplete: { stripeCannotCancel: false, givesNoWeeklySchedules: false, neverPaidForThisPeriod: true, firstChargeFailed: false, mayStillBeStarting: true, paidByLateRetry: false },
  incomplete_expired: { stripeCannotCancel: true, givesNoWeeklySchedules: true, neverPaidForThisPeriod: true, firstChargeFailed: true, mayStillBeStarting: false, paidByLateRetry: false },
  paused: { stripeCannotCancel: false, givesNoWeeklySchedules: true, neverPaidForThisPeriod: true, firstChargeFailed: true, mayStillBeStarting: false, paidByLateRetry: false },
};

const isStripeStatus = (status: string): status is StripeStatus => Object.hasOwn(MEANINGS, status);

const means = (meaning: keyof Meaning) => (status: string) => isStripeStatus(status) && MEANINGS[status][meaning];

export const stripeCannotCancel = means("stripeCannotCancel");
export const givesNoWeeklySchedules = means("givesNoWeeklySchedules");
export const neverPaidForThisPeriod = means("neverPaidForThisPeriod");
export const firstChargeFailed = means("firstChargeFailed");
export const mayStillBeStarting = means("mayStillBeStarting");
export const paidByLateRetry = means("paidByLateRetry");
