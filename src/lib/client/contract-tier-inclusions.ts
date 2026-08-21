export type ContractTierName = "essential" | "professional" | "founder";

export const DEFAULT_FOUNDER_DISCOUNT_PERCENT = 33;

export type ContractTierInclusions = Readonly<{
  tier: ContractTierName | null;
  deliveryRemote: boolean;
  deliveryHybrid: boolean;
  founderDiscountPercent: number | null;
}>;

export function normalizeContractTier(
  tier?: string | null,
): ContractTierName | null {
  const value = (tier ?? "").trim().toLowerCase();
  if (value === "essential" || value === "professional" || value === "founder") {
    return value;
  }
  return null;
}

/**
 * What the live contract includes without a paid add-on.
 * Professional and Founder include remote + hybrid delivery.
 * Founder paid upgrades take 33% off.
 * Core assessments come from the platform registry, not this map.
 */
export function contractTierInclusions(
  tier?: string | null,
): ContractTierInclusions {
  const normalized = normalizeContractTier(tier);
  const includesDelivery =
    normalized === "professional" || normalized === "founder";
  return {
    tier: normalized,
    deliveryRemote: includesDelivery,
    deliveryHybrid: includesDelivery,
    founderDiscountPercent:
      normalized === "founder" ? DEFAULT_FOUNDER_DISCOUNT_PERCENT : null,
  };
}

export function contractPlanLabel(tier?: string | null): string {
  const normalized = normalizeContractTier(tier);
  if (!normalized) return "No contract";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function isContractIncludedDeliveryFeature(
  tier: string | null | undefined,
  featureKey: string,
): boolean {
  const inclusions = contractTierInclusions(tier);
  if (featureKey === "deliveryRemote") return inclusions.deliveryRemote;
  if (featureKey === "deliveryHybrid") return inclusions.deliveryHybrid;
  return false;
}
