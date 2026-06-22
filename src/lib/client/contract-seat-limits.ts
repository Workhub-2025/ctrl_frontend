import { normalizeContractTierForLock } from "@/lib/billing/contract-pricing-lock";
import type { ContractTier } from "@/types/contract.types";

/** Mirrors platform-pricing defaults when catalogue pricing is unavailable. */
const TIER_DEFAULT_INCLUDED_SEATS: Record<ContractTier, number> = {
  essential: 1,
  professional: 3,
  founder: 3,
};

type PricingRecord = {
  contractTypePrices?: Record<string, { includedSeatCount?: number }>;
};

/**
 * Minimum HM seats included on the client's contract tier (platform-pricing).
 * Authoritative values come from GET /api/client/entitlements contract.minimumContractedSeats.
 */
export function resolveMinimumContractedSeats(
  contract: { tier?: string | null } | null | undefined,
  pricing?: PricingRecord | null,
): number {
  const tier = normalizeContractTierForLock(contract?.tier);
  const fromPricing = Number(pricing?.contractTypePrices?.[tier]?.includedSeatCount ?? 0);
  if (fromPricing > 0) {
    return fromPricing;
  }
  return TIER_DEFAULT_INCLUDED_SEATS[tier];
}
