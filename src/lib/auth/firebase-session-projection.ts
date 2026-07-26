import "server-only";

import type { NextResponse } from "next/server";

import {
  attachSessionCookie,
  encodeSessionToken,
} from "@/lib/auth/session-config";
import { mapPlatformRolesToAdminPortalRole } from "@/lib/auth/admin-portal-permissions";
import type { FirebaseDomainUserContext } from "@/lib/firebase-domain-api";
import { splitDisplayName } from "@/lib/portal-user-label";

/**
 * Project the NextAuth session role from domain user context.
 * Firebase collapses all platform admins to portalRole "admin"; map the
 * underlying platformRoles onto the scoped admin portal matrix so nav/BFF
 * checks match domainApi permission boundaries.
 */
export function resolveFirebaseSessionRole(
  userContext: Pick<
    FirebaseDomainUserContext,
    "portalRole" | "platformRoles"
  >,
): string {
  if (userContext.portalRole !== "admin") {
    return userContext.portalRole;
  }
  if (userContext.platformRoles && userContext.platformRoles.length > 0) {
    return mapPlatformRolesToAdminPortalRole(userContext.platformRoles);
  }
  // Fail-closed: portalRole=admin without trusted platformRoles must not
  // inherit the super-admin BFF matrix.
  return "admin_restricted";
}

export async function attachFirebaseSessionProjection(
  response: NextResponse,
  userContext: FirebaseDomainUserContext,
  options: { secondFactorSatisfied: boolean } = {
    secondFactorSatisfied: userContext.secondFactorSatisfied === true,
  },
): Promise<void> {
  const { firstName, lastName } = splitDisplayName(userContext.displayName);
  const token = await encodeSessionToken({
    id: userContext.userId,
    email: userContext.email,
    role: resolveFirebaseSessionRole(userContext),
    authProvider: "firebase",
    firebaseUid: userContext.firebaseUid,
    organization: userContext.organizationId,
    firstName,
    lastName,
    totpEnabled: options.secondFactorSatisfied,
  });
  attachSessionCookie(response, token);
}
