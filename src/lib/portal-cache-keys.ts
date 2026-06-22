import "server-only";

import { PLATFORM_ASSESSMENT_SLUGS } from "@/lib/assessment-slug";
import { portalServerCacheDel, portalServerCacheDelMany } from "@/lib/portal-server-cache";

/** Global active catalogue rows — entitlement filter applied after read. */
export const PORTAL_CATALOGUE_CACHE_KEY = "catalogue:assessments:active:v1";

export function portalAssessmentVersionCacheKey(slug: string) {
  return `catalogue:assessment-versions:${slug}`;
}

/** Tenant-scoped HM entitlement flags — bust when admin updates client.features. */
export function portalClientFeaturesClientCacheKey(clientDocumentId: string) {
  return `client-features:client:${clientDocumentId}`;
}

export function portalClientTenantCacheKey(sub: string) {
  return `client-tenant:user:${sub}`;
}

export function portalHmOverviewCacheKey(sub: string) {
  return `hm:overview:user:${sub}`;
}

export function portalClientDashboardCacheKey(sub: string) {
  return `client:dashboard:user:${sub}`;
}

export function portalClientOverviewCacheKey(sub: string) {
  return `client:overview:user:${sub}`;
}

export function portalClientEntitlementsCacheKey(sub: string) {
  return `client:entitlements:user:${sub}`;
}

/** Global admin aggregates — bust on client/billing mutations. */
export const PORTAL_ADMIN_OVERVIEW_CACHE_KEY = "admin:overview:v1";
export const PORTAL_ADMIN_ANALYTICS_CACHE_KEY = "admin:analytics:v1";

export function portalHmReportCacheKey(sub: string, candidateSessionId: string) {
  return `hm:report:${sub}:${candidateSessionId}`;
}

export function portalCandidateWorkspaceCacheKey(sub: string) {
  return `candidate:workspace:user:${sub}`;
}

export const PORTAL_CATALOGUE_TTL_MS = 300_000;
export const PORTAL_USER_SCOPED_TTL_MS = 90_000;
/** Admin overview/analytics — balance freshness vs Strapi load (audit: 60–120s). */
export const PORTAL_ADMIN_PLATFORM_TTL_MS = 90_000;
/** Candidate workspace aggregate (audit: 60–90s). */
export const PORTAL_CANDIDATE_WORKSPACE_TTL_MS = 75_000;

/** Bust FE portal catalogue + per-slug version caches after platform sync. */
export async function invalidateAssessmentCatalogueCache(): Promise<void> {
  const keys = [
    PORTAL_CATALOGUE_CACHE_KEY,
    ...PLATFORM_ASSESSMENT_SLUGS.map((slug) => portalAssessmentVersionCacheKey(slug)),
  ];
  await portalServerCacheDelMany(keys);
}

export async function invalidateClientEntitlementCachesByClientId(
  clientDocumentId: string,
): Promise<void> {
  await portalServerCacheDel(portalClientFeaturesClientCacheKey(clientDocumentId));
}
