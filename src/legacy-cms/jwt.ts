import "server-only";

import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

/**
 * Resolves the legacy CMS JWT stored on the NextAuth token (`token.jwt`).
 * Firebase sessions never populate this field.
 */
export async function getServerCmsJwt(
  request?: NextRequest | Request,
): Promise<string | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return null;
  }

  const token = request
    ? await getToken({ req: request as NextRequest, secret })
    : await getToken({
        req: {
          cookies: Object.fromEntries(
            (await cookies()).getAll().map((cookie) => [cookie.name, cookie.value]),
          ),
        } as unknown as NextRequest,
        secret,
      });

  return typeof token?.jwt === "string" && token.jwt.length > 0 ? token.jwt : null;
}

/** @deprecated Use getServerCmsJwt */
export const getServerStrapiJwt = getServerCmsJwt;
