import "server-only";

/**
 * Resolve a campaign stack release from HM assessmentSettings[slug].version
 * (semver) against catalogue availableReleases. Falls back to the definition's
 * active release when version is omitted.
 */
export function resolveCatalogueReleaseId(input: {
  slug: string;
  selectedVersion: string | null | undefined;
  fallbackReleaseId: string;
  availableReleases: ReadonlyArray<{
    releaseId: string;
    releaseVersion: string;
    status?: string;
  }>;
}): string {
  const version = input.selectedVersion?.trim();
  if (!version) {
    return input.fallbackReleaseId;
  }

  const match = input.availableReleases.find(
    (release) =>
      release.releaseVersion === version &&
      (release.status === undefined || release.status === "active"),
  );
  if (!match) {
    throw new Error(
      `Version "${version}" is not an active published release for "${input.slug}"`,
    );
  }
  return match.releaseId;
}

export function readAssessmentSettingVersion(
  assessmentSettings: Record<string, unknown> | null | undefined,
  slug: string,
): string | undefined {
  if (!assessmentSettings) return undefined;
  const entry = assessmentSettings[slug];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return undefined;
  }
  const version = (entry as { version?: unknown }).version;
  return typeof version === "string" ? version : undefined;
}
