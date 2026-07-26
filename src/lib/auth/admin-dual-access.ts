import "server-only";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import {
  hasAdminPermission,
  type AdminPermission,
} from "@/lib/auth/admin-portal-permissions";
import { BffAuthError } from "@/lib/auth/bff-route-errors";
import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import { authOptions } from "@/lib/auth/next-auth-options";
import { isElevatedAdminPortalRole } from "@/lib/auth/role-model";
import { getServerCmsJwt } from "@/legacy-cms/jwt";
import { createFirebaseDomainApi } from "@/lib/firebase-domain-api";

type FirebaseAdminAuth = {
  mode: "firebase";
  session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>;
  firebaseSessionCookie: string;
  domainApi: ReturnType<typeof createFirebaseDomainApi>;
};

type StrapiAdminAuth = {
  mode: "strapi";
  session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>;
  cmsJwt: string;
};

export type AdminDualAuthResult =
  | FirebaseAdminAuth
  | StrapiAdminAuth
  | { error: NextResponse };

/**
 * Prefer a Firebase admin session for migrated routes. Fall back to the legacy
 * Strapi JWT path for unported deployments. Never returns the Preview 503
 * message for Firebase-capable handlers that call this helper.
 */
export async function requireAdminDualAccess(
  permission?: AdminPermission,
): Promise<AdminDualAuthResult> {
  try {
    const firebase = await requireFirebaseSession("admin");
    if (
      permission &&
      !hasAdminPermission(firebase.session.user.role, permission)
    ) {
      return {
        error: NextResponse.json(
          { error: "Insufficient admin permissions" },
          { status: 403 },
        ),
      };
    }
    return {
      mode: "firebase",
      session: firebase.session,
      firebaseSessionCookie: firebase.firebaseSessionCookie,
      domainApi: firebase.domainApi,
    };
  } catch (error) {
    if (!(error instanceof BffAuthError) || error.status !== 401) {
      if (error instanceof BffAuthError) {
        return {
          error: NextResponse.json(
            { error: error.message },
            { status: error.status },
          ),
        };
      }
      throw error;
    }
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    };
  }
  if (!isElevatedAdminPortalRole(session.user.role)) {
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

  const cmsJwt = await getServerCmsJwt();
  if (!cmsJwt) {
    return {
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    };
  }

  return { mode: "strapi", session, cmsJwt };
}

export function isFirebaseAdminAuth(
  auth: Exclude<AdminDualAuthResult, { error: NextResponse }>,
): auth is FirebaseAdminAuth {
  return auth.mode === "firebase";
}
