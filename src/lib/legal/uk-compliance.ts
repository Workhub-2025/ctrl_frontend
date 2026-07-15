/** UK legal configuration used by public notices and production readiness checks. */

function parseRetentionMonths(value: string | undefined): number | null {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 120 ? parsed : null;
}

const configuredRetentionMonths = parseRetentionMonths(
  process.env.NEXT_PUBLIC_DEFAULT_ASSESSMENT_DATA_RETENTION_MONTHS,
);

export const UK_LEGAL = {
  tradingName: "CTRL Assessment",
  legalEntityName: "CTRL Assess Ltd",
  platformDescription: "operational assessment platform for emergency services and high-trust hiring",
  websiteUrl: "https://ctrl-assess.co.uk",
  privacyEmail: "privacy@ctrl-assess.co.uk",
  supportEmail: "support@ctrl-assess.co.uk",
  legalEmail: "legal@ctrl-assess.co.uk",
  privacyLeadEmail: "privacy@ctrl-assess.co.uk",
  companyNumber: process.env.NEXT_PUBLIC_CTRL_COMPANY_NUMBER?.trim() ?? "",
  icoRegistrationNumber: process.env.NEXT_PUBLIC_CTRL_ICO_NUMBER?.trim() ?? "",
  /** UK ICO data protection fee registration (assign to company officer) */
  icoRegistrationUrl: "https://ico.org.uk/for-organisations/data-protection-fee/",
  privacyPolicyVersion: "2.1",
  termsVersion: "2.1",
  cookiePolicyVersion: "1.1",
  equalityMonitoringNoticeVersion: "1.1",
  dpaInformationVersion: "1.1",
  /** ISO date string — update when policy text changes */
  lastUpdated: "2026-07-14",
  registeredAddress: process.env.NEXT_PUBLIC_CTRL_REGISTERED_OFFICE?.trim() ?? "",
  registrationJurisdiction:
    process.env.NEXT_PUBLIC_CTRL_REGISTRATION_JURISDICTION?.trim() ?? "England and Wales",
  /** Development fallback only. Production readiness rejects a missing configured value. */
  assessmentDataRetentionMonths: configuredRetentionMonths ?? 12,
  equalityMonitoringRetentionMonths: 12,
  dsarResponseDays: 30,
  erasureProcessingDays: 30,
} as const;

/**
 * Deployment-agnostic processor categories. Replace vendor names on /sub-processors
 * when hosting changes (e.g. Vercel → AWS, self-hosted Strapi → Strapi Cloud).
 */
export type SubProcessorEntry = {
  category: string;
  purpose: string;
  /** Current or planned vendor — update when infrastructure changes */
  currentVendor: string;
  location: string;
  safeguard: string;
  verified: boolean;
};

