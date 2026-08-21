import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import {
  hasAdminPermission,
  type AdminPermission,
} from "@/lib/auth/admin-portal-permissions";
import { BffAuthError } from "@/lib/auth/bff-route-errors";
import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import { createDomainApi } from "@/lib/domain-api";

export type AdminApiAuthSuccess = {
  mode: "firebase";
  session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>;
  firebaseSessionCookie: string;
  domainApi: ReturnType<typeof createDomainApi>;
};

type AdminApiAuthResult = AdminApiAuthSuccess | { error: NextResponse };

/**
 * Admin BFF gate. Firebase session cookie only — no Strapi JWT fallback.
 */
export async function requireAdminApiAccess(
  permission?: AdminPermission,
): Promise<AdminApiAuthResult> {
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

export function isFirebaseAdminApiAuth(
  auth: AdminApiAuthSuccess,
): auth is AdminApiAuthSuccess {
  return auth.mode === "firebase";
}
