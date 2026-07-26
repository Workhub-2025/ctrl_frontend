/**
 * Canonical FrontEnd assessment platform registry.
 *
 * When adding assessments 6–10, edit THIS file first, then follow
 * CTRL/04-Assessments/Assessment-Plugin-Contract.md for pack/module/report work.
 * Keep aligned with Platform/firebase-backend/src/assessment/platform-registry.ts.
 */

export const ASSESSMENT_ENTITLEMENT_TIERS = ["core", "premium"] as const;
export type AssessmentEntitlementTier =
  (typeof ASSESSMENT_ENTITLEMENT_TIERS)[number];

export type AssessmentPlatformEntry = Readonly<{
  slug: string;
  /** Short label for billing/entitlement UIs (e.g. SJA). */
  shortLabel: string;
  title: string;
  description: string;
  entitlementTier: AssessmentEntitlementTier;
  /** Preferred HM campaign version when multiple releases exist. */
  preferredReleaseVersion: string;
  timed: boolean;
}>;

/**
 * Product catalogue. Order is display-stable for version admin UIs.
 * Call simulation product line is dual-call 1.1.0 (not single-call 1.0.1).
 */
export const ASSESSMENT_PLATFORM_REGISTRY = [
  {
    slug: "situational-judgement",
    shortLabel: "SJA",
    title: "Situational judgement",
    description: "Situational judgement assessment content",
    entitlementTier: "core",
    preferredReleaseVersion: "1.0.1",
    timed: true,
  },
  {
    slug: "typing",
    shortLabel: "TA",
    title: "Typing assessment",
    description: "Typing assessment content",
    entitlementTier: "core",
    preferredReleaseVersion: "1.0.1",
    timed: true,
  },
  {
    slug: "prioritisation",
    shortLabel: "PJA",
    title: "Prioritisation",
    description: "Prioritisation assessment content",
    entitlementTier: "core",
    preferredReleaseVersion: "1.0.1",
    timed: true,
  },
  {
    slug: "call-simulation",
    shortLabel: "SCA",
    title: "Simulated call",
    description:
      "Practice plus two assessed calls — capture caller, system, intelligence and incident information.",
    entitlementTier: "core",
    preferredReleaseVersion: "1.1.0",
    timed: true,
  },
  {
    slug: "short-term-memory",
    shortLabel: "STM",
    title: "Short-term memory",
    description: "Short-term memory assessment content",
    entitlementTier: "core",
    preferredReleaseVersion: "1.0.1",
    timed: true,
  },
] as const satisfies readonly AssessmentPlatformEntry[];

export type PlatformAssessmentSlug =
  (typeof ASSESSMENT_PLATFORM_REGISTRY)[number]["slug"];

export const PLATFORM_ASSESSMENT_SLUGS: readonly PlatformAssessmentSlug[] =
  ASSESSMENT_PLATFORM_REGISTRY.map((entry) => entry.slug);

const bySlug = new Map<string, AssessmentPlatformEntry>(
  ASSESSMENT_PLATFORM_REGISTRY.map((entry) => [entry.slug, entry]),
);

export function getAssessmentPlatformEntry(
  slug: string,
): AssessmentPlatformEntry | undefined {
  return bySlug.get(slug);
}

export function isPlatformAssessmentSlug(
  value: string,
): value is PlatformAssessmentSlug {
  return bySlug.has(value);
}

export function assessmentEntitlementTier(
  slug: string,
): AssessmentEntitlementTier {
  return getAssessmentPlatformEntry(slug)?.entitlementTier ?? "premium";
}

export function preferredAssessmentReleaseVersion(slug: string): string {
  return (
    getAssessmentPlatformEntry(slug)?.preferredReleaseVersion ?? "1.0.1"
  );
}

export const CORE_PLATFORM_ASSESSMENTS: readonly AssessmentPlatformEntry[] =
  ASSESSMENT_PLATFORM_REGISTRY.filter(
    (entry) => entry.entitlementTier === "core",
  );

export const PREMIUM_PLATFORM_ASSESSMENTS: readonly AssessmentPlatformEntry[] =
  ASSESSMENT_PLATFORM_REGISTRY.filter(
    (entry) =>
      (entry.entitlementTier as AssessmentEntitlementTier) === "premium",
  );

export const CORE_PLATFORM_ASSESSMENT_SLUGS = CORE_PLATFORM_ASSESSMENTS.map(
  (entry) => entry.slug,
);

export const PREMIUM_PLATFORM_ASSESSMENT_SLUGS = PREMIUM_PLATFORM_ASSESSMENTS.map(
  (entry) => entry.slug,
);

export const TIMED_ASSESSMENT_SLUGS: ReadonlySet<string> = new Set(
  ASSESSMENT_PLATFORM_REGISTRY.filter((entry) => entry.timed).map(
    (entry) => entry.slug,
  ),
);
