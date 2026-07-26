import { NextResponse } from "next/server";

import { requireFirebaseProvisioningSession } from "@/lib/auth/firebase-bff-session";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimited = await rejectRateLimitedMutation(request, {
    scope: "firebase-bootstrap-status",
    limit: 30,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  try {
    const auth = await requireFirebaseProvisioningSession();
    const status = await auth.domainApi.getAdministratorBootstrapStatus(
      auth.firebaseSessionCookie,
    );
    return NextResponse.json(
      { data: status },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return handleBffRouteError(error, "Bootstrap status could not be loaded");
  }
}

