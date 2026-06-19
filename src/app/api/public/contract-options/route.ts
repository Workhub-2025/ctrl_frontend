import { NextResponse } from "next/server";
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
  tier: "minimum" | "professional" | "grandfather";
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

    const grandfatherOfferExpiresAt = pricing.grandfatherOfferExpiresAt || null;
    const defaultGrandfatherDiscountPercent = pricing.defaultGrandfatherDiscountPercent ?? 30;
    const contractTypePrices =
      pricing.contractTypePrices && typeof pricing.contractTypePrices === "object"
        ? (pricing.contractTypePrices as Record<string, PublicContractTierPricing>)
        : ({} as Record<string, PublicContractTierPricing>);

    let grandfatherAvailable = false;
    if (grandfatherOfferExpiresAt) {
      const today = new Date().toISOString().split("T")[0];
      grandfatherAvailable = today <= grandfatherOfferExpiresAt;
    } else {
      grandfatherAvailable = true;
    }

    const options: PublicContractOption[] = [
      {
        tier: "minimum" as const,
        label: contractTypePrices.minimum?.label ?? "Minimum",
        includedSeats: contractTypePrices.minimum?.includedSeatCount ?? 1,
        deliveryModes: ["in_person"],
        includesCoreAssessments: true,
      },
      {
        tier: "professional" as const,
        label: contractTypePrices.professional?.label ?? "Professional",
        includedSeats: contractTypePrices.professional?.includedSeatCount ?? 3,
        deliveryModes: ["in_person"],
        includesCoreAssessments: true,
      },
    ];

    if (grandfatherAvailable) {
      options.push({
        tier: "grandfather" as const,
        label: contractTypePrices.grandfather?.label ?? "Grandfather",
        includedSeats: contractTypePrices.grandfather?.includedSeatCount ?? 3,
        deliveryModes: [
          "in_person",
          ...(contractTypePrices.grandfather?.deliveryRemoteIncluded ? ["remote"] : []),
          ...(contractTypePrices.grandfather?.deliveryHybridIncluded ? ["hybrid"] : []),
        ],
        includesCoreAssessments: true,
        includesPaidFutureFeaturesDuringFirstYear:
          contractTypePrices.grandfather?.futurePaidFeaturesIncludedDuringFirstYear ?? true,
        discountPercent: contractTypePrices.grandfather?.discountPercent ?? defaultGrandfatherDiscountPercent,
      });
    }

    return NextResponse.json({
      data: {
        grandfatherAvailable,
        grandfatherOfferExpiresAt,
        options,
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Contract options could not be loaded";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
