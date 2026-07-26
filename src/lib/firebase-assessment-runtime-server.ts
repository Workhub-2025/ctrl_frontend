import "server-only";

import type { NextRequest } from "next/server";

import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";

/**
 * Named Firebase adapter for the existing assessment BFF contract. Browser
 * routes keep their current LaunchEnvelope DTO while this adapter forwards to
 * the IAM-protected Firebase domain API.
 */
export async function forwardFirebaseAssessmentRuntime(
  _request: NextRequest,
  path: `/${string}`,
  init: Readonly<{ method?: string; body?: string }> = {},
) {
  const auth = await requireFirebaseSession("candidate");
  const parsedBody =
    init.body === undefined ? undefined : (JSON.parse(init.body) as unknown);
  const data = await auth.domainApi.request<unknown>({
    path: `/v1${path}`,
    firebaseSessionCookie: auth.firebaseSessionCookie,
    method:
      init.method === "POST" ||
      init.method === "PATCH" ||
      init.method === "PUT" ||
      init.method === "DELETE"
        ? init.method
        : "GET",
    ...(parsedBody === undefined ? {} : { body: parsedBody }),
  });
  return {
    status: 200,
    body: { data },
    firebaseUid: auth.firebaseUid,
  };
}
