import "server-only";

import { getServerAuthSub } from "@/lib/portal-server-auth";
import {
  portalClientDashboardCacheKey,
  portalClientEntitlementsCacheKey,
  portalClientFeaturesClientCacheKey,
  portalClientOverviewCacheKey,
  portalClientTenantCacheKey,
  portalHmOverviewCacheKey,
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
