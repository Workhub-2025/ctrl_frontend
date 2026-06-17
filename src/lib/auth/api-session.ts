import { getServerSession } from "next-auth/next";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";

export async function getAuthenticatedStrapiJwt(request?: NextRequest | Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { session: null, strapiJwt: null };
  }

  const strapiJwt = await getServerStrapiJwt(request);
  return { session, strapiJwt };
}
