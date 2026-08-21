import "server-only";

import { getServerAuthSub } from "@/lib/portal-server-auth";
import {
  PORTAL_ADMIN_ANALYTICS_CACHE_KEY,
  PORTAL_ADMIN_OVERVIEW_CACHE_KEY,
  PORTAL_ORG_GENERATION_PROBE_TTL_MS,
  portalCandidateWorkspaceCacheKey,
  portalClientDashboardCacheKey,
  portalClientEntitlementsCacheKey,
  portalClientFeaturesClientCacheKey,
  portalClientOverviewCacheKey,
  portalHmOverviewCacheKey,
  portalHmOverviewOrgGenerationKey,
  portalHmReportCacheKey,
  portalOrgGenerationProbeCacheKey,
} from "@/lib/portal-cache-keys";
import {
  portalServerCacheDel,
  portalServerCacheDelMany,
  portalServerCacheGetOrSet,
} from "@/lib/portal-server-cache";
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
  options?: { persistenceGeneration?: string | null },
): Promise<string> {
  const key = portalHmOverviewOrgGenerationKey(organizationId);
  let local = memoryOrgGeneration.get(key) ?? "0";
  if (local === "0" && isUpstashConfigured()) {
    local = (await upstashGet(`portal:${key}`)) ?? "0";
    if (local !== "0") {
      memoryOrgGeneration.set(key, local);
    }
  }
  return maxPortalCacheGeneration(local, options?.persistenceGeneration ?? "0");
}

type PortalGenerationDomainApi = {
  request<ResponseBody>(input: {
    path: `/${string}`;
    firebaseSessionCookie: string;
  }): Promise<ResponseBody>;
};

export async function resolvePortalOrgGeneration(input: {
  organizationId: string;
  loadPersistenceGeneration: () => Promise<string>;
}): Promise<string> {
  const persistenceGeneration = await portalServerCacheGetOrSet(
    portalOrgGenerationProbeCacheKey(input.organizationId),
    PORTAL_ORG_GENERATION_PROBE_TTL_MS,
    input.loadPersistenceGeneration,
  );
  return readHmOverviewOrgGeneration(input.organizationId, {
    persistenceGeneration,
  });
}

export async function resolvePortalOrgGenerationFromDomain(input: {
  organizationId: string;
  domainApi: PortalGenerationDomainApi;
  firebaseSessionCookie: string;
}): Promise<string> {
  return resolvePortalOrgGeneration({
    organizationId: input.organizationId,
    loadPersistenceGeneration: async () => {
      const portalCache = await input.domainApi
        .request<{ generation: string }>({
          path: `/v1/organizations/${encodeURIComponent(input.organizationId)}/portal-cache-generation`,
          firebaseSessionCookie: input.firebaseSessionCookie,
        })
        .catch(() => ({ generation: "0" }));
      return portalCache.generation ?? "0";
    },
  });
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
 * Invalidation entry point for tenant mutations authenticated by Firebase.
 * These routes key caches on the Firebase user ID, so BFF routes also bump the
 * organization generation held by the private persistence service.
 */
export async function invalidateOrganizationScreenCaches(
  organizationId?: string | null,
): Promise<void> {
  if (!organizationId) return;
  await bumpHmOverviewOrgGeneration(organizationId);
}

export async function invalidateHmOverviewServerCache(
  userSub?: string | null,
  organizationId?: string | null,
): Promise<void> {
  if (organizationId) {
    await bumpHmOverviewOrgGeneration(organizationId);
  }
  const sub = userSub ?? (await getServerAuthSub());
  if (!sub) return;
  await portalServerCacheDel(portalHmOverviewCacheKey(sub));
}

export async function invalidateClientPortalServerCache(
  userSub?: string | null,
  organizationId?: string | null,
): Promise<void> {
  if (organizationId) {
    await bumpHmOverviewOrgGeneration(organizationId);
  }
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
 * Firebase-authenticated client portal bust: entitlements/dashboard keys use
 * `firebaseUid`, not NextAuth `sub` (domain userId).
 */
export async function invalidateFirebaseClientPortalCaches(input: {
  firebaseUid: string;
  organizationId?: string | null;
}): Promise<void> {
  if (input.organizationId) {
    await bumpHmOverviewOrgGeneration(input.organizationId);
  }
  if (!input.firebaseUid) return;
  await portalServerCacheDelMany([
    portalClientEntitlementsCacheKey(input.firebaseUid),
    portalClientDashboardCacheKey(input.firebaseUid),
    portalClientOverviewCacheKey(input.firebaseUid),
  ]);
}

async function invalidateClientFeaturesServerCache(clientDocumentId: string): Promise<void> {
  if (!clientDocumentId) return;
  await portalServerCacheDel(portalClientFeaturesClientCacheKey(clientDocumentId));
}

/** Bust HM entitlement flags + client portal read caches after billing or admin entitlement changes. */
export async function invalidateClientEntitlementCaches(input: {
  clientDocumentId: string;
  userSub?: string | null;
  organizationId?: string | null;
}): Promise<void> {
  await invalidateClientFeaturesServerCache(input.clientDocumentId);
  await invalidateClientEntitlementsServerCache(input.userSub);
  await invalidateClientPortalServerCache(input.userSub, input.organizationId);
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

/** Bust candidate workspace aggregate after join or enrolment changes. */
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
