import {
  CLIENT_DELIVERY_FEATURES,
  type ClientDeliveryFeatureKey,
  type ClientUpgradeBundleItem,
  type ClientUpgradeBundleLineItem,
} from "@/lib/client/entitlements";

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
  assessmentVersions: Record<string, string>;
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
  return {
    requestedSeats: Math.max(currentSeats + 1, 2),
    deliveryFeatures: {
      deliveryRemote: false,
      deliveryHybrid: false,
    },
    assessmentVersions: {},
    addonAssessmentSlug: null,
    addonAssessmentLabel: null,
    addonNotes: "",
    customAddonName: "",
    notes: "",
  };
}

function compareVersions(a: string, b: string) {
  const left = a.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const right = b.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(left.length, right.length, 3);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
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
    changes.push(`HM seats: ${input.currentSeats} -> ${input.draft.requestedSeats}`);
  }

  for (const feature of CLIENT_DELIVERY_FEATURES) {
    const before = input.activeDeliveryFeatures[feature.key] === true;
    const after = before || input.draft.deliveryFeatures[feature.key] === true;
    if (!before && after) {
      changes.push(`Enable ${feature.label}`);
    }
  }

  for (const assessment of input.assessments) {
    const requested = input.draft.assessmentVersions[assessment.slug];
    if (!requested || requested === assessment.maxVersion) continue;
    if (compareVersions(requested, assessment.maxVersion) > 0) {
      changes.push(`${assessment.title}: up to v${assessment.maxVersion} -> up to v${requested}`);
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

  for (const assessment of input.assessments) {
    const requested = input.draft.assessmentVersions[assessment.slug];
    if (!requested || compareVersions(requested, assessment.maxVersion) <= 0) continue;
    items.push({
      type: "assessment_version",
      assessmentSlug: assessment.slug,
      assessmentLabel: assessment.title,
      currentVersion: assessment.maxVersion,
      requestedVersion: requested,
    });
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
  pricing: ClientUpgradePricing
): ClientUpgradeBundleLineItem[] {
  const lineItems: ClientUpgradeBundleLineItem[] = [];

  for (const item of items) {
    switch (item.type) {
      case "seat_increase": {
        const additional = Math.max(0, item.requestedSeats - item.currentSeats);
        if (additional > 0) {
          lineItems.push({
            label: `${additional} additional HM seat${additional === 1 ? "" : "s"}`,
            quantity: additional,
            unitAmountPence: seatOneOffPrice(pricing),
          });
        }
        break;
      }
      case "delivery_feature":
        lineItems.push({
          label:
            CLIENT_DELIVERY_FEATURES.find((feature) => feature.key === item.featureKey)?.label ??
            item.featureKey,
          quantity: 1,
          unitAmountPence: pricing.featurePrices?.[item.featureKey] ?? 0,
        });
        break;
      case "new_assessment":
        lineItems.push({
          label: `Add-on assessment: ${item.assessmentLabel}`,
          quantity: 1,
          unitAmountPence: pricing.assessmentAddonPence ?? 0,
        });
        break;
      case "assessment_version":
        lineItems.push({
          label: `${item.assessmentLabel} version upgrade (up to v${item.requestedVersion})`,
          quantity: 1,
          unitAmountPence: pricing.versionUpgradePence ?? 0,
        });
        break;
      default:
        break;
    }
  }

  return lineItems;
}

export function sumLineItems(lineItems: ClientUpgradeBundleLineItem[]) {
  return lineItems.reduce((total, item) => total + item.quantity * item.unitAmountPence, 0);
}
