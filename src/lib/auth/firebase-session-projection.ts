import "server-only";

import type { NextResponse } from "next/server";

import {
  attachSessionCookie,
  encodeSessionToken,
} from "@/lib/auth/session-config";
import type { FirebaseDomainUserContext } from "@/lib/firebase-domain-api";
import { splitDisplayName } from "@/lib/portal-user-label";

export async function attachFirebaseSessionProjection(
  response: NextResponse,
  userContext: FirebaseDomainUserContext,
): Promise<void> {
  const { firstName, lastName } = splitDisplayName(userContext.displayName);
  const token = await encodeSessionToken({
    id: userContext.userId,
    email: userContext.email,
    role: userContext.portalRole,
    authProvider: "firebase",
    firebaseUid: userContext.firebaseUid,
    organization: userContext.organizationId,
    firstName,
    lastName,
  });
  attachSessionCookie(response, token);
}
