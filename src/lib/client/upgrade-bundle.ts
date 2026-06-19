import {
  CLIENT_DELIVERY_FEATURES,
  type ClientDeliveryFeatureKey,
  type ClientUpgradeBundleItem,
  type ClientUpgradeBundleLineItem,
} from "@/lib/client/entitlements";
export type { ClientUpgradeBundleItem, ClientUpgradeBundleLineItem };

export type ClientUpgradePricing = {
  currency?: string;
  seatOneOffPence?: number;
  seatMonthlyPence?: number;
  assessmentAddonPence?: number;
  versionUpgradePence?: number;
  featurePrices?: Record<string, number>;
};

export type ClientUpgradeDraft = {
  requestedSeats: number;
  deliveryFeatures: Record<ClientDeliveryFeatureKey, boolean>;
  addonAssessmentSlug: string | null;
  addonAssessmentLabel: string | null;
  addonNotes: string;
  customAddonName: string;
  notes: string;
};

export type ClientEntitlementAssessment = {
  slug: string;
  title: string;
  maxVersion: string;
  summary?: string | null;
  availableVersions?: Array<{ version: string; title: string; description: string | null }>;
  upgradeableVersions?: Array<{ version: string; title: string; description: string | null }>;
};

export function createEmptyUpgradeDraft(currentSeats: number): ClientUpgradeDraft {
  const baseline = Math.max(currentSeats, 1);
  return {
    requestedSeats: baseline,
    deliveryFeatures: {
      deliveryRemote: false,
      deliveryHybrid: false,
    },
    addonAssessmentSlug: null,
    addonAssessmentLabel: null,
    addonNotes: "",
    customAddonName: "",
    notes: "",
  };
}

function seatOneOffPrice(pricing: ClientUpgradePricing) {
  return pricing.seatOneOffPence ?? pricing.seatMonthlyPence ?? 0;
}

export function computePendingChanges(input: {
  draft: ClientUpgradeDraft;
  currentSeats: number;
  activeDeliveryFeatures: Record<ClientDeliveryFeatureKey, boolean>;
  assessments: ClientEntitlementAssessment[];
}) {
  const changes: string[] = [];

  if (input.draft.requestedSeats > input.currentSeats) {
    changes.push(`HM seats: ${input.currentSeats} → ${input.draft.requestedSeats}`);
  }

  for (const feature of CLIENT_DELIVERY_FEATURES) {
    const before = input.activeDeliveryFeatures[feature.key] === true;
    const after = before || input.draft.deliveryFeatures[feature.key] === true;
    if (!before && after) {
      changes.push(`Enable ${feature.label}`);
    }
  }

  if (input.draft.addonAssessmentSlug && input.draft.addonNotes.trim().length >= 20) {
    changes.push(
      `Add assessment: ${input.draft.addonAssessmentLabel ?? input.draft.customAddonName.trim()}`
    );
  }

  return changes;
}

export function buildUpgradeBundleItems(input: {
  draft: ClientUpgradeDraft;
  currentSeats: number;
  activeDeliveryFeatures: Record<ClientDeliveryFeatureKey, boolean>;
  assessments: ClientEntitlementAssessment[];
}): ClientUpgradeBundleItem[] {
  const items: ClientUpgradeBundleItem[] = [];

  if (input.draft.requestedSeats > input.currentSeats) {
    items.push({
      type: "seat_increase",
      currentSeats: input.currentSeats,
      requestedSeats: input.draft.requestedSeats,
    });
  }

  for (const feature of CLIENT_DELIVERY_FEATURES) {
    const alreadyActive = input.activeDeliveryFeatures[feature.key] === true;
    if (!alreadyActive && input.draft.deliveryFeatures[feature.key]) {
      items.push({
        type: "delivery_feature",
        featureKey: feature.key,
      });
    }
  }

  if (input.draft.addonAssessmentSlug && input.draft.addonNotes.trim().length >= 20) {
    items.push({
      type: "new_assessment",
      assessmentSlug: input.draft.addonAssessmentSlug,
      assessmentLabel:
        input.draft.addonAssessmentLabel ??
        input.draft.customAddonName.trim() ??
        input.draft.addonAssessmentSlug,
      notes: input.draft.addonNotes.trim(),
    });
  }

  return items;
}

export function computeLineItems(
  items: ClientUpgradeBundleItem[],
  pricing: ClientUpgradePricing,
  discountPercent?: number,
  isGrandfatherActive?: boolean
): ClientUpgradeBundleLineItem[] {
  const lineItems: ClientUpgradeBundleLineItem[] = [];

  for (const item of items) {
    switch (item.type) {
      case "seat_increase": {
        const additional = Math.max(0, item.requestedSeats - item.currentSeats);
        if (additional > 0) {
          let unitAmountPence = seatOneOffPrice(pricing);
          if (discountPercent) {
            unitAmountPence = Math.round(unitAmountPence * (1 - discountPercent / 100));
          }
          lineItems.push({
            label: `${additional} additional HM seat${additional === 1 ? "" : "s"}`,
            quantity: additional,
            unitAmountPence,
          });
        }
        break;
      }
      case "delivery_feature": {
        let unitAmountPence = isGrandfatherActive ? 0 : pricing.featurePrices?.[item.featureKey] ?? 0;
        if (!isGrandfatherActive && discountPercent) {
          unitAmountPence = Math.round(unitAmountPence * (1 - discountPercent / 100));
        }
        lineItems.push({
          label:
            CLIENT_DELIVERY_FEATURES.find((feature) => feature.key === item.featureKey)?.label ??
            item.featureKey,
          quantity: 1,
          unitAmountPence,
        });
        break;
      }
      case "new_assessment": {
        let unitAmountPence = isGrandfatherActive ? 0 : pricing.assessmentAddonPence ?? 0;
        if (!isGrandfatherActive && discountPercent) {
          unitAmountPence = Math.round(unitAmountPence * (1 - discountPercent / 100));
        }
        lineItems.push({
          label: `Add-on assessment: ${item.assessmentLabel}`,
          quantity: 1,
          unitAmountPence,
        });
        break;
      }
      default:
        break;
    }
  }

  return lineItems;
}

export function sumLineItems(lineItems: ClientUpgradeBundleLineItem[]) {
  return lineItems.reduce((total, item) => total + item.quantity * item.unitAmountPence, 0);
}
