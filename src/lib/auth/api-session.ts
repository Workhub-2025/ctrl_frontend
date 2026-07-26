import { getServerSession } from "next-auth/next";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerCmsJwt } from "@/legacy-cms/jwt";

/**
 * Legacy dual-path helper for Strapi JWT retrieval. Firebase sessions have no
 * Strapi JWT — callers must branch on `session.user.authProvider`.
 */
export async function getAuthenticatedStrapiJwt(request?: NextRequest | Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { session: null, cmsJwt: null };
  }

  if (session.user.authProvider === "firebase") {
    return { session, cmsJwt: null };
  }

  const cmsJwt = await getServerCmsJwt(request);
  return { session, cmsJwt };
}
