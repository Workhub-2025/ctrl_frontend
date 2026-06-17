import "server-only";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { resolveAppRole, type AppRole } from "@/lib/auth/role-model";
import { BffAuthError } from "@/lib/auth/bff-route-errors";

export { BffAuthError } from "@/lib/auth/bff-route-errors";
export { handleBffRouteError } from "@/lib/auth/bff-route-errors";

export async function requireAuthenticatedSession() {
  const session = await getServerSession(authOptions);
  const strapiJwt = await getServerStrapiJwt();

  if (!session?.user?.id || !strapiJwt) {
    throw new BffAuthError("Authentication required", 401);
  }

  return { session, strapiJwt };
}

export async function requireRoleSession(...roles: AppRole[]) {
  const context = await requireAuthenticatedSession();
  const role = resolveAppRole(context.session.user.role);

  if (!role) {
    throw new BffAuthError("Authentication required", 401);
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
