/**
 * Contract term platform price lock — mirrors BackEnd contract-pricing-lock.ts
 * for Stripe checkout amount resolution in Next.js routes.
 */

export type NormalizedContractTier = "essential" | "professional" | "founder";

const TIER_LABELS: Record<NormalizedContractTier, string> = {
  essential: "Essential",
  professional: "Professional",
  founder: "Founder",
};

export function getContractTierLabel(tier?: string | null): string {
  if (!tier) return "No contract";
  return TIER_LABELS[normalizeContractTierForLock(tier)];
}

const CANONICAL_TIERS: NormalizedContractTier[] = ["essential", "professional", "founder"];

export function normalizeContractTierForLock(tier?: string | null): NormalizedContractTier {
  if (tier && CANONICAL_TIERS.includes(tier as NormalizedContractTier)) {
    return tier as NormalizedContractTier;
  }
  return "professional";
}

export function addOneDayToDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().split("T")[0];
}

export function resolveCatalogueAnnualPlatformPence(
  tier: NormalizedContractTier,
  pricing?: {
    contractTypePrices?: Record<string, { basePlatformYearlyPence?: number }>;
    basePlatformYearlyPence?: number;
  }
): number | null {
  const contractTypePrices = pricing?.contractTypePrices ?? {};
  const tierPrice = contractTypePrices[tier]?.basePlatformYearlyPence;
  if (typeof tierPrice === "number" && tierPrice > 0) {
    return tierPrice;
  }
  if (typeof pricing?.basePlatformYearlyPence === "number" && pricing.basePlatformYearlyPence > 0) {
    return pricing.basePlatformYearlyPence;
  }
  return null;
}

export function isPricingLockActive(
  pricingLockedUntil?: string | null,
  asOfDate?: string
): boolean {
  if (!pricingLockedUntil?.trim()) return false;
  const today = asOfDate ?? new Date().toISOString().split("T")[0];
  return today <= pricingLockedUntil.trim();
}

export function resolveEffectiveAnnualPlatformPence(
  contract: {
    tier?: string | null;
    lockedAnnualPlatformPence?: number | null;
    pricingLockedUntil?: string | null;
  } | null
    | undefined,
  pricing?: {
    contractTypePrices?: Record<string, { basePlatformYearlyPence?: number }>;
    basePlatformYearlyPence?: number;
  },
  asOfDate?: string
): number | null {
  const tier = normalizeContractTierForLock(contract?.tier);
  if (
    contract &&
    isPricingLockActive(contract.pricingLockedUntil, asOfDate) &&
    typeof contract.lockedAnnualPlatformPence === "number" &&
    contract.lockedAnnualPlatformPence > 0
  ) {
    return contract.lockedAnnualPlatformPence;
  }
  return resolveCatalogueAnnualPlatformPence(tier, pricing);
}
