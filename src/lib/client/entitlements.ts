export const CLIENT_DELIVERY_FEATURES = [
  { key: "deliveryRemote", label: "Remote delivery", group: "Delivery" },
  { key: "deliveryHybrid", label: "Hybrid delivery", group: "Delivery" },
] as const;

export const CLIENT_PLATFORM_FEATURES = [
  ...CLIENT_DELIVERY_FEATURES,
  { key: "assessmentRecovery", label: "Assessment recovery audit", group: "Recovery" },
] as const;

export const DEFAULT_PLATFORM_ASSESSMENT_SLUGS = [
  "situational-judgement",
  "typing",
  "prioritisation",
  "call-simulation",
] as const;

export type DefaultPlatformAssessmentSlug = (typeof DEFAULT_PLATFORM_ASSESSMENT_SLUGS)[number];

/** Core assessments included on every client platform by default. */
export const DEFAULT_PLATFORM_ASSESSMENTS = [
  {
    key: "situational-judgement",
    label: "SJA",
    title: "Situational judgement",
    description: "Situational judgement assessment content",
  },
  {
    key: "typing",
    label: "TA",
    title: "Typing assessment",
    description: "Typing assessment content",
  },
  {
    key: "prioritisation",
    label: "PJA",
    title: "Prioritisation",
    description: "Prioritisation assessment content",
  },
  {
    key: "call-simulation",
    label: "SCA",
    title: "Simulated call",
    description: "Simulated call assessment content",
  },
] as const;

export const DEFAULT_PLATFORM_ASSESSMENT_VERSION_ENTITLEMENTS = DEFAULT_PLATFORM_ASSESSMENTS.map(
  (assessment) => ({
    key: assessment.key,
    label: assessment.label,
    title: assessment.title,
    description: assessment.description,
  })
);

export type ClientAssessmentSlug = DefaultPlatformAssessmentSlug;

export type ClientCatalogueAssessment = {
  slug: string;
  title: string;
  summary?: string;
};

export function isDefaultPlatformAssessment(slug: string) {
  return DEFAULT_PLATFORM_ASSESSMENT_SLUGS.includes(slug as DefaultPlatformAssessmentSlug);
}

