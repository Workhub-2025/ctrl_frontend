import type Stripe from "stripe";

/** Shared Direct Debit billing day — first invoice is pro-rated to the next occurrence. */
export const BILLING_CYCLE_DAY_OF_MONTH = 28;

export function formatBillingCycleDayLabel(day = BILLING_CYCLE_DAY_OF_MONTH): string {
  const suffix =
    day >= 11 && day <= 13
      ? "th"
      : day % 10 === 1
        ? "st"
        : day % 10 === 2
          ? "nd"
          : day % 10 === 3
            ? "rd"
            : "th";
  return `${day}${suffix}`;
}

/**
 * Next billing anchor on `dayOfMonth` (UTC noon).
 * If today is before the 28th → anchor this month; on/after the 28th → anchor next month.
 */
export function computeNextBillingCycleAnchorUnix(
  dayOfMonth = BILLING_CYCLE_DAY_OF_MONTH,
  from = new Date()
): number {
  const today = from.getUTCDate();
  let year = from.getUTCFullYear();
  let month = from.getUTCMonth();

  if (today >= dayOfMonth) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const anchorDay = Math.min(dayOfMonth, daysInMonth);

  return Math.floor(Date.UTC(year, month, anchorDay, 12, 0, 0) / 1000);
}

export function buildStripeSubscriptionCheckoutData(
  from = new Date()
): Stripe.Checkout.SessionCreateParams.SubscriptionData {
  return {
    billing_cycle_anchor: computeNextBillingCycleAnchorUnix(BILLING_CYCLE_DAY_OF_MONTH, from),
    proration_behavior: "create_prorations",
  };
}

export const BILLING_CYCLE_PRO_RATA_HINT = `The first payment is pro-rated to the ${formatBillingCycleDayLabel()} of the month; full monthly charges apply on the ${formatBillingCycleDayLabel()} thereafter.`;
