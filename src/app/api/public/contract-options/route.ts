import { NextResponse } from "next/server";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { getStrapiClient } from "@/lib/strapi";

type PublicContractTierPricing = {
  label?: string;
  includedSeatCount?: number;
  deliveryRemoteIncluded?: boolean;
  deliveryHybridIncluded?: boolean;
};

type PublicContractOption = {
  tier: "essential" | "professional" | "founder";
  label: string;
  includedSeats: number;
  deliveryModes: string[];
  includesCoreAssessments: boolean;
  discountPercent?: number;
};

export async function GET(request: Request) {
  const ipAddress = extractClientIp(request);
  const rateLimit = await applyRateLimit({
    key: `public:contract-options:${ipAddress}`,
    limit: 60,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds ?? 60) } }
    );
  }

  try {
    const client = getStrapiClient();
    const response = await client.fetch("/platform-pricing");
    if (!response.ok) {
      throw new Error(`Failed to fetch platform pricing from Strapi: ${response.statusText}`);
    }

    const body = await response.json().catch(() => ({}));
    const pricing = body.data || {};

    const defaultFounderDiscountPercent = pricing.defaultFounderDiscountPercent ?? 33;
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
        discountPercent: defaultFounderDiscountPercent,
      },
    ];

    const founderOfferExpiresAt = pricing.founderOfferExpiresAt
      ? String(pricing.founderOfferExpiresAt)
      : null;

    return NextResponse.json({
      data: {
        founderAvailable: !founderOfferExpiresAt || founderOfferExpiresAt >= new Date().toISOString().split("T")[0],
        founderOfferExpiresAt,
        options,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Contract options could not be loaded";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