export function getClientAdditionalAssessmentSlugs(features?: Record<string, unknown> | null) {
  const raw = features?.additionalAssessmentSlugs;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export type EntitlementAwareAssessment = {
  slug?: string | null;
  entitlementTier?: string | null;
};

/** True when catalogue row is a premium add-on (`entitlementTier: premium`). */
export function isPremiumCatalogueTier(entitlementTier?: string | null): boolean {
  return entitlementTier === "premium";
}

/** Mirrors BackEnd `isAssessmentIncludedForClient()` — use with catalogue `entitlementTier`. */
export function isAssessmentEntitledForClient(
  assessment: EntitlementAwareAssessment,
  features?: Record<string, unknown> | null,
) {
  const slug = assessment.slug;
  if (!slug) return false;
  if (assessment.entitlementTier === "core" || isDefaultPlatformAssessment(slug)) {
    return true;
  }
  return getClientAdditionalAssessmentSlugs(features).includes(slug);
}

export type ClientDeliveryFeatureKey = (typeof CLIENT_DELIVERY_FEATURES)[number]["key"];

export type ClientUpgradeBundleItem =
  | {
      type: "seat_increase";
      currentSeats: number;
      requestedSeats: number;
    }
  | {
      type: "delivery_feature";
      featureKey: ClientDeliveryFeatureKey;
    }
  | {
      type: "new_assessment";
      assessmentSlug: string;
      assessmentLabel: string;
      notes?: string;
    };

export const CUSTOM_ASSESSMENT_VERSION = "custom";

export type ClientUpgradeBundleLineItem = {
  label: string;
  quantity: number;
  unitAmountPence: number;
  /** Monthly recurring DD charge vs one-time unlock fee */
  billingInterval?: "month" | "once";
  /** Stripe product metadata — maps subscription items for DD adjustments */
  ctrlLineKind?: "platform" | "hm_seats" | "assessment_addon" | "delivery_feature";
  assessmentSlug?: string;
};

export type ClientInitiatedUpgradeType =
  | "seat_increase"
  | "seat_decrease"
  | "new_assessment"
  | "delivery_feature"
  | "upgrade_bundle";

export type ClientUpgradeRequestType =
  | ClientInitiatedUpgradeType
  | "contract_extension"
  | "contract_activation";

export type ClientUpgradeRequestPayload =
  | {
      type: "seat_increase";
      currentSeats: number;
      requestedSeats: number;
      notes?: string;
    }
  | {
      type: "seat_decrease";
      currentSeats: number;
      requestedSeats: number;
      seatNumbersToRemove: number[];
      notes?: string;
    }
  | {
      type: "delivery_feature";
      featureKey: ClientDeliveryFeatureKey;
    }
  | {
      type: "new_assessment";
      assessmentSlug: string;
      assessmentLabel: string;
      notes?: string;
    }
  | {
      type: "upgrade_bundle";
      items: ClientUpgradeBundleItem[];
      notes?: string;
      lineItems?: ClientUpgradeBundleLineItem[];
    }
  | {
      type: "contract_extension";
      contractDocumentId: string;
      clientDocumentId: string;
      clientName: string;
      currentEndDate: string;
      newEndDate: string;
      seatCount: number;
    }
  | {
      type: "contract_activation";
      contractDocumentId: string;
      clientDocumentId: string;
      clientName: string;
      seatCount: number;
    };

export type ClientBillingRequestKind = "client_upgrade" | "contract_renewal" | "contract_activation";

export type ClientUpgradeRequestRecord = {
  id: string;
  /** Billing request reference (UPG-0001) */
  requestNumber: string;
  /** @deprecated Use requestNumber — kept for backward compatibility in UI */
  ticketNumber: string;
  subject: string;
  /** Workflow stage: requested | invoice_sent | paid | failed */
  status: string;
  priority: string;
  createdAt: string;
  requestKind: ClientBillingRequestKind;
  upgradeType: ClientUpgradeRequestType;
  payload: ClientUpgradeRequestPayload;
  billingStatus?: string;
  amountDuePence?: number | null;
  currency?: string;
  stripeCheckoutSessionId?: string | null;
  clientName?: string;
};

export function isPlatformFeatureEnabled(
  features: Record<string, unknown> | null | undefined,
  featureKey: (typeof CLIENT_PLATFORM_FEATURES)[number]["key"]
) {
  return features?.[featureKey] === true;
}

export function addOneYearToDate(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid contract end date");
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().split("T")[0];
}

function buildBundleSubject(items: ClientUpgradeBundleItem[]) {
  if (items.length === 1) {
    const item = items[0];
    switch (item.type) {
      case "seat_increase":
        return `Upgrade request: ${item.requestedSeats} hiring manager seats`;
      case "delivery_feature":
        return `Upgrade request: ${
          CLIENT_DELIVERY_FEATURES.find((feature) => feature.key === item.featureKey)?.label ??
          item.featureKey
        }`;
      case "new_assessment":
        return `Upgrade request: add ${item.assessmentLabel} assessment`;
      default:
        return "Platform upgrade request";
    }
  }
  return `Upgrade request: ${items.length} entitlement changes`;
}

export function buildUpgradeRequestSubject(payload: ClientUpgradeRequestPayload) {
  switch (payload.type) {
    case "contract_activation":
      return `Initial contract activation — ${payload.seatCount} hiring manager seats`;
    case "contract_extension":
      return `Contract renewal through ${payload.newEndDate}`;
    case "upgrade_bundle":
      return buildBundleSubject(payload.items);
    case "seat_increase":
      return `Upgrade request: ${payload.requestedSeats} hiring manager seats`;
    case "seat_decrease":
      return `Seat reduction request: ${payload.requestedSeats} hiring manager seats`;
    case "delivery_feature":
      return `Upgrade request: ${
        CLIENT_DELIVERY_FEATURES.find((feature) => feature.key === payload.featureKey)?.label ??
        payload.featureKey
      }`;
    case "new_assessment":
      return `Upgrade request: add ${payload.assessmentLabel} assessment`;
    default:
      return "Platform upgrade request";
  }
}

function describeBundleItem(item: ClientUpgradeBundleItem, index: number) {
  switch (item.type) {
    case "seat_increase":
      return `${index}. Hiring manager seats: ${item.currentSeats} -> ${item.requestedSeats} (+${Math.max(0, item.requestedSeats - item.currentSeats)})`;
    case "delivery_feature":
      return `${index}. Enable ${
        CLIENT_DELIVERY_FEATURES.find((feature) => feature.key === item.featureKey)?.label ??
        item.featureKey
      }`;
    case "new_assessment": {
      const businessCase = item.notes?.trim();
      return businessCase
        ? `${index}. Add assessment: ${item.assessmentLabel} (${item.assessmentSlug})\n   Business case: ${businessCase}`
        : `${index}. Add assessment: ${item.assessmentLabel} (${item.assessmentSlug})`;
    }
    default:
      return `${index}. Entitlement change`;
  }
}

export function buildUpgradeRequestDescription(
  payload: ClientUpgradeRequestPayload,
  clientName?: string
) {
  const header = clientName ? `Client: ${clientName}\n\n` : "";

  switch (payload.type) {
    case "upgrade_bundle":
      return `${header}Request type: Bundled platform upgrade\n\n${payload.items
        .map((item, index) => describeBundleItem(item, index + 1))
        .join("\n")}${payload.notes?.trim() ? `\n\nAdditional context:\n${payload.notes.trim()}` : ""}`.trim();
    case "delivery_feature":
      return `${header}Request type: Delivery feature
Feature: ${
        CLIENT_DELIVERY_FEATURES.find((feature) => feature.key === payload.featureKey)?.label ??
        payload.featureKey
      }`.trim();
    case "contract_activation":
      return `${header}Request type: Initial contract activation
Client: ${payload.clientName}
Seats on activation: ${payload.seatCount}

Contract term begins on payment and runs for one year from the activation date.`.trim();
    case "contract_extension":
      return `${header}Request type: Annual contract renewal
Client: ${payload.clientName}
Current contract ends: ${payload.currentEndDate}
Renewed contract ends: ${payload.newEndDate}
Seats on renewal: ${payload.seatCount}`.trim();
    case "seat_increase":
      return `${header}Request type: Hiring manager seat increase
Current contracted seats: ${payload.currentSeats}
Requested seats: ${payload.requestedSeats}
Additional seats requested: ${Math.max(0, payload.requestedSeats - payload.currentSeats)}

${payload.notes?.trim() ? `Additional context:\n${payload.notes.trim()}` : ""}`.trim();
    case "seat_decrease":
      return `${header}Request type: Hiring manager seat reduction
Current contracted seats: ${payload.currentSeats}
Requested seats: ${payload.requestedSeats}
Seats to remove: ${payload.seatNumbersToRemove.map((seat) => `Seat ${seat}`).join(", ")}

${payload.notes?.trim() ? `Additional context:\n${payload.notes.trim()}` : ""}`.trim();
    case "new_assessment": {
      const businessCase = payload.notes?.trim();
      const lines = [
        `${header}Request type: New assessment entitlement`,
        `Assessment: ${payload.assessmentLabel} (${payload.assessmentSlug})`,
      ];
      if (businessCase) {
        lines.push("", "Business case:", businessCase);
      }
      return lines.join("\n").trim();
    }
    default:
      return header.trim();
  }
}

export function parseUpgradeRequestFromTicket(ticket: {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}): ClientUpgradeRequestRecord | null {
  return parseBillingRequestFromTicket(ticket);
}

export function parseBillingRequestFromTicket(ticket: {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}): ClientUpgradeRequestRecord | null {
  const metadata = ticket.metadata;
  if (!metadata) return null;

  const requestKind = metadata.requestKind as ClientBillingRequestKind | undefined;
  if (requestKind !== "client_upgrade" && requestKind !== "contract_renewal" && requestKind !== "contract_activation") return null;

  const upgradeType = metadata.upgradeType as ClientUpgradeRequestType | undefined;
  const payload = metadata.payload as ClientUpgradeRequestPayload | undefined;
  if (!upgradeType || !payload) return null;

  return {
    id: ticket.id,
    requestNumber: ticket.ticketNumber,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt,
    requestKind,
    upgradeType,
    payload,
    billingStatus: "requested",
  };
}
