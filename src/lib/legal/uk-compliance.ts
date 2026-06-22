/**
 * UK legal / compliance constants — single source of truth for public legal copy.
 * Update PRIVACY_POLICY_VERSION and LAST_UPDATED when legal text changes materially.
 */

export const UK_LEGAL = {
  tradingName: "CTRL Assessment",
  legalEntityName: "CTRL Assess Ltd",
  platformDescription: "operational assessment platform for emergency services and high-trust hiring",
  websiteUrl: "https://ctrl-assess.co.uk",
  privacyEmail: "privacy@ctrl-assess.co.uk",
  supportEmail: "support@ctrl-assess.co.uk",
  legalEmail: "legal@ctrl-assess.co.uk",
  dpoEmail: "privacy@ctrl-assess.co.uk",
  /** Replace with ICO registration number once registered — leave empty until confirmed */
  icoRegistrationNumber: "" as string,
  /** UK ICO data protection fee registration (assign to company officer) */
  icoRegistrationUrl: "https://ico.org.uk/for-organisations/data-protection-fee/",
  privacyPolicyVersion: "2.0",
  termsVersion: "2.0",
  /** ISO date string — update when policy text changes */
  lastUpdated: "2026-06-22",
  registeredAddress: "United Kingdom",
  assessmentDataRetentionYears: 7,
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
};

export const UK_SUB_PROCESSOR_CATEGORIES: SubProcessorEntry[] = [
  {
    category: "Application hosting (FrontEnd)",
    purpose: "Next.js BFF, public site, and authenticated portals",
    currentVendor: "Vercel (under review — may move to AWS or Cloudflare)",
    location: "UK/EU region — confirm in hosting dashboard before procurement",
    safeguard: "Hosting provider DPA; UK IDTA / SCCs if processing outside the UK",
  },
  {
    category: "API & database (BackEnd)",
    purpose: "Strapi application server and PostgreSQL",
    currentVendor: "Managed container host (under review — Strapi Cloud or AWS RDS planned)",
    location: "UK/EU — pin region in Strapi Cloud / AWS before go-live",
    safeguard: "Provider DPA; encryption at rest and in transit",
  },
  {
    category: "Payments",
    purpose: "Subscription billing and checkout",
    currentVendor: "Stripe Payments Europe Ltd",
    location: "UK / EEA",
    safeguard: "Stripe DPA; UK adequacy / IDTA as applicable",
  },
  {
    category: "Security & rate limiting",
    purpose: "Distributed login lockout, API rate limits, audit event persistence",
    currentVendor: "Upstash Redis (EU region)",
    location: "EU — confirm UPSTASH region in env",
    safeguard: "UK IDTA / SCCs where applicable",
  },
  {
    category: "Transactional email",
    purpose: "Invites, tickets, billing, and compliance notifications",
    currentVendor: "SMTP provider (per SMTP_HOST)",
    location: "Per provider configuration",
    safeguard: "Provider DPA; minimise personal data in message bodies",
  },
];

export const UK_LEGAL_FOOTER_LINKS = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms-conditions" },
  { label: "Sub-processors", href: "/sub-processors" },
  { label: "Accessibility", href: "/accessibility-statement" },
  { label: "DPA Summary", href: "/data-processing-agreement" },
] as const;

export function formatUkDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Europe/London",
  });
}
