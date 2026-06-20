import type { ClientUpgradeRequestPayload } from "@/lib/client/entitlements";

export const RECURRING_UPGRADE_ITEM_TYPES = new Set(["seat_increase", "new_assessment"]);

export function isRecurringUpgradeItemType(type: string): boolean {
  return RECURRING_UPGRADE_ITEM_TYPES.has(type);
}

export function payloadUsesSubscriptionCheckout(payload: ClientUpgradeRequestPayload): boolean {
  if (payload.type === "contract_activation" || payload.type === "contract_extension") {
    return true;
  }

  if (payload.type === "seat_increase" || payload.type === "new_assessment") {
    return true;
  }

  if (payload.type === "upgrade_bundle") {
    return payload.items.some((item) => isRecurringUpgradeItemType(item.type));
  }

  return false;
}

export function monthlySeatPricePence(pricing: Record<string, number | string>): number {
  return Number(pricing.seatOneOffPence ?? pricing.seatMonthlyPence ?? 0);
}

export function monthlyAssessmentAddonPence(pricing: Record<string, number | string>): number {
  return Number(pricing.assessmentAddonPence ?? 0);
}
