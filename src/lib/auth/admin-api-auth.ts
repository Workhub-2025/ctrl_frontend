import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import {
  hasAdminPermission,
  type AdminPermission,
} from "@/lib/auth/admin-portal-permissions";
import { isAdminPortalRole } from "@/lib/auth/role-model";

type AdminApiAuthSuccess = {
  session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>;
  strapiJwt: string;
};

type AdminApiAuthResult =
  | AdminApiAuthSuccess
  | { error: NextResponse };

export async function requireAdminApiAccess(
  permission?: AdminPermission,
): Promise<AdminApiAuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }

  if (!isAdminPortalRole(session.user.role)) {
    return {
      error: NextResponse.json(
        { error: "Administrator access required" },
        { status: 403 },
      ),
    };
  }

  if (permission && !hasAdminPermission(session.user.role, permission)) {
    return {
      error: NextResponse.json(
        { error: "Insufficient admin permissions" },
        { status: 403 },
      ),
    };
  }

  const strapiJwt = await getServerStrapiJwt();
  if (!strapiJwt) {
    return {
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }

  return { session, strapiJwt };
}
