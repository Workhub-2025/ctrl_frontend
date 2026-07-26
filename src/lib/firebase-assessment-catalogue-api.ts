import "server-only";

import type { createFirebaseDomainApi } from "@/lib/firebase-domain-api";

export const FIREBASE_ASSESSMENT_SLUGS = [
  "call-simulation",
  "prioritisation",
  "situational-judgement",
  "short-term-memory",
  "typing",
] as const;

export type FirebaseAssessmentSlug = (typeof FIREBASE_ASSESSMENT_SLUGS)[number];

export type FirebaseAssessmentRelease = Readonly<{
  id: string;
  moduleId: string;
  slug: string;
  releaseVersion: string;
  status: "active" | "retired";
  defaultThreshold: number;
  manifestHash: string;
  contentHash: string;
  rubricHash: string;
  mediaHash: string;
  releaseHash: string;
  publishedAt: string;
}>;

export type AssessmentVersionOption = Readonly<{
  version: string;
  title: string;
  description: string | null;
}>;

type DomainApi = ReturnType<typeof createFirebaseDomainApi>;

export function isFirebaseAssessmentSlug(
  value: string,
): value is FirebaseAssessmentSlug {
  return (FIREBASE_ASSESSMENT_SLUGS as readonly string[]).includes(value);
}

export function resolveRequestedAssessmentSlugs(
  slug: string | null | undefined,
): readonly FirebaseAssessmentSlug[] {
  const trimmed = slug?.trim();
  if (trimmed && isFirebaseAssessmentSlug(trimmed)) {
    return [trimmed];
  }
  return FIREBASE_ASSESSMENT_SLUGS;
}

export function groupReleasesAsVersionCatalog(
  releases: readonly FirebaseAssessmentRelease[],
  slugs: readonly string[] = FIREBASE_ASSESSMENT_SLUGS,
): Record<string, AssessmentVersionOption[]> {
  const allowed = new Set(slugs);
  const catalog: Record<string, AssessmentVersionOption[]> = Object.fromEntries(
    slugs.map((slug) => [slug, [] as AssessmentVersionOption[]]),
  );

  for (const release of releases) {
    if (!allowed.has(release.slug)) continue;
    const list = catalog[release.slug] ?? (catalog[release.slug] = []);
    list.push({
      version: release.releaseVersion,
      title: `v${release.releaseVersion}`,
      description: release.status === "retired" ? "Retired" : null,
    });
  }

  for (const slug of Object.keys(catalog)) {
    catalog[slug].sort((left, right) =>
      right.version.localeCompare(left.version, undefined, { numeric: true }),
    );
  }

  return catalog;
}

export async function listFirebaseAssessmentReleases(
  domainApi: DomainApi,
  firebaseSessionCookie: string,
): Promise<FirebaseAssessmentRelease[]> {
  const data = await domainApi.request<FirebaseAssessmentRelease[]>({
    path: "/v1/assessment-releases",
    firebaseSessionCookie,
  });
  return Array.isArray(data) ? data : [];
}

export async function loadFirebaseAssessmentVersionCatalog(
  domainApi: DomainApi,
  firebaseSessionCookie: string,
  slugs: readonly string[],
): Promise<Record<string, AssessmentVersionOption[]>> {
  const releases = await listFirebaseAssessmentReleases(
    domainApi,
    firebaseSessionCookie,
  );
  return groupReleasesAsVersionCatalog(releases, slugs);
}
