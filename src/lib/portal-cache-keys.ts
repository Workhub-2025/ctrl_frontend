import "server-only";

import { PLATFORM_ASSESSMENT_SLUGS } from "@/lib/assessment-slug";
import { portalServerCacheDel, portalServerCacheDelMany } from "@/lib/portal-server-cache";

/** Global active catalogue rows — entitlement filter applied after read. */
export const PORTAL_CATALOGUE_CACHE_KEY = "catalogue:assessments:active:v1";

export function portalAssessmentVersionCacheKey(slug: string) {
  return `catalogue:assessment-versions:${slug}`;
}

export function portalClientFeaturesCacheKey(sub: string) {
  return `client-features:user:${sub}`;
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

export const PORTAL_CATALOGUE_TTL_MS = 300_000;
export const PORTAL_USER_SCOPED_TTL_MS = 90_000;

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
