import { describe, expect, it } from "vitest";
import { payloadUsesSubscriptionCheckout } from "@/lib/stripe/billing-recurring";

describe("payloadUsesSubscriptionCheckout", () => {
  it("uses subscription checkout only for contract activation/extension", () => {
    expect(
      payloadUsesSubscriptionCheckout({
        type: "contract_activation",
        seatCount: 2,
        notes: "activate",
      } as never)
    ).toBe(true);

    expect(
      payloadUsesSubscriptionCheckout({
        type: "contract_extension",
        newEndDate: "2027-07-26",
      } as never)
    ).toBe(true);
  });

  it("uses one-off payment checkout for seats, assessments, and delivery", () => {
    expect(
      payloadUsesSubscriptionCheckout({
        type: "seat_increase",
        currentSeats: 2,
        requestedSeats: 4,
      })
    ).toBe(false);

    expect(
      payloadUsesSubscriptionCheckout({
        type: "new_assessment",
        assessmentSlug: "short-term-memory",
        assessmentLabel: "Short-Term Memory",
      })
    ).toBe(false);

    expect(
      payloadUsesSubscriptionCheckout({
        type: "delivery_feature",
        featureKey: "deliveryRemote",
      })
    ).toBe(false);

    expect(
      payloadUsesSubscriptionCheckout({
        type: "upgrade_bundle",
        items: [
          { type: "delivery_feature", featureKey: "deliveryRemote" },
          {
            type: "new_assessment",
            assessmentSlug: "short-term-memory",
            assessmentLabel: "Short-Term Memory",
          },
        ],
      })
    ).toBe(false);
  });
});
