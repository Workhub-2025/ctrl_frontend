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

describe("computeLineItems pricing and founder discounts", () => {
  it("computes regular line items without discounts", () => {
    const items: ClientUpgradeBundleItem[] = [
      { type: "seat_increase", currentSeats: 5, requestedSeats: 8 },
      { type: "delivery_feature", featureKey: "deliveryRemote" },
      { type: "new_assessment", assessmentSlug: "verbal", assessmentLabel: "Verbal Reasoning", notes: "Needed for campaign" },
    ];

    const lineItems = computeLineItems(items, mockPricing);
    expect(lineItems).toEqual([
      {
        label: "3 additional HM seats",
        quantity: 3,
        unitAmountPence: 1000,
        billingInterval: "month",
        ctrlLineKind: "hm_seats",
      },
      {
        label: "Remote delivery",
        quantity: 1,
        unitAmountPence: 3000,
        billingInterval: "once",
        ctrlLineKind: "delivery_feature",
      },
      {
        label: "Add-on assessment: Verbal Reasoning",
        quantity: 1,
        unitAmountPence: 5000,
        billingInterval: "month",
        ctrlLineKind: "assessment_addon",
        assessmentSlug: "verbal",
      },
    ]);
    expect(sumLineItems(lineItems)).toBe(11000);
  });

  it("applies founder loyalty discount", () => {
    const items: ClientUpgradeBundleItem[] = [
      { type: "seat_increase", currentSeats: 5, requestedSeats: 6 },
      { type: "delivery_feature", featureKey: "deliveryRemote" },
    ];

    // Apply 30% discount
    const lineItems = computeLineItems(items, mockPricing, 30);
    expect(lineItems).toEqual([
      {
        label: "1 additional HM seat",
        quantity: 1,
        unitAmountPence: 700,
        billingInterval: "month",
        ctrlLineKind: "hm_seats",
      },
      {
        label: "Remote delivery",
        quantity: 1,
        unitAmountPence: 2100,
        billingInterval: "once",
        ctrlLineKind: "delivery_feature",
      },
    ]);
    expect(sumLineItems(lineItems)).toBe(2800);
  });

  it("applies the founder discount to seats, delivery features, and assessments", () => {
    const items: ClientUpgradeBundleItem[] = [
      { type: "seat_increase", currentSeats: 5, requestedSeats: 7 },
      { type: "delivery_feature", featureKey: "deliveryRemote" },
      { type: "new_assessment", assessmentSlug: "verbal", assessmentLabel: "Verbal Reasoning", notes: "Needed" },
    ];

    const lineItems = computeLineItems(items, mockPricing, 33);
    expect(lineItems).toEqual([
      {
        label: "2 additional HM seats",
        quantity: 2,
        unitAmountPence: 670,
        billingInterval: "month",
        ctrlLineKind: "hm_seats",
      },
      {
        label: "Remote delivery",
        quantity: 1,
        unitAmountPence: 2010,
        billingInterval: "once",
        ctrlLineKind: "delivery_feature",
      },
      {
        label: "Add-on assessment: Verbal Reasoning",
        quantity: 1,
        unitAmountPence: 3350,
        billingInterval: "month",
        ctrlLineKind: "assessment_addon",
        assessmentSlug: "verbal",
      },
    ]);
    expect(sumLineItems(lineItems)).toBe(6700);
  });
});
