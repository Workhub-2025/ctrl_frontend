export const CLIENT_PLATFORM_FEATURES = [
  { key: "deliveryRemote", label: "Remote delivery", group: "Delivery" },
  { key: "deliveryHybrid", label: "Hybrid delivery", group: "Delivery" },
  { key: "advancedPja", label: "Advanced PJA scoring", group: "Prioritisation" },
  { key: "extremePja", label: "Extreme PJA scoring", group: "Prioritisation" },
  { key: "typingIntermediate", label: "Intermediate typing", group: "Typing" },
  { key: "typingExtreme", label: "Extreme typing", group: "Typing" },
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

/** @deprecated Use DEFAULT_PLATFORM_ASSESSMENTS */
export const CLIENT_ASSESSMENT_ENTITLEMENTS = DEFAULT_PLATFORM_ASSESSMENTS;

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

export function getEntitledAssessmentSlugs(features?: Record<string, unknown> | null) {
  return [...DEFAULT_PLATFORM_ASSESSMENT_SLUGS, ...getClientAdditionalAssessmentSlugs(features)];
}

export function resolveAssessmentLabel(slug: string, title?: string) {
  const known = DEFAULT_PLATFORM_ASSESSMENTS.find((assessment) => assessment.key === slug);
  return title || known?.title || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export type ClientInitiatedUpgradeType =
  | "seat_increase"
  | "new_assessment"
  | "assessment_version";

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
      type: "new_assessment";
      assessmentSlug: string;
      assessmentLabel: string;
      notes: string;
    }
  | {
      type: "assessment_version";
      assessmentSlug: string;
      assessmentLabel: string;
      currentVersion: string;
      requestedVersion: string;
      notes?: string;
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

export function getAssessmentVersionAccess(features?: Record<string, unknown> | null) {
  const access = features?.assessmentVersionAccess;
  return access && typeof access === "object" && !Array.isArray(access)
    ? (access as Partial<Record<ClientAssessmentSlug, string>>)
    : {};
}

export function getAssessmentMaxVersion(
  features: Record<string, unknown> | null | undefined,
  assessmentKey: string
) {
  const access = getAssessmentVersionAccess(features);
  if (typeof access[assessmentKey as ClientAssessmentSlug] === "string" && access[assessmentKey as ClientAssessmentSlug]) {
    return access[assessmentKey as ClientAssessmentSlug] as string;
  }
  if (features?.assessmentVersion150 === true) {
    return "1.5.0";
  }
  return "1.0.0";
}

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

export function buildUpgradeRequestSubject(payload: ClientUpgradeRequestPayload) {
  switch (payload.type) {
    case "contract_activation":
      return `Initial contract activation — ${payload.seatCount} hiring manager seats`;
    case "contract_extension":
      return `Contract renewal through ${payload.newEndDate}`;
    case "seat_increase":
      return `Upgrade request: ${payload.requestedSeats} hiring manager seats`;
    case "new_assessment":
      return `Upgrade request: add ${payload.assessmentLabel} assessment`;
    case "assessment_version":
      return `Upgrade request: ${payload.assessmentLabel} up to v${payload.requestedVersion}`;
    default:
      return "Platform upgrade request";
  }
}

export function buildUpgradeRequestDescription(
  payload: ClientUpgradeRequestPayload,
  clientName?: string
) {
  const header = clientName ? `Client: ${clientName}\n\n` : "";

  switch (payload.type) {
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
    case "new_assessment":
      return `${header}Request type: New assessment entitlement
Assessment: ${payload.assessmentLabel} (${payload.assessmentSlug})

Business case:
${payload.notes.trim()}`.trim();
    case "assessment_version":
      return `${header}Request type: Assessment version upgrade
Assessment: ${payload.assessmentLabel} (${payload.assessmentSlug})
Current max version: v${payload.currentVersion}
Requested max version: v${payload.requestedVersion}

${payload.notes?.trim() ? `Additional context:\n${payload.notes.trim()}` : ""}`.trim();
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
