import { describe, expect, it } from "vitest";
import { payloadUsesSubscriptionCheckout } from "@/lib/stripe/billing-recurring";

describe("payloadUsesSubscriptionCheckout", () => {
  it("uses subscription checkout for seat increases and add-on assessments", () => {
    expect(
      payloadUsesSubscriptionCheckout({
        type: "seat_increase",
        currentSeats: 2,
        requestedSeats: 4,
      })
    ).toBe(true);

    expect(
      payloadUsesSubscriptionCheckout({
        type: "new_assessment",
        assessmentSlug: "short-term-memory",
        assessmentLabel: "Short-Term Memory",
      })
    ).toBe(true);
  });

  it("uses subscription checkout when a bundle includes recurring items", () => {
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
    ).toBe(true);
  });

  it("keeps one-off delivery features on payment checkout", () => {
    expect(
      payloadUsesSubscriptionCheckout({
        type: "delivery_feature",
        featureKey: "deliveryRemote",
      })
    ).toBe(false);
  });
});
