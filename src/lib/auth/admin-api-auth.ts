import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import {
  hasAdminPermission,
  type AdminPermission,
} from "@/lib/auth/admin-portal-permissions";
import { isFirebaseAuthProvider } from "@/lib/auth/auth-provider";
import { BffAuthError } from "@/lib/auth/bff-route-errors";
import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import { authOptions } from "@/lib/auth/next-auth-options";
import { isElevatedAdminPortalRole } from "@/lib/auth/role-model";
import { createFirebaseDomainApi } from "@/lib/firebase-domain-api";
import { getServerCmsJwt } from "@/legacy-cms/jwt";

type FirebaseAdminApiAuthSuccess = {
  mode: "firebase";
  session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>;
  cmsJwt: null;
  firebaseSessionCookie: string;
  domainApi: ReturnType<typeof createFirebaseDomainApi>;
};

type LegacyAdminApiAuthSuccess = {
  mode: "legacy";
  session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>;
  cmsJwt: string;
};

export type AdminApiAuthSuccess =
  | FirebaseAdminApiAuthSuccess
  | LegacyAdminApiAuthSuccess;

type AdminApiAuthResult = AdminApiAuthSuccess | { error: NextResponse };

/**
 * Admin BFF gate. On NEXT_PUBLIC_AUTH_PROVIDER=firebase, verifies the Firebase
 * session cookie and never requires a legacy CMS JWT (no Preview 503).
 * Production dual-path still accepts a legacy CMS JWT when Firebase is off.
 */
export async function requireAdminApiAccess(
  permission?: AdminPermission,
): Promise<AdminApiAuthResult> {
  if (isFirebaseAuthProvider()) {
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
        cmsJwt: null,
        firebaseSessionCookie: firebase.firebaseSessionCookie,
        domainApi: firebase.domainApi,
      };
    } catch (error) {
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
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
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
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }

  return { mode: "legacy", session, cmsJwt };
}

export function isFirebaseAdminApiAuth(
  auth: AdminApiAuthSuccess,
): auth is FirebaseAdminApiAuthSuccess {
  return auth.mode === "firebase";
}

/** Legacy CMS JWT for dual-path callers; 501 on Firebase Preview until ported. */
export function requireLegacyCmsJwt(
  auth: AdminApiAuthSuccess,
): string | NextResponse {
  if (auth.mode === "legacy") {
    return auth.cmsJwt;
  }
  return NextResponse.json(
    {
      error:
        "This admin operation is not available on the Firebase Preview path yet.",
    },
    { status: 501 },
  );
}
