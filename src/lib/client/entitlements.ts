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

export type ClientUpgradeRequestType =
  | "seat_increase"
  | "new_assessment"
  | "assessment_version";

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
    };

export type ClientUpgradeRequestRecord = {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  upgradeType: ClientUpgradeRequestType;
  payload: ClientUpgradeRequestPayload;
  billingStatus?: string;
  amountDuePence?: number | null;
  currency?: string;
  stripeCheckoutSessionId?: string | null;
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

export function buildUpgradeRequestSubject(payload: ClientUpgradeRequestPayload) {
  switch (payload.type) {
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
  const metadata = ticket.metadata;
  if (!metadata || metadata.requestKind !== "client_upgrade") return null;

  const upgradeType = metadata.upgradeType as ClientUpgradeRequestType | undefined;
  const payload = metadata.payload as ClientUpgradeRequestPayload | undefined;
  if (!upgradeType || !payload) return null;

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt,
    upgradeType,
    payload,
  };
}
