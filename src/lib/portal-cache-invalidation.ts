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
  portalHmOverviewCacheKey,
  portalHmOverviewOrgGenerationKey,
  portalHmReportCacheKey,
} from "@/lib/portal-cache-keys";
import { portalServerCacheDel, portalServerCacheDelMany } from "@/lib/portal-server-cache";
import {
  isUpstashConfigured,
  upstashGet,
  upstashSet,
} from "@/lib/security/upstash-rest";

const memoryOrgGeneration = new Map<string, string>();

function maxPortalCacheGeneration(left: string, right: string): string {
  const leftN = Number(left);
  const rightN = Number(right);
  if (Number.isFinite(leftN) && Number.isFinite(rightN)) {
    return leftN >= rightN ? left : right;
  }
  return left >= right ? left : right;
}

export async function readHmOverviewOrgGeneration(
  organizationId: string,
  options?: { firestoreGeneration?: string | null },
): Promise<string> {
  const key = portalHmOverviewOrgGenerationKey(organizationId);
  let local = "0";
  if (isUpstashConfigured()) {
    local = (await upstashGet(`portal:${key}`)) ?? "0";
  } else {
    local = memoryOrgGeneration.get(key) ?? "0";
  }
  return maxPortalCacheGeneration(local, options?.firestoreGeneration ?? "0");
}

/**
 * Bust every screen-aggregate cache for the org by rotating the generation
 * suffix. One generation covers both the HM overview and the client dashboard
 * because a campaign, session, seat or candidate change can move counts on
 * either screen.
 */
export async function bumpHmOverviewOrgGeneration(
  organizationId: string,
): Promise<void> {
  if (!organizationId) return;
  const key = portalHmOverviewOrgGenerationKey(organizationId);
  const next = String(Date.now());
  memoryOrgGeneration.set(key, next);
  if (isUpstashConfigured()) {
    await upstashSet(`portal:${key}`, next, 86_400_000);
  }
}

/**
 * Firebase-path invalidation entry point for tenant mutations. The legacy
 * Strapi path keys caches on the NextAuth `sub`, which does not exist on a
 * Firebase session, so BFF routes bump the org generation instead.
 */
export async function invalidateOrganizationScreenCaches(
  organizationId?: string | null,
): Promise<void> {
  if (!organizationId) return;
  await bumpHmOverviewOrgGeneration(organizationId);
}

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

/**
 * Firebase-path client portal bust: entitlements/dashboard keys use
 * `firebaseUid`, not NextAuth `sub` (domain userId).
 */
export async function invalidateFirebaseClientPortalCaches(input: {
  firebaseUid: string;
  organizationId?: string | null;
}): Promise<void> {
  if (!input.firebaseUid) return;
  await portalServerCacheDelMany([
    portalClientEntitlementsCacheKey(input.firebaseUid),
    portalClientDashboardCacheKey(input.firebaseUid),
    portalClientOverviewCacheKey(input.firebaseUid),
  ]);
  if (input.organizationId) {
    await bumpHmOverviewOrgGeneration(input.organizationId);
  }
}

async function invalidateClientFeaturesServerCache(clientDocumentId: string): Promise<void> {
  if (!clientDocumentId) return;
  await portalServerCacheDel(portalClientFeaturesClientCacheKey(clientDocumentId));
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

/** After assessment submit: candidate workspace + HM overview for the org. */
export async function invalidateAfterAssessmentSubmit(input: {
  candidateFirebaseUid: string;
  organizationId: string;
  assignmentId?: string | null;
  hmFirebaseUid?: string | null;
}): Promise<void> {
  await invalidateCandidateWorkspaceServerCache(input.candidateFirebaseUid);
  await bumpHmOverviewOrgGeneration(input.organizationId);
  if (input.hmFirebaseUid && input.assignmentId) {
    await invalidateHmReportServerCache(input.hmFirebaseUid, input.assignmentId);
  }
}
