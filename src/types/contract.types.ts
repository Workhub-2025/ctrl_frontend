export type ContractStatus = "active" | "soft_locked" | "pending_deletion";

export type ContractTier = "essential" | "professional" | "founder";

export interface ContractTierPricing {
  label: string;
  basePlatformYearlyPence: number;
  includedSeatCount: number;
  deliveryRemoteIncluded: boolean;
  deliveryHybridIncluded: boolean;
  futurePaidFeaturesIncludedDuringFirstYear: boolean;
  discountPercent: number;
}