export const UK_SUB_PROCESSOR_CATEGORIES: SubProcessorEntry[] = [
  {
    category: "Application hosting (FrontEnd)",
    purpose: "Next.js BFF, public site, and authenticated portals",
    currentVendor: process.env.NEXT_PUBLIC_CTRL_FRONTEND_HOST?.trim() || "Not configured",
    location: process.env.NEXT_PUBLIC_CTRL_FRONTEND_HOST_LOCATION?.trim() || "Not configured",
    safeguard: "Hosting provider DPA; UK IDTA / SCCs if processing outside the UK",
    verified: Boolean(
      process.env.NEXT_PUBLIC_CTRL_FRONTEND_HOST?.trim()
      && process.env.NEXT_PUBLIC_CTRL_FRONTEND_HOST_LOCATION?.trim(),
    ),
  },
  {
    category: "API & database (BackEnd)",
    purpose: "Strapi application server and PostgreSQL",
    currentVendor: process.env.NEXT_PUBLIC_CTRL_BACKEND_HOST?.trim() || "Not configured",
    location: process.env.NEXT_PUBLIC_CTRL_BACKEND_HOST_LOCATION?.trim() || "Not configured",
    safeguard: "Provider DPA; encryption at rest and in transit",
    verified: Boolean(
      process.env.NEXT_PUBLIC_CTRL_BACKEND_HOST?.trim()
      && process.env.NEXT_PUBLIC_CTRL_BACKEND_HOST_LOCATION?.trim(),
    ),
  },
  {
    category: "Payments",
    purpose: "Subscription billing and checkout",
    currentVendor: "Stripe Payments Europe Ltd",
    location: "UK, EEA and other locations described in Stripe's service terms",
    safeguard: "Stripe DPA; UK adequacy / IDTA as applicable",
    verified: true,
  },
  {
    category: "Security & rate limiting",
    purpose: "Distributed login lockout, API rate limits, audit event persistence",
    currentVendor: "Upstash Redis (EU region)",
    location: process.env.NEXT_PUBLIC_CTRL_UPSTASH_LOCATION?.trim() || "Not configured",
    safeguard: "UK IDTA / SCCs where applicable",
    verified: Boolean(process.env.NEXT_PUBLIC_CTRL_UPSTASH_LOCATION?.trim()),
  },
  {
    category: "Transactional email",
    purpose: "Invites, tickets, billing, and compliance notifications",
    currentVendor: process.env.NEXT_PUBLIC_CTRL_EMAIL_PROVIDER?.trim() || "Not configured",
    location: process.env.NEXT_PUBLIC_CTRL_EMAIL_PROVIDER_LOCATION?.trim() || "Not configured",
    safeguard: "Provider DPA; minimise personal data in message bodies",
    verified: Boolean(
      process.env.NEXT_PUBLIC_CTRL_EMAIL_PROVIDER?.trim()
      && process.env.NEXT_PUBLIC_CTRL_EMAIL_PROVIDER_LOCATION?.trim(),
    ),
  },
  {
    category: "AI-assisted call simulation scoring",
    purpose: "Scores structured candidate call-simulation responses against the configured rubric",
    currentVendor: process.env.NEXT_PUBLIC_CTRL_AI_PROVIDER?.trim() || "Not configured",
    location: process.env.NEXT_PUBLIC_CTRL_AI_PROVIDER_LOCATION?.trim() || "Not configured",
    safeguard: "Provider data processing terms; data minimisation; UK transfer safeguard where required",
    verified: Boolean(
      process.env.NEXT_PUBLIC_CTRL_AI_PROVIDER?.trim()
      && process.env.NEXT_PUBLIC_CTRL_AI_PROVIDER_LOCATION?.trim(),
    ),
  },
];

export const UK_LEGAL_FOOTER_LINKS = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "Terms", href: "/terms-conditions" },
  { label: "Sub-processors", href: "/sub-processors" },
  { label: "Accessibility", href: "/accessibility-statement" },
  { label: "DPA Information", href: "/data-processing-agreement" },
] as const;

export function getUkComplianceConfigurationIssues(): string[] {
  const issues: string[] = [];

  if (!UK_LEGAL.companyNumber) issues.push("NEXT_PUBLIC_CTRL_COMPANY_NUMBER is required");
  if (!UK_LEGAL.registeredAddress) {
    issues.push("NEXT_PUBLIC_CTRL_REGISTERED_OFFICE is required");
  }
  if (!UK_LEGAL.icoRegistrationNumber) issues.push("NEXT_PUBLIC_CTRL_ICO_NUMBER is required");
  if (!configuredRetentionMonths) {
    issues.push("NEXT_PUBLIC_DEFAULT_ASSESSMENT_DATA_RETENTION_MONTHS must be 1-120");
  }

  for (const processor of UK_SUB_PROCESSOR_CATEGORIES) {
    if (!processor.verified) {
      issues.push(`${processor.category} vendor and processing location must be configured`);
    }
  }

  return issues;
}

export function formatUkDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Europe/London",
  });
}
