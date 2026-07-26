import "server-only";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerCmsJwt } from "@/legacy-cms/jwt";
import { resolveAppRole, isElevatedAdminPortalRole, type AppRole, type AdminPortalRoleType } from "@/lib/auth/role-model";
import { BffAuthError } from "@/lib/auth/bff-route-errors";

export { BffAuthError } from "@/lib/auth/bff-route-errors";
export { handleBffRouteError } from "@/lib/auth/bff-route-errors";

/**
 * Legacy Strapi BFF session helper. Firebase Preview routes must use
 * `requireFirebaseSession` instead — this path still requires a Strapi JWT.
 */
export async function requireAuthenticatedSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new BffAuthError("Authentication required", 401);
  }

  if (session.user.authProvider === "firebase") {
    throw new BffAuthError(
      "This operation still requires the legacy Strapi API and is not available on the Firebase Preview path yet.",
      503,
    );
  }

  const cmsJwt = await getServerCmsJwt();
  if (!cmsJwt) {
    throw new BffAuthError("Authentication required", 401);
  }

  return { session, cmsJwt };
}

export async function requireRoleSession(...roles: (AppRole | AdminPortalRoleType)[]) {
  const context = await requireAuthenticatedSession();
  const role = resolveAppRole(context.session.user.role);

  if (!role) {
    throw new BffAuthError("Authentication required", 401);
  }

  if (roles.includes("admin") && isElevatedAdminPortalRole(context.session.user.role)) {
    return context;
  }

  if (!roles.includes(role)) {
    throw new BffAuthError(`${roles.join(" or ")} access required`, 403);
  }

  return context;
}

export async function requireHmSession() {
  return requireRoleSession("hiring_manager");
}

export async function requireClientSession() {
  return requireRoleSession("client");
}

export async function requireCandidateSession() {
  return requireRoleSession("candidate");
}
