import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";
import { getStrapiClient } from "@/lib/strapi";

type PublicContractTierPricing = {
  label?: string;
  includedSeatCount?: number;
  deliveryRemoteIncluded?: boolean;
  deliveryHybridIncluded?: boolean;
  futurePaidFeaturesIncludedDuringFirstYear?: boolean;
  discountPercent?: number;
};

type PublicContractOption = {
  tier: "essential" | "professional" | "founder";
  label: string;
  includedSeats: number;
  deliveryModes: string[];
  includesCoreAssessments: boolean;
  includesPaidFutureFeaturesDuringFirstYear?: boolean;
  discountPercent?: number;
};

export async function GET() {
  try {
    const client = getStrapiClient();
    const response = await client.fetch("/platform-pricing");
    if (!response.ok) {
      throw new Error(`Failed to fetch platform pricing from Strapi: ${response.statusText}`);
    }

    const body = await response.json().catch(() => ({}));
    const pricing = body.data || {};

    const defaultFounderDiscountPercent = pricing.defaultGrandfatherDiscountPercent ?? 33;
    const contractTypePrices =
      pricing.contractTypePrices && typeof pricing.contractTypePrices === "object"
        ? (pricing.contractTypePrices as Record<string, PublicContractTierPricing>)
        : ({} as Record<string, PublicContractTierPricing>);

    const options: PublicContractOption[] = [
      {
        tier: "essential" as const,
        label: contractTypePrices.essential?.label ?? "Essential",
        includedSeats: contractTypePrices.essential?.includedSeatCount ?? 1,
        deliveryModes: ["in_person"],
        includesCoreAssessments: true,
      },
      {
        tier: "professional" as const,
        label: contractTypePrices.professional?.label ?? "Professional",
        includedSeats: contractTypePrices.professional?.includedSeatCount ?? 3,
        deliveryModes: [
          "in_person",
          ...(contractTypePrices.professional?.deliveryRemoteIncluded ? ["remote"] : []),
          ...(contractTypePrices.professional?.deliveryHybridIncluded ? ["hybrid"] : []),
        ],
        includesCoreAssessments: true,
      },
      {
        tier: "founder" as const,
        label: contractTypePrices.founder?.label ?? "Founder",
        includedSeats: contractTypePrices.founder?.includedSeatCount ?? 3,
        deliveryModes: [
          "in_person",
          ...(contractTypePrices.founder?.deliveryRemoteIncluded ? ["remote"] : []),
          ...(contractTypePrices.founder?.deliveryHybridIncluded ? ["hybrid"] : []),
        ],
        includesCoreAssessments: true,
        includesPaidFutureFeaturesDuringFirstYear:
          contractTypePrices.founder?.futurePaidFeaturesIncludedDuringFirstYear ?? true,
        discountPercent: contractTypePrices.founder?.discountPercent ?? defaultFounderDiscountPercent,
      },
    ];

    return NextResponse.json({
      data: {
        grandfatherAvailable: true,
        options,
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Contract options could not be loaded";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
