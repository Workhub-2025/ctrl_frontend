import "server-only";

import { getServerAuthSub } from "@/lib/portal-server-auth";
import {
  PORTAL_ADMIN_ANALYTICS_CACHE_KEY,
  PORTAL_ADMIN_OVERVIEW_CACHE_KEY,
  portalCandidateWorkspaceCacheKey,
  portalClientDashboardCacheKey,
  portalClientEntitlementsCacheKey,
  portalClientFeaturesClientCacheKey,
  portalClientOverviewCacheKey,
  portalClientTenantCacheKey,
  portalHmOverviewCacheKey,
  portalHmReportCacheKey,
} from "@/lib/portal-cache-keys";
import { portalServerCacheDel, portalServerCacheDelMany } from "@/lib/portal-server-cache";

export async function invalidateHmOverviewServerCache(userSub?: string | null): Promise<void> {
  const sub = userSub ?? (await getServerAuthSub());
  if (!sub) return;
  await portalServerCacheDel(portalHmOverviewCacheKey(sub));
}

export async function invalidateClientPortalServerCache(userSub?: string | null): Promise<void> {
  const sub = userSub ?? (await getServerAuthSub());
  if (!sub) return;
  await portalServerCacheDelMany([
    portalClientDashboardCacheKey(sub),
    portalClientOverviewCacheKey(sub),
    portalClientEntitlementsCacheKey(sub),
  ]);
}

export async function invalidateClientEntitlementsServerCache(userSub?: string | null): Promise<void> {
  const sub = userSub ?? (await getServerAuthSub());
  if (!sub) return;
  await portalServerCacheDel(portalClientEntitlementsCacheKey(sub));
}

export async function invalidateClientFeaturesServerCache(clientDocumentId: string): Promise<void> {
  if (!clientDocumentId) return;
  await portalServerCacheDel(portalClientFeaturesClientCacheKey(clientDocumentId));
}

export async function invalidateClientTenantServerCache(userSub?: string | null): Promise<void> {
  const sub = userSub ?? (await getServerAuthSub());
  if (!sub) return;
  await portalServerCacheDel(portalClientTenantCacheKey(sub));
}

/** Bust HM entitlement flags + client portal read caches after billing or admin entitlement changes. */
export async function invalidateClientEntitlementCaches(input: {
  clientDocumentId: string;
  userSub?: string | null;
}): Promise<void> {
  await invalidateClientFeaturesServerCache(input.clientDocumentId);
  await invalidateClientEntitlementsServerCache(input.userSub);
  await invalidateClientPortalServerCache(input.userSub);
}

/** Bust admin overview + revenue analytics after client or billing mutations. */
export async function invalidateAdminPlatformServerCache(): Promise<void> {
  await portalServerCacheDelMany([
    PORTAL_ADMIN_OVERVIEW_CACHE_KEY,
    PORTAL_ADMIN_ANALYTICS_CACHE_KEY,
  ]);
}

/** Bust HM candidate report cache after decision or share mutations. */
export async function invalidateHmReportServerCache(
  userSub?: string | null,
  candidateSessionId?: string | null,
): Promise<void> {
  const sub = userSub ?? (await getServerAuthSub());
  if (!sub || !candidateSessionId) return;
  await portalServerCacheDel(portalHmReportCacheKey(sub, candidateSessionId));
}

/** Bust candidate workspace aggregate after join or enrollment changes. */
export async function invalidateCandidateWorkspaceServerCache(
  userSub?: string | null,
): Promise<void> {
  const sub = userSub ?? (await getServerAuthSub());
  if (!sub) return;
  await portalServerCacheDel(portalCandidateWorkspaceCacheKey(sub));
}
