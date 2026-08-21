import "server-only";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import {
  hasAdminPermission,
  type AdminPermission,
} from "@/lib/auth/admin-portal-permissions";
import { BffAuthError } from "@/lib/auth/bff-route-errors";
import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import { createDomainApi } from "@/lib/domain-api";

export type FirebaseAdminAuth = {
  mode: "firebase";
  session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>;
  firebaseSessionCookie: string;
  domainApi: ReturnType<typeof createDomainApi>;
};

export type AdminDualAuthResult = FirebaseAdminAuth | { error: NextResponse };

/**
 * Admin BFF gate. Firebase session cookie only.
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

export function isFirebaseAdminAuth(
  auth: Exclude<AdminDualAuthResult, { error: NextResponse }>,
): auth is FirebaseAdminAuth {
  return auth.mode === "firebase";
}
