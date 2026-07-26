import "server-only";

import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth/next-auth-options";
import { BffAuthError } from "@/lib/auth/bff-route-errors";
import { createFirebaseDomainApi } from "@/lib/firebase-domain-api";
import { getFirebaseSessionCookie } from "@/lib/firebase-session-server";
import {
  isElevatedAdminPortalRole,
  resolveAppRole,
  type AppRole,
  type AdminPortalRoleType,
} from "@/lib/auth/role-model";

/**
 * Authentication helper for newly ported Firebase routes. Unlike the legacy
 * BFF helpers, it never reads or requires a Strapi JWT. The domain Function
 * remains authoritative and re-verifies this opaque Firebase session.
 */
export async function requireFirebaseSession(
  ...roles: (AppRole | AdminPortalRoleType)[]
) {
  const [session, firebaseSessionCookie] = await Promise.all([
    getServerSession(authOptions),
    getFirebaseSessionCookie(),
  ]);

  if (
    !session?.user?.id ||
    session.user.authProvider !== "firebase" ||
    !firebaseSessionCookie
  ) {
    throw new BffAuthError("Authentication required", 401);
  }

  const role = resolveAppRole(session.user.role);
  if (!role) {
    throw new BffAuthError("Authentication required", 401);
  }
  if (
    roles.length > 0 &&
    !(roles.includes("admin") && isElevatedAdminPortalRole(session.user.role)) &&
    !roles.includes(role)
  ) {
    throw new BffAuthError(`${roles.join(" or ")} access required`, 403);
  }

  return {
    session,
    firebaseSessionCookie,
    domainApi: createFirebaseDomainApi(),
    firebaseUid: session.user.firebaseUid ?? session.user.id,
  };
}

/**
 * Provisioning endpoints intentionally work before an application user or
 * NextAuth projection exists. The private Function verifies the Firebase
 * session, email verification, invitation/bootstrap scope and second factor.
 */
export async function requireFirebaseProvisioningSession() {
  const firebaseSessionCookie = await getFirebaseSessionCookie();
  if (!firebaseSessionCookie) {
    throw new BffAuthError("Authentication required", 401);
  }
  return {
    firebaseSessionCookie,
    domainApi: createFirebaseDomainApi(),
  };
}
