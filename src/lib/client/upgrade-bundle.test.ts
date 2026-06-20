import { describe, expect, it } from "vitest";
import { computeLineItems, sumLineItems } from "@/lib/client/upgrade-bundle";
import type { ClientUpgradeBundleItem, ClientUpgradePricing } from "@/lib/client/upgrade-bundle";

const mockPricing: ClientUpgradePricing = {
  currency: "gbp",
  seatOneOffPence: 1000,
  assessmentAddonPence: 5000,
  featurePrices: {
    deliveryRemote: 3000,
    deliveryHybrid: 4000,
  },
};

describe("computeLineItems pricing and grandfathering", () => {
  it("computes regular line items without discounts", () => {
    const items: ClientUpgradeBundleItem[] = [
      { type: "seat_increase", currentSeats: 5, requestedSeats: 8 },
      { type: "delivery_feature", featureKey: "deliveryRemote" },
      { type: "new_assessment", assessmentSlug: "verbal", assessmentLabel: "Verbal Reasoning", notes: "Needed for campaign" },
    ];

    const lineItems = computeLineItems(items, mockPricing);
    expect(lineItems).toEqual([
      { label: "3 additional HM seats", quantity: 3, unitAmountPence: 1000, billingInterval: "month" },
      { label: "Remote delivery", quantity: 1, unitAmountPence: 3000, billingInterval: "once" },
      {
        label: "Add-on assessment: Verbal Reasoning",
        quantity: 1,
        unitAmountPence: 5000,
        billingInterval: "month",
      },
    ]);
    expect(sumLineItems(lineItems)).toBe(11000);
  });

  it("applies standard grandfather loyalty discount", () => {
    const items: ClientUpgradeBundleItem[] = [
      { type: "seat_increase", currentSeats: 5, requestedSeats: 6 },
      { type: "delivery_feature", featureKey: "deliveryRemote" },
    ];

    // Apply 30% discount
    const lineItems = computeLineItems(items, mockPricing, 30);
    expect(lineItems).toEqual([
      { label: "1 additional HM seat", quantity: 1, unitAmountPence: 700, billingInterval: "month" },
      { label: "Remote delivery", quantity: 1, unitAmountPence: 2100, billingInterval: "once" },
    ]);
    expect(sumLineItems(lineItems)).toBe(2800);
  });

  it("zeroes out features under active grandfathering but charges for seats with discount", () => {
    const items: ClientUpgradeBundleItem[] = [
      { type: "seat_increase", currentSeats: 5, requestedSeats: 7 },
      { type: "delivery_feature", featureKey: "deliveryRemote" },
      { type: "new_assessment", assessmentSlug: "verbal", assessmentLabel: "Verbal Reasoning", notes: "Needed" },
    ];

    // Active grandfathering + 35% discount
    const lineItems = computeLineItems(items, mockPricing, 35, true);
    expect(lineItems).toEqual([
      { label: "2 additional HM seats", quantity: 2, unitAmountPence: 650, billingInterval: "month" },
      { label: "Remote delivery", quantity: 1, unitAmountPence: 0, billingInterval: "once" },
      {
        label: "Add-on assessment: Verbal Reasoning",
        quantity: 1,
        unitAmountPence: 0,
        billingInterval: "month",
      },
    ]);
    expect(sumLineItems(lineItems)).toBe(1300);
  });
});
