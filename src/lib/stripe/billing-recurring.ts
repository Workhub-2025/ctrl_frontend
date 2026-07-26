import type { ClientUpgradeRequestPayload } from "@/lib/client/entitlements";

/**
 * Only the platform contract (annual licence, paid monthly) uses Stripe
 * subscription Checkout. Seats, assessment add-ons, and delivery features are
 * one-off payment Checkout.
 */
export function payloadUsesSubscriptionCheckout(
  payload: ClientUpgradeRequestPayload,
): boolean {
  return (
    payload.type === "contract_activation" ||
    payload.type === "contract_extension"
  );
}

/** One-off HM seat unlock amount (pence). */
export function monthlySeatPricePence(
  pricing: Record<string, number | string>,
): number {
  return Number(pricing.seatOneOffPence ?? pricing.seatMonthlyPence ?? 0);
}

/** One-off assessment add-on unlock amount (pence). */
export function monthlyAssessmentAddonPence(
  pricing: Record<string, number | string>,
): number {
  return Number(pricing.assessmentAddonPence ?? 0);
}
