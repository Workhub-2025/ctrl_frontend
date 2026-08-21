import "server-only";

import type { FirebaseDomainUserContext } from "@/lib/firebase-domain-api";
import { portalServerCacheGetOrSet } from "@/lib/portal-server-cache";

/** Short-lived BFF copy of /v1/me. Mutations still go through domainApi. */
export const PORTAL_USER_CONTEXT_TTL_MS = 20_000;

export function portalUserContextCacheKey(firebaseUid: string) {
  return `user-context:uid:${firebaseUid}`;
}

export async function getCachedDomainUserContext(input: {
  firebaseUid: string;
  load: () => Promise<FirebaseDomainUserContext>;
}): Promise<FirebaseDomainUserContext> {
  return portalServerCacheGetOrSet(
    portalUserContextCacheKey(input.firebaseUid),
    PORTAL_USER_CONTEXT_TTL_MS,
    input.load,
  );
}
