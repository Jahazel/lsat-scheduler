export const STRIPE_STATUSES = [
  "trialing", "active", "past_due", "unpaid", "canceled", "incomplete", "incomplete_expired", "paused",
] as const;

export type StripeStatus = (typeof STRIPE_STATUSES)[number];

type Meaning = {
  stripeCannotCancel: boolean;
  givesNoWeeklySchedules: boolean;
  neverPaidForThisPeriod: boolean;
  firstChargeFailed: boolean;
  /** Stripe can still be sending the message for it, so the billing record may not show it yet. */
  mayStillBeStarting: boolean;
  /** A late retry of a lapsed plan can succeed before its message arrives, so the student has paid for it after all. */
  paidAgain: boolean;
};

const MEANINGS: Record<StripeStatus, Meaning> = {
  trialing: { stripeCannotCancel: false, givesNoWeeklySchedules: false, neverPaidForThisPeriod: false, firstChargeFailed: false, mayStillBeStarting: true, paidAgain: true },
  active: { stripeCannotCancel: false, givesNoWeeklySchedules: false, neverPaidForThisPeriod: false, firstChargeFailed: false, mayStillBeStarting: true, paidAgain: true },
  past_due: { stripeCannotCancel: false, givesNoWeeklySchedules: false, neverPaidForThisPeriod: false, firstChargeFailed: true, mayStillBeStarting: true, paidAgain: false },
  unpaid: { stripeCannotCancel: false, givesNoWeeklySchedules: true, neverPaidForThisPeriod: true, firstChargeFailed: true, mayStillBeStarting: false, paidAgain: false },
  canceled: { stripeCannotCancel: true, givesNoWeeklySchedules: true, neverPaidForThisPeriod: false, firstChargeFailed: true, mayStillBeStarting: false, paidAgain: false },
  incomplete: { stripeCannotCancel: false, givesNoWeeklySchedules: false, neverPaidForThisPeriod: true, firstChargeFailed: false, mayStillBeStarting: true, paidAgain: false },
  incomplete_expired: { stripeCannotCancel: true, givesNoWeeklySchedules: true, neverPaidForThisPeriod: true, firstChargeFailed: true, mayStillBeStarting: false, paidAgain: false },
  paused: { stripeCannotCancel: false, givesNoWeeklySchedules: true, neverPaidForThisPeriod: true, firstChargeFailed: true, mayStillBeStarting: false, paidAgain: false },
};

const isStripeStatus = (status: string): status is StripeStatus => Object.hasOwn(MEANINGS, status);

const means = (meaning: keyof Meaning) => (status: string) => isStripeStatus(status) && MEANINGS[status][meaning];

export const stripeCannotCancel = means("stripeCannotCancel");
export const givesNoWeeklySchedules = means("givesNoWeeklySchedules");
export const neverPaidForThisPeriod = means("neverPaidForThisPeriod");
export const firstChargeFailed = means("firstChargeFailed");
export const mayStillBeStarting = means("mayStillBeStarting");
export const paidAgain = means("paidAgain");
