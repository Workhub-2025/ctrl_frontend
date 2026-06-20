import { describe, expect, it } from "vitest";
import {
  BILLING_CYCLE_DAY_OF_MONTH,
  buildStripeSubscriptionCheckoutData,
  computeNextBillingCycleAnchorUnix,
  formatBillingCycleDayLabel,
} from "@/lib/stripe/subscription-checkout";

describe("subscription-checkout", () => {
  it("anchors billing to the 28th of each month", () => {
    expect(BILLING_CYCLE_DAY_OF_MONTH).toBe(28);
    expect(formatBillingCycleDayLabel(28)).toBe("28th");
  });

  it("uses the 28th this month when activation is before the 28th", () => {
    const anchor = computeNextBillingCycleAnchorUnix(28, new Date("2026-06-15T10:00:00.000Z"));
    expect(new Date(anchor * 1000).toISOString()).toBe("2026-06-28T12:00:00.000Z");
  });

  it("uses the 28th next month when activation is on or after the 28th", () => {
    const anchor = computeNextBillingCycleAnchorUnix(28, new Date("2026-06-28T10:00:00.000Z"));
    expect(new Date(anchor * 1000).toISOString()).toBe("2026-07-28T12:00:00.000Z");
  });

  it("builds checkout subscription_data with anchor + proration", () => {
    const data = buildStripeSubscriptionCheckoutData(new Date("2026-06-15T10:00:00.000Z"));
    expect(data.proration_behavior).toBe("create_prorations");
    expect(data.billing_cycle_anchor).toBe(
      computeNextBillingCycleAnchorUnix(28, new Date("2026-06-15T10:00:00.000Z"))
    );
  });
});
